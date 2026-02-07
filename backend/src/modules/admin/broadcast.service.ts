import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  LessThan,
  QueryRunner,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { randomUUID } from 'node:crypto';
import { User, UserRole } from '../users/entities/user.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { BotService } from '../bot/bot.service';
import { BotSubscriber } from '../bot/entities/bot-subscriber.entity';
import {
  BroadcastDelivery,
  BroadcastDeliveryStatus,
} from './entities/broadcast-delivery.entity';
import {
  BroadcastKind,
  BroadcastRun,
  BroadcastRunStatus,
  BroadcastTarget,
} from './entities/broadcast-run.entity';
import { BroadcastDeliveryFilter } from './dto/list-broadcast-deliveries.dto';

type QueueBroadcastParams = {
  message: string;
  kind?: BroadcastKind;
  target?: BroadcastTarget;
  targetRole?: UserRole;
  targetUserIds?: number[];
  requestedByUserId?: number;
  limit?: number;
};

type RepostRunParams = {
  runId: number;
  requestedByUserId?: number;
};

type ListRunDeliveriesParams = {
  runId: number;
  page: number;
  limit: number;
  filter?: BroadcastDeliveryFilter;
};

type ListBroadcastUsersParams = {
  page: number;
  limit: number;
  search?: string;
  role?: UserRole;
};

const TERMINAL_RUN_STATUSES = [
  BroadcastRunStatus.COMPLETED,
  BroadcastRunStatus.COMPLETED_WITH_ERRORS,
  BroadcastRunStatus.CANCELLED,
] as const;

@Injectable()
export class BroadcastService {
  private readonly logger = new Logger(BroadcastService.name);
  private readonly nodeToken = `${process.pid}-${randomUUID().slice(0, 8)}`;
  private tickInFlight = false;

  private readonly runLeaseMs = 60_000;
  private readonly deliveryLeaseMs = 60_000;
  private readonly staleProcessingGraceMs = 5 * 60 * 1000;
  private readonly maxBatchesPerTick = 5;
  private readonly chunkInsertSize = 500;

  private readonly batchSize: number;
  private readonly concurrency: number;
  private readonly maxAttempts: number;
  private readonly retentionDays: number;
  private readonly vipMinOrders = 5;

  constructor(
    private readonly dataSource: DataSource,
    private readonly botService: BotService,
    private readonly configService: ConfigService,
    @InjectRepository(BroadcastRun)
    private readonly runRepo: Repository<BroadcastRun>,
    @InjectRepository(BroadcastDelivery)
    private readonly deliveryRepo: Repository<BroadcastDelivery>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    this.batchSize = this.normalizeNumber(
      this.configService.get<number>('BROADCAST_BATCH_SIZE'),
      50,
      10,
      200,
    );
    this.concurrency = this.normalizeNumber(
      this.configService.get<number>('BROADCAST_CONCURRENCY'),
      4,
      1,
      10,
    );
    this.maxAttempts = this.normalizeNumber(
      this.configService.get<number>('BROADCAST_MAX_ATTEMPTS'),
      5,
      1,
      10,
    );
    this.retentionDays = this.normalizeNumber(
      this.configService.get<number>('BROADCAST_RETENTION_DAYS'),
      30,
      1,
      365,
    );
  }

