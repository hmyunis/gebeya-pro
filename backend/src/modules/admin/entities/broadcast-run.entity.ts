import {
  Column,
  Entity,
  Index,
  OneToMany,
} from 'typeorm';
import { AbstractEntity } from '../../../common/entities/abstract.entity';
import { BroadcastDelivery } from './broadcast-delivery.entity';
import { UserRole } from '../../users/entities/user.entity';

export enum BroadcastTarget {
  ALL = 'all',
  VIP = 'vip',
  ROLE = 'role',
  USERS = 'users',
  BOT_SUBSCRIBERS = 'bot_subscribers',
}

export enum BroadcastKind {
  ANNOUNCEMENT = 'announcement',
  NEWS = 'news',
  AD = 'ad',
}

export enum BroadcastRunStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  COMPLETED_WITH_ERRORS = 'COMPLETED_WITH_ERRORS',
  CANCELLED = 'CANCELLED',
}

@Entity('broadcast_runs')
@Index('idx_broadcast_runs_status_createdAt', ['status', 'createdAt'])
export class BroadcastRun extends AbstractEntity {
  @Column({ type: 'enum', enum: BroadcastRunStatus, default: BroadcastRunStatus.QUEUED })
  status: BroadcastRunStatus;

  @Column({ type: 'enum', enum: BroadcastTarget, default: BroadcastTarget.ALL })
  target: BroadcastTarget;

  @Column({
    type: 'enum',
    enum: BroadcastKind,
    default: BroadcastKind.ANNOUNCEMENT,
  })
  kind: BroadcastKind;

  @Column({ type: 'enum', enum: UserRole, nullable: true })
  targetRole: UserRole | null;

  @Column({ type: 'simple-json', nullable: true })
  targetUserIds: number[] | null;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'int', nullable: true })
  requestedByUserId: number | null;

  @Column({ type: 'int', default: 0 })
  totalRecipients: number;

  @Column({ type: 'int', default: 0 })
  pendingCount: number;

  @Column({ type: 'int', default: 0 })
  sentCount: number;

  @Column({ type: 'int', default: 0 })
  failedCount: number;

  @Column({ type: 'int', default: 0 })
  unknownCount: number;

  @Column({ type: 'datetime', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  finishedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  lastHeartbeatAt: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  lockToken: string | null;

  @Column({ type: 'datetime', nullable: true })
  lockExpiresAt: Date | null;

  @OneToMany(() => BroadcastDelivery, (delivery) => delivery.run)
  deliveries: BroadcastDelivery[];
}
