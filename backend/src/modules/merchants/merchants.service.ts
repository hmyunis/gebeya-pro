import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { User, UserRole } from '../users/entities/user.entity';
import {
  MerchantApplication,
  MerchantApplicationStatus,
} from './entities/merchant-application.entity';
import { MerchantProfile } from './entities/merchant-profile.entity';
import { MerchantImageService } from './merchant-image.service';
import { TelegramLoginDto } from '../auth/dto/telegram-login.dto';
import {
  hashPassword,
  isValidLoginUsername,
  normalizeLoginUsername,
} from '../auth/password-hash';
import { BotService } from '../bot/bot.service';
import { CreateMerchantApplicationDto } from './dto/create-merchant-application.dto';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { ApproveMerchantApplicationDto } from './dto/approve-merchant-application.dto';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { Product } from '../products/entities/product.entity';

type TelegramCredentialsDelivery = {
  attempted: boolean;
  sent: boolean;
  error?: string;
};

@Injectable()
export class MerchantsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly imageService: MerchantImageService,
    private readonly botService: BotService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(MerchantProfile)
    private readonly profileRepo: Repository<MerchantProfile>,
    @InjectRepository(MerchantApplication)
    private readonly applicationRepo: Repository<MerchantApplication>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async createApplication(
    dto: CreateMerchantApplicationDto,
    profilePicture?: Buffer,
  ) {
    const telegramData = await this.parseAndValidateTelegramAuth(
      dto.telegramAuthData,
    );
    this.verifyTelegramSignature(telegramData);

    const pendingExisting = await this.applicationRepo.findOne({
      where: {
        telegramId: String(telegramData.id),
        status: MerchantApplicationStatus.PENDING,
      },
    });
    if (pendingExisting) {
      throw new ConflictException(
        'You already have a pending merchant application',
      );
    }

    let profilePictureUrl: string | null = null;
    if (profilePicture && profilePicture.length > 0) {
      profilePictureUrl = await this.imageService.optimizeAndSave(profilePicture);
    }

    const application = this.applicationRepo.create({
      fullName: dto.fullName.trim(),
      phoneNumber: dto.phoneNumber.trim(),
      itemTypes: dto.itemTypes,
      address: dto.address.trim(),
      profilePictureUrl,
      telegramId: String(telegramData.id),
      telegramUsername: telegramData.username ?? null,
      telegramFirstName: telegramData.first_name,
      telegramPhotoUrl: telegramData.photo_url ?? null,
      status: MerchantApplicationStatus.PENDING,
      merchantUserId: null,
      processedByUserId: null,
      processedAt: null,
      reviewNote: null,
    });

    return this.applicationRepo.save(application);
  }

  async listMerchants(
    page: number,
    limit: number,
    search?: string,
    archive: 'active' | 'archived' | 'all' = 'active',
  ) {
    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndMapOne(
        'user.merchantProfile',
        MerchantProfile,
        'profile',
        'profile.userId = user.id',
      )
      .where('user.role = :role', { role: UserRole.MERCHANT })
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const normalizedSearch = search?.trim().toLowerCase();
    if (normalizedSearch) {
      qb.andWhere(
        `(
          LOWER(COALESCE(user.firstName, '')) LIKE :search
          OR LOWER(COALESCE(user.loginUsername, '')) LIKE :search
          OR LOWER(COALESCE(user.username, '')) LIKE :search
          OR COALESCE(user.telegramId, '') LIKE :search
          OR LOWER(COALESCE(profile.phoneNumber, '')) LIKE :search
        )`,
        { search: `%${normalizedSearch}%` },
      );
    }

    if (archive === 'active') {
      qb.andWhere('user.isBanned = :isBanned', { isBanned: false });
    } else if (archive === 'archived') {
      qb.andWhere('user.isBanned = :isBanned', { isBanned: true });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async setMerchantArchived(merchantId: number, archived: boolean) {
    const merchant = await this.userRepo.findOne({
      where: { id: merchantId, role: UserRole.MERCHANT },
    });
    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    merchant.isBanned = archived;
    await this.userRepo.save(merchant);

    return {
      success: true,
      archived,
    };
  }

  async createMerchant(
    dto: CreateMerchantDto,
    createdByUserId: number,
    profilePicture?: Buffer,
  ) {
    const baseUsername = dto.loginUsername?.trim() || dto.fullName;
    const username = await this.generateUniqueLoginUsername(baseUsername);
    const plainPassword = dto.password?.trim() || this.generateRandomPassword();

    let existingByTelegram: User | null = null;
    if (dto.telegramId) {
      existingByTelegram = await this.userRepo.findOne({
        where: { telegramId: dto.telegramId.trim() },
      });
      if (existingByTelegram && existingByTelegram.role === UserRole.ADMIN) {
        throw new BadRequestException(
          'Telegram account already belongs to an admin',
        );
      }
    }

    const pepper = this.configService.get<string>('PASSWORD_PEPPER') ?? '';

    const user = existingByTelegram ?? this.userRepo.create();
    user.firstName = dto.fullName.trim();
    user.role = UserRole.MERCHANT;
    user.loginUsername = username;
    user.passwordHash = await hashPassword(plainPassword, pepper);
    user.passwordLoginFailedAttempts = 0;
    user.passwordLoginLockedUntil = null;
    user.isBanned = false;
    user.telegramId = dto.telegramId?.trim() || user.telegramId || null;
    user.username = dto.telegramUsername?.trim() || user.username || '';

    if (profilePicture && profilePicture.length > 0) {
      user.avatarUrl = await this.imageService.optimizeAndSave(profilePicture);
    }

    const savedUser = await this.userRepo.save(user);

    await this.upsertMerchantProfile(savedUser.id, {
      phoneNumber: dto.phoneNumber.trim(),
      itemTypes: dto.itemTypes,
      address: dto.address.trim(),
      profilePictureUrl: savedUser.avatarUrl ?? null,
    });

    const botDelivery = await this.deliverCredentialsIfPossible(
      savedUser,
      username,
      plainPassword,
    );

    return {
      merchant: savedUser,
      generatedCredentials: {
        username,
        password: plainPassword,
      },
      botDelivery,
      createdByUserId,
    };
  }

  async updateMerchant(
    merchantId: number,
    dto: UpdateMerchantDto,
    profilePicture?: Buffer,
  ) {
    const merchant = await this.userRepo.findOne({
      where: { id: merchantId, role: UserRole.MERCHANT },
    });
    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    if (dto.telegramId !== undefined) {
      const telegramId = dto.telegramId;
      if (telegramId) {
        const existingByTelegram = await this.userRepo.findOne({
          where: { telegramId },
        });
        if (existingByTelegram && existingByTelegram.id !== merchant.id) {
          throw new ConflictException('Telegram account is already linked');
        }
      }
      merchant.telegramId = telegramId;
    }

    if (dto.telegramUsername !== undefined) {
      merchant.username = dto.telegramUsername ?? '';
    }
    if (dto.fullName !== undefined) {
      merchant.firstName = dto.fullName.trim();
    }

    const previousAvatarUrl = merchant.avatarUrl ?? null;
    if (profilePicture && profilePicture.length > 0) {
      merchant.avatarUrl = await this.imageService.optimizeAndSave(profilePicture);
    }

    const savedMerchant = await this.userRepo.save(merchant);

    await this.upsertMerchantProfile(savedMerchant.id, {
      phoneNumber: dto.phoneNumber?.trim(),
      itemTypes: dto.itemTypes,
      address: dto.address?.trim(),
      profilePictureUrl: savedMerchant.avatarUrl ?? null,
    });

    if (
      profilePicture &&
      previousAvatarUrl &&
      previousAvatarUrl !== savedMerchant.avatarUrl
    ) {
      await this.imageService.deleteImage(previousAvatarUrl);
    }

    const reloaded = await this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndMapOne(
        'user.merchantProfile',
        MerchantProfile,
        'profile',
        'profile.userId = user.id',
      )
      .where('user.id = :id', { id: savedMerchant.id })
      .getOne();

    return reloaded ?? savedMerchant;
  }

  async deleteMerchant(merchantId: number) {
    const merchant = await this.userRepo.findOne({
      where: { id: merchantId, role: UserRole.MERCHANT },
    });
    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    const [merchantOrderRefs, customerOrderRefs, pendingMerchantOrders] =
      await Promise.all([
        this.orderRepo.count({ where: { merchant: { id: merchantId } } }),
        this.orderRepo.count({ where: { user: { id: merchantId } } }),
        this.orderRepo.count({
          where: { merchant: { id: merchantId }, status: OrderStatus.PENDING },
        }),
      ]);

    const totalOrderRefs = merchantOrderRefs + customerOrderRefs;
    if (totalOrderRefs > 0) {
      throw new BadRequestException(
        [
          'Merchant cannot be deleted because order history references this account.',
          `References: merchantOrders=${merchantOrderRefs}, customerOrders=${customerOrderRefs}, pendingMerchantOrders=${pendingMerchantOrders}.`,
          'Archive the merchant instead, or contact them to clear pending merchant orders first.',
        ].join(' '),
      );
    }

    await this.productRepo
      .createQueryBuilder()
      .update(Product)
      .set({ merchantId: null })
      .where('merchantId = :merchantId', { merchantId })
      .execute();

    const profile = await this.profileRepo.findOne({ where: { userId: merchantId } });
    const profilePictureUrl = profile?.profilePictureUrl ?? null;
    const avatarUrl = merchant.avatarUrl ?? null;

    if (profile) {
      await this.profileRepo.remove(profile);
    }

    await this.userRepo.remove(merchant);

    await Promise.all([
      this.imageService.deleteImage(avatarUrl),
      this.imageService.deleteImage(profilePictureUrl),
    ]);

    return { success: true, mode: 'deleted' };
  }

  async listApplications(
    page: number,
    limit: number,
    status?: MerchantApplicationStatus,
  ) {
    const qb = this.applicationRepo
      .createQueryBuilder('application')
      .leftJoinAndSelect('application.merchantUser', 'merchantUser')
      .leftJoinAndSelect('application.processedBy', 'processedBy')
      .orderBy('application.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.where('application.status = :status', { status });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async countPendingApplications() {
    return this.applicationRepo.count({
      where: { status: MerchantApplicationStatus.PENDING },
    });
  }

  async getApplicationById(id: number) {
    const application = await this.applicationRepo.findOne({
      where: { id },
      relations: ['merchantUser', 'processedBy'],
    });
    if (!application) {
      throw new NotFoundException('Merchant application not found');
    }
    return application;
  }

  async approveApplication(
    id: number,
    reviewerUserId: number,
    dto: ApproveMerchantApplicationDto,
  ) {
    const application = await this.applicationRepo.findOne({
      where: { id },
      relations: ['merchantUser'],
    });
    if (!application) {
      throw new NotFoundException('Merchant application not found');
    }
    if (application.status !== MerchantApplicationStatus.PENDING) {
      throw new BadRequestException('Application is already processed');
    }

    const createAccount = dto.createAccount !== false;

    let merchantUser: User | null = application.merchantUser ?? null;
    let credentials:
      | {
          username: string;
          password: string;
        }
      | undefined;
    let botDelivery: TelegramCredentialsDelivery = {
      attempted: false,
      sent: false,
    };

    if (createAccount) {
      const accountResult = await this.createAccountFromApplication(application);
      merchantUser = accountResult.user;
      credentials = {
        username: accountResult.username,
        password: accountResult.password,
      };
      botDelivery = accountResult.botDelivery;
    }

    application.status = MerchantApplicationStatus.APPROVED;
    application.processedByUserId = reviewerUserId;
    application.processedAt = new Date();
    application.reviewNote = dto.reviewNote?.trim() || null;
    application.merchantUserId = merchantUser?.id ?? application.merchantUserId;

    const savedApplication = await this.applicationRepo.save(application);

    return {
      application: savedApplication,
      merchant: merchantUser,
      credentials,
      botDelivery,
    };
  }

  async rejectApplication(
    id: number,
    reviewerUserId: number,
    reviewNote?: string,
  ) {
    const application = await this.applicationRepo.findOne({ where: { id } });
    if (!application) {
      throw new NotFoundException('Merchant application not found');
    }
    if (application.status !== MerchantApplicationStatus.PENDING) {
      throw new BadRequestException('Application is already processed');
    }

    application.status = MerchantApplicationStatus.REJECTED;
    application.processedByUserId = reviewerUserId;
    application.processedAt = new Date();
    application.reviewNote = reviewNote?.trim() || null;

    return this.applicationRepo.save(application);
  }

  async getDashboardOverview(userId: number, days: number, limit: number) {
    const rangeDays = Number.isFinite(days) && days > 0 ? days : 7;
    const take = Number.isFinite(limit) && limit > 0 ? limit : 10;

    const startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    startDate.setUTCDate(startDate.getUTCDate() - (rangeDays - 1));

    const [stats, statusCounts, salesRows, topRows, customerRows] =
      await Promise.all([
        this.getMerchantStats(userId),
        this.orderRepo
          .createQueryBuilder('order')
          .select('order.status', 'status')
          .addSelect('COUNT(order.id)', 'count')
          .where('order.merchantId = :userId', { userId })
          .groupBy('order.status')
          .getRawMany<{ status: OrderStatus; count: string }>(),
        this.orderRepo
          .createQueryBuilder('order')
          .select('DATE(order.createdAt)', 'date')
          .addSelect('COUNT(order.id)', 'orderCount')
          .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'revenue')
          .where('order.merchantId = :userId', { userId })
          .andWhere('order.createdAt >= :startDate', { startDate })
          .andWhere('order.status NOT IN (:...excludedStatuses)', {
            excludedStatuses: [OrderStatus.CANCELLED, OrderStatus.REJECTED],
          })
          .groupBy('DATE(order.createdAt)')
          .orderBy('DATE(order.createdAt)', 'ASC')
          .getRawMany<{ date: string; orderCount: string; revenue: string }>(),
        this.orderItemRepo
          .createQueryBuilder('item')
          .leftJoin('item.order', 'order')
          .select('item.productName', 'productName')
          .addSelect('SUM(item.quantity)', 'quantity')
          .addSelect('SUM(item.quantity * item.price)', 'revenue')
          .where('order.merchantId = :userId', { userId })
          .andWhere('order.status NOT IN (:...excludedStatuses)', {
            excludedStatuses: [OrderStatus.CANCELLED, OrderStatus.REJECTED],
          })
          .groupBy('item.productName')
          .orderBy('revenue', 'DESC')
          .limit(take)
          .getRawMany<{
            productName: string;
            quantity: string;
            revenue: string;
          }>(),
        this.orderRepo
          .createQueryBuilder('order')
          .leftJoin('order.user', 'user')
          .select('user.id', 'userId')
          .addSelect('user.firstName', 'firstName')
          .addSelect('user.username', 'username')
          .addSelect('COUNT(order.id)', 'totalOrders')
          .addSelect(
            "SUM(CASE WHEN order.status = 'PENDING' THEN 1 ELSE 0 END)",
            'pendingOrders',
          )
          .addSelect(
            "SUM(CASE WHEN order.status = 'APPROVED' THEN 1 ELSE 0 END)",
            'approvedOrders',
          )
          .addSelect(
            "SUM(CASE WHEN order.status = 'SHIPPED' THEN 1 ELSE 0 END)",
            'shippedOrders',
          )
          .addSelect(
            "SUM(CASE WHEN order.status = 'REJECTED' THEN 1 ELSE 0 END)",
            'rejectedOrders',
          )
          .addSelect(
            "SUM(CASE WHEN order.status = 'CANCELLED' THEN 1 ELSE 0 END)",
            'cancelledOrders',
          )
          .where('order.merchantId = :userId', { userId })
          .groupBy('user.id')
          .orderBy('totalOrders', 'DESC')
          .limit(take)
          .getRawMany<{
            userId: string;
            firstName: string | null;
            username: string | null;
            totalOrders: string;
            pendingOrders: string;
            approvedOrders: string;
            shippedOrders: string;
            rejectedOrders: string;
            cancelledOrders: string;
          }>(),
      ]);

    const counts: Record<OrderStatus, number> = {
      [OrderStatus.PENDING]: 0,
      [OrderStatus.APPROVED]: 0,
      [OrderStatus.SHIPPED]: 0,
      [OrderStatus.REJECTED]: 0,
      [OrderStatus.CANCELLED]: 0,
    };

    for (const row of statusCounts) {
      const status = row.status;
      if (status in counts) {
        counts[status] = Number.parseInt(row.count, 10);
      }
    }

    const salesMap = new Map(
      salesRows.map((row) => [
        row.date,
        {
          orderCount: Number.parseInt(row.orderCount, 10) || 0,
          revenue: Number.parseFloat(row.revenue) || 0,
        },
      ]),
    );

    const salesTrend: Array<{
      date: string;
      orderCount: number;
      revenue: number;
    }> = [];

    for (let index = 0; index < rangeDays; index += 1) {
      const current = new Date(startDate);
      current.setUTCDate(startDate.getUTCDate() + index);
      const isoDate = this.toUtcDate(current);
      const values = salesMap.get(isoDate) ?? { orderCount: 0, revenue: 0 };
      salesTrend.push({ date: isoDate, ...values });
    }

    return {
      stats,
      statusSummary: {
        counts,
        total: Object.values(counts).reduce((sum, value) => sum + value, 0),
      },
      salesTrend,
      topProducts: topRows.map((row) => ({
        productName: row.productName,
        quantity: Number.parseInt(row.quantity, 10) || 0,
        revenue: Number.parseFloat(row.revenue) || 0,
      })),
      bestCustomers: customerRows.map((row) => ({
        userId: Number.parseInt(row.userId, 10) || 0,
        firstName: row.firstName ?? 'Unknown',
        username: row.username ?? 'no_username',
        totalOrders: Number.parseInt(row.totalOrders, 10) || 0,
        statusCounts: {
          PENDING: Number.parseInt(row.pendingOrders, 10) || 0,
          APPROVED: Number.parseInt(row.approvedOrders, 10) || 0,
          SHIPPED: Number.parseInt(row.shippedOrders, 10) || 0,
          REJECTED: Number.parseInt(row.rejectedOrders, 10) || 0,
          CANCELLED: Number.parseInt(row.cancelledOrders, 10) || 0,
        },
      })),
    };
  }

  private async getMerchantStats(userId: number) {
    const [totalOrders, pendingOrders, totalRevenue] = await Promise.all([
      this.orderRepo.count({ where: { merchant: { id: userId } } }),
      this.orderRepo.count({
        where: {
          merchant: { id: userId },
          status: OrderStatus.PENDING,
        },
      }),
      this.orderRepo
        .createQueryBuilder('order')
        .select('SUM(order.totalAmount)', 'sum')
        .where('order.merchantId = :userId', { userId })
        .andWhere('order.status NOT IN (:...excludedStatuses)', {
          excludedStatuses: [OrderStatus.CANCELLED, OrderStatus.REJECTED],
        })
        .getRawOne<{ sum: string | null }>(),
    ]);

    return {
      totalOrders,
      pendingOrders,
      totalRevenue: totalRevenue?.sum ? Number(totalRevenue.sum) : 0,
    };
  }

  private toUtcDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private async createAccountFromApplication(application: MerchantApplication) {
    const pepper = this.configService.get<string>('PASSWORD_PEPPER') ?? '';
    const generatedPassword = this.generateRandomPassword();

    let user = application.merchantUserId
      ? await this.userRepo.findOne({ where: { id: application.merchantUserId } })
      : null;
    if (!user) {
      user = await this.userRepo.findOne({
        where: { telegramId: application.telegramId },
      });
    }

    if (user && user.role === UserRole.ADMIN) {
      throw new BadRequestException(
        'Application Telegram account already belongs to an admin',
      );
    }

    const baseUsername =
      application.telegramUsername?.trim() || application.fullName;
    const generatedUsername = await this.generateUniqueLoginUsername(
      baseUsername,
      user?.id,
    );

    const targetUser = user ?? this.userRepo.create();
    targetUser.firstName = application.fullName.trim();
    targetUser.role = UserRole.MERCHANT;
    targetUser.telegramId = application.telegramId;
    targetUser.username = application.telegramUsername ?? '';
    targetUser.avatarUrl =
      application.profilePictureUrl ||
      application.telegramPhotoUrl ||
      targetUser.avatarUrl ||
      '';
    targetUser.loginUsername = generatedUsername;
    targetUser.passwordHash = await hashPassword(generatedPassword, pepper);
    targetUser.passwordLoginFailedAttempts = 0;
    targetUser.passwordLoginLockedUntil = null;
    targetUser.isBanned = false;

    const savedUser = await this.userRepo.save(targetUser);
    await this.upsertMerchantProfile(savedUser.id, {
      phoneNumber: application.phoneNumber,
      itemTypes: application.itemTypes,
      address: application.address,
      profilePictureUrl: application.profilePictureUrl,
    });

    const botDelivery = await this.deliverCredentialsIfPossible(
      savedUser,
      generatedUsername,
      generatedPassword,
    );

    return {
      user: savedUser,
      username: generatedUsername,
      password: generatedPassword,
      botDelivery,
    };
  }

  private async upsertMerchantProfile(
    userId: number,
    payload: {
      phoneNumber?: string;
      itemTypes?: string[];
      address?: string;
      profilePictureUrl?: string | null;
    },
  ) {
    const existing = await this.profileRepo.findOne({ where: { userId } });
    const profile = existing ?? this.profileRepo.create({ userId });
    profile.userId = userId;
    if (payload.phoneNumber !== undefined) {
      profile.phoneNumber = payload.phoneNumber;
    }
    if (payload.itemTypes !== undefined) {
      profile.itemTypes = payload.itemTypes;
    }
    if (payload.address !== undefined) {
      profile.address = payload.address;
    }
    if (payload.profilePictureUrl !== undefined) {
      profile.profilePictureUrl = payload.profilePictureUrl;
    }
    await this.profileRepo.save(profile);
  }

  private generateRandomPassword(length = 12) {
    const bytes = crypto.randomBytes(Math.max(length, 8));
    return bytes
      .toString('base64url')
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, length);
  }

  private async generateUniqueLoginUsername(
    desired: string,
    excludeUserId?: number,
  ) {
    const normalized =
      normalizeLoginUsername(desired) || normalizeLoginUsername('merchant');
    const base = isValidLoginUsername(normalized)
      ? normalized
      : normalizeLoginUsername(`merchant_${Date.now()}`);

    for (let attempt = 0; attempt < 1000; attempt += 1) {
      const suffix = attempt === 0 ? '' : `${attempt}`;
      const candidate = `${base}${suffix}`.slice(0, 32);
      if (!isValidLoginUsername(candidate)) {
        continue;
      }

      const existing = await this.userRepo.findOne({
        where: { loginUsername: candidate },
      });
      if (!existing || existing.id === excludeUserId) {
        return candidate;
      }
    }

    throw new ConflictException('Unable to generate unique username');
  }

  private async deliverCredentialsIfPossible(
    user: User,
    username: string,
    password: string,
  ): Promise<TelegramCredentialsDelivery> {
    if (!user.telegramId) {
      return { attempted: false, sent: false };
    }

    try {
      await this.botService.notifyMerchantCredentials(
        user.telegramId,
        username,
        password,
      );
      return { attempted: true, sent: true };
    } catch (error) {
      return {
        attempted: true,
        sent: false,
        error: (error as Error)?.message ?? 'Failed to send credentials',
      };
    }
  }

  private async parseAndValidateTelegramAuth(raw: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new BadRequestException('Invalid telegramAuthData payload');
    }

    const dto = plainToInstance(TelegramLoginDto, parsed as object);
    dto.id = Number(dto.id);
    dto.auth_date = Number(dto.auth_date);
    const errors = await validate(dto);
    if (errors.length > 0) {
      throw new BadRequestException('Invalid telegramAuthData payload');
    }
    return dto;
  }

  private verifyTelegramSignature(data: TelegramLoginDto) {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') ?? '';

    const now = Math.floor(Date.now() / 1000);
    if (now - data.auth_date > 300) {
      throw new BadRequestException(
        'Telegram verification expired. Please retry.',
      );
    }

    const checkString = Object.keys(data)
      .filter(
        (key) =>
          key !== 'hash' &&
          data[key as keyof TelegramLoginDto] !== undefined &&
          data[key as keyof TelegramLoginDto] !== null,
      )
      .sort()
      .map((key) => `${key}=${String(data[key as keyof TelegramLoginDto])}`)
      .join('\n');

    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const hash = crypto
      .createHmac('sha256', secretKey)
      .update(checkString)
      .digest('hex');

    if (hash !== data.hash) {
      throw new BadRequestException('Invalid Telegram authorization payload');
    }
  }
}