  async queueBroadcast(params: QueueBroadcastParams) {
    const message = String(params.message ?? '').trim();
    if (!message) {
      throw new BadRequestException('Broadcast message is required');
    }
    if (message.length > 4000) {
      throw new BadRequestException('Broadcast message exceeds 4000 characters');
    }

    const kind = params.kind ?? BroadcastKind.ANNOUNCEMENT;
    const target = params.target ?? BroadcastTarget.ALL;
    const targetRole = params.targetRole ?? null;
    const normalizedTargetUserIds = this.normalizeTargetUserIds(
      params.targetUserIds,
    );

    if (target === BroadcastTarget.ROLE && !targetRole) {
      throw new BadRequestException(
        'Role is required for role-based broadcasts',
      );
    }

    if (target === BroadcastTarget.USERS && normalizedTargetUserIds.length === 0) {
      throw new BadRequestException(
        'At least one user is required for user-targeted broadcasts',
      );
    }

    const requestedByUserId = params.requestedByUserId ?? null;
    const safeLimit =
      typeof params.limit === 'number' && Number.isFinite(params.limit) && params.limit > 0
        ? Math.min(Math.floor(params.limit), 50_000)
        : undefined;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const run = queryRunner.manager.create(BroadcastRun, {
        message,
        kind,
        target,
        targetRole,
        targetUserIds:
          normalizedTargetUserIds.length > 0 ? normalizedTargetUserIds : null,
        requestedByUserId,
        status: BroadcastRunStatus.QUEUED,
        totalRecipients: 0,
        pendingCount: 0,
        sentCount: 0,
        failedCount: 0,
        unknownCount: 0,
      });
      const savedRun = await queryRunner.manager.save(BroadcastRun, run);

      const recipients = await this.getRecipients({
        target,
        targetRole,
        targetUserIds: normalizedTargetUserIds,
        limit: safeLimit,
        queryRunner,
      });
      const uniqueRecipients = new Map<string, { userId: number | null; telegramId: string }>();
      for (const recipient of recipients) {
        const telegramId = String(recipient.telegramId ?? '').trim();
        if (!telegramId) continue;
        if (!uniqueRecipients.has(telegramId)) {
          uniqueRecipients.set(telegramId, {
            userId: recipient.userId,
            telegramId,
          });
        }
      }

      const deliveryRows = Array.from(uniqueRecipients.values()).map((recipient) => ({
        runId: savedRun.id,
        userId: recipient.userId,
        telegramId: recipient.telegramId,
        status: BroadcastDeliveryStatus.PENDING,
        attemptCount: 0,
        nextAttemptAt: null,
        lastAttemptAt: null,
        sentAt: null,
        telegramMessageId: null,
        lastError: null,
        lockToken: null,
        lockExpiresAt: null,
      }));

      if (deliveryRows.length > 0) {
        for (let index = 0; index < deliveryRows.length; index += this.chunkInsertSize) {
          const chunk = deliveryRows.slice(index, index + this.chunkInsertSize);
          await queryRunner.manager
            .createQueryBuilder()
            .insert()
            .into(BroadcastDelivery)
            .values(chunk)
            .execute();
        }
      }

      savedRun.totalRecipients = deliveryRows.length;
      savedRun.pendingCount = deliveryRows.length;
      if (deliveryRows.length === 0) {
        savedRun.status = BroadcastRunStatus.COMPLETED;
        savedRun.startedAt = new Date();
        savedRun.finishedAt = new Date();
      }
      await queryRunner.manager.save(BroadcastRun, savedRun);
      await queryRunner.commitTransaction();

      if (deliveryRows.length > 0) {
        void this.processQueueTick();
      }

      return savedRun;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async listRuns(page: number, limit: number) {
    const [data, total] = await this.runRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async getRun(id: number) {
    const run = await this.runRepo.findOne({ where: { id } });
    if (!run) {
      throw new NotFoundException('Broadcast run not found');
    }

    const deliverySummary = await this.getDeliveryStatusSummary(id);
    return { ...run, deliverySummary };
  }

  async listRunDeliveries(params: ListRunDeliveriesParams) {
    const run = await this.runRepo.findOne({ where: { id: params.runId } });
    if (!run) {
      throw new NotFoundException('Broadcast run not found');
    }

    const baseQb = this.buildRunDeliveriesQuery(params.runId);
    this.applyDeliveryFilter(baseQb, params.filter ?? BroadcastDeliveryFilter.ALL);

    const total = await baseQb.clone().getCount();
    const rows = await baseQb
      .orderBy('delivery.id', 'DESC')
      .skip((params.page - 1) * params.limit)
      .take(params.limit)
      .getRawMany<{
        deliveryId: number;
        status: BroadcastDeliveryStatus;
        attemptCount: number;
        telegramId: string;
        telegramMessageId: string | null;
        sentAt: Date | null;
        lastAttemptAt: Date | null;
        nextAttemptAt: Date | null;
        lastError: string | null;
        userId: number | null;
        userFirstName: string | null;
        userUsername: string | null;
        userRole: UserRole | null;
        subscriberFirstName: string | null;
        subscriberUsername: string | null;
      }>();

    return {
      data: rows.map((row) => ({
        id: Number(row.deliveryId),
        status: row.status,
        attemptCount: Number(row.attemptCount ?? 0),
        telegramId: String(row.telegramId ?? ''),
        telegramMessageId: row.telegramMessageId
          ? String(row.telegramMessageId)
          : null,
        sentAt: row.sentAt,
        lastAttemptAt: row.lastAttemptAt,
        nextAttemptAt: row.nextAttemptAt,
        lastError: row.lastError,
        recipient: {
          userId:
            row.userId !== null && row.userId !== undefined
              ? Number(row.userId)
              : null,
          firstName: row.userFirstName ?? row.subscriberFirstName ?? null,
          username: row.userUsername ?? row.subscriberUsername ?? null,
          role: row.userRole ?? null,
          sourceUser: row.userId !== null && row.userId !== undefined,
        },
      })),
      total,
    };
  }

  async listBroadcastUsers(params: ListBroadcastUsersParams) {
    const qb = this.userRepo
      .createQueryBuilder('user')
      .where('user.telegramId IS NOT NULL')
      .andWhere("TRIM(COALESCE(user.telegramId, '')) != ''");

    if (params.role) {
      qb.andWhere('user.role = :role', { role: params.role });
    }

    const searchValue = String(params.search ?? '').trim().toLowerCase();
    if (searchValue) {
      qb.andWhere(
        `(
          LOWER(COALESCE(user.firstName, '')) LIKE :search
          OR LOWER(COALESCE(user.username, '')) LIKE :search
          OR LOWER(COALESCE(user.loginUsername, '')) LIKE :search
          OR user.telegramId LIKE :search
        )`,
        { search: `%${searchValue}%` },
      );
    }

    const [data, total] = await qb
      .orderBy('user.createdAt', 'DESC')
      .skip((params.page - 1) * params.limit)
      .take(params.limit)
      .getManyAndCount();

    return { data, total };
  }

  async repostRun(params: RepostRunParams) {
    const run = await this.runRepo.findOne({ where: { id: params.runId } });
    if (!run) {
      throw new NotFoundException('Broadcast run not found');
    }

    return this.queueBroadcast({
      message: run.message,
      kind: run.kind,
      target: run.target,
      targetRole: run.targetRole ?? undefined,
      targetUserIds: run.targetUserIds ?? undefined,
      requestedByUserId: params.requestedByUserId,
    });
  }

  async deleteRun(id: number) {
    const run = await this.runRepo.findOne({ where: { id } });
    if (!run) {
      throw new NotFoundException('Broadcast run not found');
    }

    if (
      run.status === BroadcastRunStatus.QUEUED ||
      run.status === BroadcastRunStatus.RUNNING
    ) {
      throw new BadRequestException(
        'Cannot delete an active broadcast. Cancel it first.',
      );
    }

    await this.runRepo.delete({ id });
    return { id, deleted: true };
  }

  async cancelRun(id: number) {
    const run = await this.runRepo.findOne({ where: { id } });
    if (!run) {
      throw new NotFoundException('Broadcast run not found');
    }
    if (
      (TERMINAL_RUN_STATUSES as readonly BroadcastRunStatus[]).includes(
        run.status,
      )
    ) {
      return run;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const now = new Date();
      await queryRunner.manager.update(
        BroadcastDelivery,
        {
          runId: id,
          status: In([
            BroadcastDeliveryStatus.PENDING,
            BroadcastDeliveryStatus.FAILED_RETRYABLE,
          ]),
        },
        {
          status: BroadcastDeliveryStatus.FAILED_PERMANENT,
          nextAttemptAt: null,
          lockToken: null,
          lockExpiresAt: null,
          lastError: 'Broadcast cancelled by admin',
        },
      );

      await queryRunner.manager.update(
        BroadcastDelivery,
        {
          runId: id,
          status: BroadcastDeliveryStatus.PROCESSING,
        },
        {
          status: BroadcastDeliveryStatus.UNKNOWN,
          lockToken: null,
          lockExpiresAt: null,
          nextAttemptAt: null,
          lastError:
            'Delivery outcome unknown because broadcast was cancelled mid-flight',
        },
      );

      await queryRunner.manager.update(
        BroadcastRun,
        { id },
        {
          status: BroadcastRunStatus.CANCELLED,
          finishedAt: now,
          lastHeartbeatAt: now,
          lockToken: null,
          lockExpiresAt: null,
        },
      );

      await queryRunner.commitTransaction();
      await this.refreshRunCounters(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    const updated = await this.runRepo.findOne({ where: { id } });
    if (!updated) {
      throw new NotFoundException('Broadcast run not found');
    }
    return updated;
  }

  async requeueUnknownDeliveries(id: number) {
    const run = await this.runRepo.findOne({ where: { id } });
    if (!run) {
      throw new NotFoundException('Broadcast run not found');
    }
    if (run.status === BroadcastRunStatus.RUNNING) {
      throw new BadRequestException('Cannot requeue unknown deliveries while run is active');
    }

    const result = await this.deliveryRepo.update(
      {
        runId: id,
        status: BroadcastDeliveryStatus.UNKNOWN,
      },
      {
        status: BroadcastDeliveryStatus.PENDING,
        nextAttemptAt: null,
        lockToken: null,
        lockExpiresAt: null,
        lastError: null,
      },
    );

    if ((result.affected ?? 0) > 0) {
      await this.runRepo.update(
        { id },
        {
          status: BroadcastRunStatus.QUEUED,
          finishedAt: null,
          lockToken: null,
          lockExpiresAt: null,
        },
      );
      await this.refreshRunCounters(id);
      void this.processQueueTick();
    }

    return {
      runId: id,
      requeued: result.affected ?? 0,
    };
  }

  @Cron('*/20 * * * * *')
  async processQueueCron() {
    await this.processQueueTick();
  }

  @Cron('15 3 * * *')
  async purgeOldRunsCron() {
    await this.purgeOldRuns();
  }

  async processQueueTick() {
    if (this.tickInFlight) return;
    this.tickInFlight = true;
    try {
      await this.markGloballyStaleProcessingAsUnknown();
      const claimed = await this.claimNextRun();
      if (!claimed) return;
      await this.processClaimedRun(claimed.run, claimed.lockToken);
    } catch (error) {
      this.logger.error('Broadcast queue tick failed', error as Error);
    } finally {
      this.tickInFlight = false;
    }
  }

  async purgeOldRuns() {
    const cutoff = new Date(
      Date.now() - this.retentionDays * 24 * 60 * 60 * 1000,
    );
    await this.runRepo.delete({
      status: In([...TERMINAL_RUN_STATUSES]),
      finishedAt: LessThan(cutoff),
    });
  }

  private async processClaimedRun(run: BroadcastRun, lockToken: string) {
    for (let batch = 0; batch < this.maxBatchesPerTick; batch += 1) {
      const stillLocked = await this.renewRunLock(run.id, lockToken);
      if (!stillLocked) {
        return;
      }

      const claimedDeliveries = await this.claimDeliveries(run.id, lockToken);
      if (claimedDeliveries.length === 0) {
        break;
      }

      await this.processWithConcurrency(
        claimedDeliveries,
        this.concurrency,
        async (delivery) => this.sendDelivery(run, delivery, lockToken),
      );
    }

    await this.markRunStaleProcessingAsUnknown(run.id);
    await this.refreshRunCounters(run.id);
    await this.finalizeRunIfComplete(run.id, lockToken);
  }

  private async finalizeRunIfComplete(runId: number, lockToken: string) {
    const summary = await this.getDeliveryStatusSummary(runId);
    const activeCount =
      summary[BroadcastDeliveryStatus.PENDING] +
      summary[BroadcastDeliveryStatus.FAILED_RETRYABLE] +
      summary[BroadcastDeliveryStatus.PROCESSING];

    if (activeCount > 0) {
      return;
    }

    const run = await this.runRepo.findOne({ where: { id: runId } });
    if (!run) return;
    if (run.status === BroadcastRunStatus.CANCELLED) {
      await this.releaseRunLock(runId, lockToken);
      return;
    }

    const errors =
      summary[BroadcastDeliveryStatus.FAILED_PERMANENT] +
      summary[BroadcastDeliveryStatus.UNKNOWN];
    await this.runRepo
      .createQueryBuilder()
      .update(BroadcastRun)
      .set({
        status:
          errors > 0
            ? BroadcastRunStatus.COMPLETED_WITH_ERRORS
            : BroadcastRunStatus.COMPLETED,
        finishedAt: new Date(),
        lockToken: null,
        lockExpiresAt: null,
        lastHeartbeatAt: new Date(),
      })
      .where('id = :id', { id: runId })
      .andWhere('lockToken = :lockToken', { lockToken })
      .execute();
  }

  private async claimNextRun(): Promise<{ run: BroadcastRun; lockToken: string } | null> {
    const now = new Date();
    const candidate = await this.runRepo
      .createQueryBuilder('run')
      .where('run.status IN (:...statuses)', {
        statuses: [BroadcastRunStatus.QUEUED, BroadcastRunStatus.RUNNING],
      })
      .andWhere('(run.lockExpiresAt IS NULL OR run.lockExpiresAt < :now)', { now })
      .orderBy(
        "CASE WHEN run.status = 'QUEUED' THEN 0 ELSE 1 END",
        'ASC',
      )
      .addOrderBy('run.createdAt', 'ASC')
      .getOne();

    if (!candidate) return null;

    const lockToken = `${this.nodeToken}-${randomUUID().slice(0, 8)}`;
    const leaseUntil = new Date(Date.now() + this.runLeaseMs);
    const result = await this.runRepo
      .createQueryBuilder()
      .update(BroadcastRun)
      .set({
        status: BroadcastRunStatus.RUNNING,
        lockToken,
        lockExpiresAt: leaseUntil,
        startedAt: () => 'COALESCE(`startedAt`, CURRENT_TIMESTAMP)',
        lastHeartbeatAt: new Date(),
      })
      .where('id = :id', { id: candidate.id })
      .andWhere('status IN (:...statuses)', {
        statuses: [BroadcastRunStatus.QUEUED, BroadcastRunStatus.RUNNING],
      })
      .andWhere('(lockExpiresAt IS NULL OR lockExpiresAt < :now)', { now })
      .execute();

    if ((result.affected ?? 0) === 0) {
      return null;
    }

    const claimedRun = await this.runRepo.findOne({ where: { id: candidate.id } });
    if (!claimedRun) return null;
    return { run: claimedRun, lockToken };
  }

  private async renewRunLock(runId: number, lockToken: string): Promise<boolean> {
    const result = await this.runRepo
      .createQueryBuilder()
      .update(BroadcastRun)
      .set({
        lockExpiresAt: new Date(Date.now() + this.runLeaseMs),
        lastHeartbeatAt: new Date(),
      })
      .where('id = :id', { id: runId })
      .andWhere('lockToken = :lockToken', { lockToken })
      .andWhere('status = :status', { status: BroadcastRunStatus.RUNNING })
      .execute();
    return (result.affected ?? 0) > 0;
  }

  private async releaseRunLock(runId: number, lockToken: string) {
    await this.runRepo
      .createQueryBuilder()
      .update(BroadcastRun)
      .set({
        lockToken: null,
        lockExpiresAt: null,
        lastHeartbeatAt: new Date(),
      })
      .where('id = :id', { id: runId })
      .andWhere('lockToken = :lockToken', { lockToken })
      .execute();
  }

  private async claimDeliveries(runId: number, lockToken: string) {
    const now = new Date();
    const candidateRows = await this.deliveryRepo
      .createQueryBuilder('delivery')
      .where('delivery.runId = :runId', { runId })
      .andWhere('delivery.status IN (:...statuses)', {
        statuses: [
          BroadcastDeliveryStatus.PENDING,
          BroadcastDeliveryStatus.FAILED_RETRYABLE,
        ],
      })
      .andWhere(
        '(delivery.nextAttemptAt IS NULL OR delivery.nextAttemptAt <= :now)',
        { now },
      )
      .andWhere('(delivery.lockExpiresAt IS NULL OR delivery.lockExpiresAt < :now)', {
        now,
      })
      .orderBy('delivery.id', 'ASC')
      .limit(this.batchSize * 2)
      .getMany();

    const claimedIds: number[] = [];
    for (const candidate of candidateRows) {
      if (claimedIds.length >= this.batchSize) break;
      const claimResult = await this.deliveryRepo
        .createQueryBuilder()
        .update(BroadcastDelivery)
        .set({
          status: BroadcastDeliveryStatus.PROCESSING,
          lockToken,
          lockExpiresAt: new Date(Date.now() + this.deliveryLeaseMs),
          lastAttemptAt: now,
          nextAttemptAt: null,
          lastError: null,
          attemptCount: () => '`attemptCount` + 1',
        })
        .where('id = :id', { id: candidate.id })
        .andWhere('status IN (:...statuses)', {
          statuses: [
            BroadcastDeliveryStatus.PENDING,
            BroadcastDeliveryStatus.FAILED_RETRYABLE,
          ],
        })
        .andWhere('(lockExpiresAt IS NULL OR lockExpiresAt < :now)', { now })
        .execute();

      if ((claimResult.affected ?? 0) > 0) {
        claimedIds.push(candidate.id);
      }
    }

    if (claimedIds.length === 0) {
      return [];
    }

    return this.deliveryRepo.find({
      where: {
        id: In(claimedIds),
      },
      order: {
        id: 'ASC',
      },
    });
  }

  private async sendDelivery(
    run: BroadcastRun,
    delivery: BroadcastDelivery,
    lockToken: string,
  ) {
    try {
      const response = await this.botService.sendUserMessage(
        delivery.telegramId,
        run.message,
      );

      await this.deliveryRepo
        .createQueryBuilder()
        .update(BroadcastDelivery)
        .set({
          status: BroadcastDeliveryStatus.SENT,
          sentAt: new Date(),
          nextAttemptAt: null,
          lockToken: null,
          lockExpiresAt: null,
          lastError: null,
          telegramMessageId: String(response.messageId),
        })
        .where('id = :id', { id: delivery.id })
        .andWhere('status = :status', { status: BroadcastDeliveryStatus.PROCESSING })
        .andWhere('lockToken = :lockToken', { lockToken })
        .execute();
    } catch (error) {
      const { retryable, message, deactivateSubscriber } =
        this.classifyTelegramError(error);
      const nextAttemptMs = this.getNextBackoffMs(delivery.attemptCount);
      const shouldRetry = retryable && delivery.attemptCount < this.maxAttempts;

      await this.deliveryRepo
        .createQueryBuilder()
        .update(BroadcastDelivery)
        .set({
          status: shouldRetry
            ? BroadcastDeliveryStatus.FAILED_RETRYABLE
            : BroadcastDeliveryStatus.FAILED_PERMANENT,
          nextAttemptAt: shouldRetry
            ? new Date(Date.now() + nextAttemptMs)
            : null,
          lockToken: null,
          lockExpiresAt: null,
          lastError: message,
        })
        .where('id = :id', { id: delivery.id })
        .andWhere('status = :status', { status: BroadcastDeliveryStatus.PROCESSING })
        .andWhere('lockToken = :lockToken', { lockToken })
        .execute();

      if (deactivateSubscriber) {
        try {
          await this.botService.markSubscriberInactive(delivery.telegramId);
        } catch (markError) {
          this.logger.warn(
            `Failed to mark subscriber ${delivery.telegramId} inactive: ${
              (markError as Error).message
            }`,
          );
        }
      }
    }
  }

  private async markGloballyStaleProcessingAsUnknown() {
    const staleBefore = new Date(Date.now() - this.staleProcessingGraceMs);
    await this.deliveryRepo
      .createQueryBuilder()
      .update(BroadcastDelivery)
      .set({
        status: BroadcastDeliveryStatus.UNKNOWN,
        lockToken: null,
        lockExpiresAt: null,
        nextAttemptAt: null,
        lastError:
          'Delivery outcome unknown after worker interruption. Not retried automatically to avoid duplicate sends.',
      })
      .where('status = :status', { status: BroadcastDeliveryStatus.PROCESSING })
      .andWhere('lockExpiresAt IS NOT NULL')
      .andWhere('lockExpiresAt < :staleBefore', { staleBefore })
      .execute();
  }

  private async markRunStaleProcessingAsUnknown(runId: number) {
    const staleBefore = new Date(Date.now() - this.staleProcessingGraceMs);
    await this.deliveryRepo
      .createQueryBuilder()
      .update(BroadcastDelivery)
      .set({
        status: BroadcastDeliveryStatus.UNKNOWN,
        lockToken: null,
        lockExpiresAt: null,
        nextAttemptAt: null,
        lastError:
          'Delivery outcome unknown after worker interruption. Not retried automatically to avoid duplicate sends.',
      })
      .where('runId = :runId', { runId })
      .andWhere('status = :status', { status: BroadcastDeliveryStatus.PROCESSING })
      .andWhere('lockExpiresAt IS NOT NULL')
      .andWhere('lockExpiresAt < :staleBefore', { staleBefore })
      .execute();
  }

  private async refreshRunCounters(runId: number) {
    const summary = await this.getDeliveryStatusSummary(runId);
    const pending =
      summary[BroadcastDeliveryStatus.PENDING] +
      summary[BroadcastDeliveryStatus.FAILED_RETRYABLE] +
      summary[BroadcastDeliveryStatus.PROCESSING];

    await this.runRepo.update(
      { id: runId },
      {
        totalRecipients: Object.values(summary).reduce((sum, count) => sum + count, 0),
        pendingCount: pending,
        sentCount: summary[BroadcastDeliveryStatus.SENT],
        failedCount: summary[BroadcastDeliveryStatus.FAILED_PERMANENT],
        unknownCount: summary[BroadcastDeliveryStatus.UNKNOWN],
      },
    );
  }

  private async getDeliveryStatusSummary(runId: number) {
    const rows = await this.deliveryRepo
      .createQueryBuilder('delivery')
      .select('delivery.status', 'status')
      .addSelect('COUNT(delivery.id)', 'count')
      .where('delivery.runId = :runId', { runId })
      .groupBy('delivery.status')
      .getRawMany<{ status: BroadcastDeliveryStatus; count: string }>();

    const summary: Record<BroadcastDeliveryStatus, number> = {
      [BroadcastDeliveryStatus.PENDING]: 0,
      [BroadcastDeliveryStatus.PROCESSING]: 0,
      [BroadcastDeliveryStatus.SENT]: 0,
      [BroadcastDeliveryStatus.FAILED_RETRYABLE]: 0,
      [BroadcastDeliveryStatus.FAILED_PERMANENT]: 0,
      [BroadcastDeliveryStatus.UNKNOWN]: 0,
    };

    for (const row of rows) {
      if (row.status in summary) {
        summary[row.status] = Number.parseInt(row.count, 10) || 0;
      }
    }
    return summary;
  }

  private classifyTelegramError(error: unknown): {
    retryable: boolean;
    message: string;
    deactivateSubscriber: boolean;
  } {
    const response = (error as any)?.response ?? {};
    const code = Number(response?.error_code);
    const text = String(
      response?.description ??
        (error as any)?.description ??
        (error as any)?.message ??
        'Unknown Telegram error',
    );
    const normalized = text.toLowerCase();

    const blockedOrUnavailable =
      normalized.includes('blocked by the user') ||
      normalized.includes('chat not found') ||
      normalized.includes('user is deactivated') ||
      normalized.includes('bot was kicked');

    const definitelyPermanent =
      code === 400 ||
      code === 403 ||
      blockedOrUnavailable ||
      normalized.includes('have no rights to send');

    return {
      retryable: !definitelyPermanent,
      message: text.slice(0, 512),
      deactivateSubscriber: definitelyPermanent && blockedOrUnavailable,
    };
  }

  private getNextBackoffMs(attemptCount: number): number {
    const backoffMinutes = [1, 5, 30, 120, 360];
    const idx = Math.min(Math.max(attemptCount - 1, 0), backoffMinutes.length - 1);
    return backoffMinutes[idx] * 60 * 1000;
  }

  private buildRunDeliveriesQuery(runId: number) {
    return this.deliveryRepo
      .createQueryBuilder('delivery')
      .leftJoin(User, 'user', 'user.id = delivery.userId')
      .leftJoin(
        BotSubscriber,
        'subscriber',
        'subscriber.telegramId = delivery.telegramId',
      )
      .select('delivery.id', 'deliveryId')
      .addSelect('delivery.status', 'status')
      .addSelect('delivery.attemptCount', 'attemptCount')
      .addSelect('delivery.telegramId', 'telegramId')
      .addSelect('delivery.telegramMessageId', 'telegramMessageId')
      .addSelect('delivery.sentAt', 'sentAt')
      .addSelect('delivery.lastAttemptAt', 'lastAttemptAt')
      .addSelect('delivery.nextAttemptAt', 'nextAttemptAt')
      .addSelect('delivery.lastError', 'lastError')
      .addSelect('user.id', 'userId')
      .addSelect('user.firstName', 'userFirstName')
      .addSelect('user.username', 'userUsername')
      .addSelect('user.role', 'userRole')
      .addSelect('subscriber.firstName', 'subscriberFirstName')
      .addSelect('subscriber.username', 'subscriberUsername')
      .where('delivery.runId = :runId', { runId });
  }

  private applyDeliveryFilter(
    qb: SelectQueryBuilder<BroadcastDelivery>,
    filter: BroadcastDeliveryFilter,
  ) {
    switch (filter) {
      case BroadcastDeliveryFilter.SENT:
        qb.andWhere('delivery.status = :status', {
          status: BroadcastDeliveryStatus.SENT,
        });
        break;
      case BroadcastDeliveryFilter.NOT_SENT:
        qb.andWhere('delivery.status IN (:...statuses)', {
          statuses: [
            BroadcastDeliveryStatus.PENDING,
            BroadcastDeliveryStatus.PROCESSING,
            BroadcastDeliveryStatus.FAILED_RETRYABLE,
            BroadcastDeliveryStatus.FAILED_PERMANENT,
            BroadcastDeliveryStatus.UNKNOWN,
          ],
        });
        break;
      case BroadcastDeliveryFilter.FAILED:
        qb.andWhere('delivery.status IN (:...statuses)', {
          statuses: [
            BroadcastDeliveryStatus.FAILED_RETRYABLE,
            BroadcastDeliveryStatus.FAILED_PERMANENT,
          ],
        });
        break;
      case BroadcastDeliveryFilter.UNKNOWN:
        qb.andWhere('delivery.status = :status', {
          status: BroadcastDeliveryStatus.UNKNOWN,
        });
        break;
      case BroadcastDeliveryFilter.PENDING:
        qb.andWhere('delivery.status IN (:...statuses)', {
          statuses: [
            BroadcastDeliveryStatus.PENDING,
            BroadcastDeliveryStatus.PROCESSING,
            BroadcastDeliveryStatus.FAILED_RETRYABLE,
          ],
        });
        break;
      case BroadcastDeliveryFilter.ALL:
      default:
        break;
    }
  }

  private normalizeTargetUserIds(userIds?: number[]): number[] {
    if (!Array.isArray(userIds)) {
      return [];
    }

    const unique = new Set<number>();
    for (const value of userIds) {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) continue;
      const safe = Math.floor(parsed);
      if (safe < 1) continue;
      unique.add(safe);
      if (unique.size >= 5000) {
        break;
      }
    }

    return Array.from(unique.values());
  }

  private async getRecipients(params: {
    target: BroadcastTarget;
    targetRole: UserRole | null;
    targetUserIds: number[];
    limit: number | undefined;
    queryRunner: QueryRunner;
  }) {
    if (params.target === BroadcastTarget.BOT_SUBSCRIBERS) {
      const subscriberQb = params.queryRunner.manager
        .getRepository(BotSubscriber)
        .createQueryBuilder('subscriber')
        .select('subscriber.telegramId', 'telegramId')
        .addSelect('user.id', 'userId')
        .leftJoin(User, 'user', 'user.telegramId = subscriber.telegramId')
        .where('subscriber.isActive = :isActive', { isActive: true })
        .orderBy('subscriber.id', 'ASC');

      if (params.limit !== undefined) {
        subscriberQb.limit(params.limit);
      }

      const rows = await subscriberQb.getRawMany<{
        userId: number | null;
        telegramId: string;
      }>();
      return rows.map((row) => ({
        userId:
          typeof row.userId === 'number'
            ? row.userId
            : Number.parseInt(String(row.userId), 10) || null,
        telegramId: String(row.telegramId ?? '').trim(),
      }));
    }

    const userQb = params.queryRunner.manager
      .getRepository(User)
      .createQueryBuilder('user')
      .select('user.id', 'userId')
      .addSelect('user.telegramId', 'telegramId')
      .where('user.telegramId IS NOT NULL')
      .andWhere("TRIM(COALESCE(user.telegramId, '')) != ''");

    if (params.target === BroadcastTarget.VIP) {
      const vipSubQb = params.queryRunner.manager
        .getRepository(Order)
        .createQueryBuilder('order')
        .select('order.userId', 'userId')
        .where('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
        .groupBy('order.userId')
        .having('COUNT(order.id) >= :minOrders', {
          minOrders: this.vipMinOrders,
        });

      userQb.andWhere(`user.id IN (${vipSubQb.getQuery()})`);
      userQb.setParameters(vipSubQb.getParameters());
    }

    if (params.target === BroadcastTarget.ROLE && params.targetRole) {
      userQb.andWhere('user.role = :targetRole', {
        targetRole: params.targetRole,
      });
    }

    if (params.target === BroadcastTarget.USERS) {
      if (params.targetUserIds.length === 0) {
        return [];
      }
      userQb.andWhere('user.id IN (:...targetUserIds)', {
        targetUserIds: params.targetUserIds,
      });
    }

    userQb.orderBy('user.id', 'ASC');
    if (params.limit !== undefined) {
      userQb.limit(params.limit);
    }

    const rows = await userQb.getRawMany<{
      userId: number | null;
      telegramId: string;
    }>();

    return rows.map((row) => ({
      userId:
        typeof row.userId === 'number'
          ? row.userId
          : Number.parseInt(String(row.userId), 10) || null,
      telegramId: String(row.telegramId ?? '').trim(),
    }));
  }

  private async processWithConcurrency<T>(
    items: T[],
    concurrency: number,
    task: (item: T) => Promise<void>,
  ) {
    if (items.length === 0) return;
    const workers = new Array(Math.min(concurrency, items.length))
      .fill(0)
      .map(async (_entry, workerIdx) => {
        for (let idx = workerIdx; idx < items.length; idx += concurrency) {
          await task(items[idx]);
        }
      });
    await Promise.all(workers);
  }

  private normalizeNumber(
    value: number | undefined,
    fallback: number,
    min: number,
    max: number,
  ) {
    if (!Number.isFinite(value)) return fallback;
    return Math.min(Math.max(Math.floor(value as number), min), max);
  }
}
