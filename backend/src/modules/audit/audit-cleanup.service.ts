import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { ActivityLog } from './entities/activity-log.entity';

const RETENTION_DAYS = 90;

@Injectable()
export class AuditCleanupService {
  private readonly logger = new Logger(AuditCleanupService.name);
  constructor(
    @InjectRepository(ActivityLog)
    private readonly logRepo: Repository<ActivityLog>,
  ) {}

  @Cron('0 3 * * *')
  async purgeOldLogs() {
    try {
      const cutoff = new Date(
        Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000,
      );
      await this.logRepo.delete({ timestamp: LessThan(cutoff) });
    } catch (error) {
      this.logger.error('Failed to purge old activity logs', error);
    }
  }
}
