import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';
import { AbstractEntity } from '../../../common/entities/abstract.entity';
import { User } from '../../users/entities/user.entity';

export enum MerchantApplicationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('merchant_applications')
export class MerchantApplication extends AbstractEntity {
  @Column({ type: 'varchar', length: 140 })
  fullName: string;

  @Column({ type: 'varchar', length: 32 })
  phoneNumber: string;

  @Column({ type: 'simple-json' })
  itemTypes: string[];

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  profilePictureUrl: string | null;

  @Index('idx_merchant_applications_telegramId')
  @Column({ type: 'bigint' })
  telegramId: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  telegramUsername: string | null;

  @Column({ type: 'varchar', length: 140, nullable: true })
  telegramFirstName: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  telegramPhotoUrl: string | null;

  @Index('idx_merchant_applications_status')
  @Column({
    type: 'enum',
    enum: MerchantApplicationStatus,
    default: MerchantApplicationStatus.PENDING,
  })
  status: MerchantApplicationStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'merchantUserId' })
  merchantUser: User | null;

  @Column({ nullable: true })
  merchantUserId: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'processedByUserId' })
  processedBy: User | null;

  @Column({ nullable: true })
  processedByUserId: number | null;

  @Column({ type: 'datetime', nullable: true })
  processedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  reviewNote: string | null;
}
