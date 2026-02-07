import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity } from '../../../common/entities/abstract.entity';
import { User } from '../../users/entities/user.entity';

export enum BankAccountStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('bank_accounts')
export class BankAccount extends AbstractEntity {
  @Column({ type: 'varchar', length: 120 })
  bankName: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', length: 160 })
  accountHolderName: string;

  @Column({ type: 'varchar', length: 64 })
  accountNumber: string;

  @Column({
    type: 'enum',
    enum: BankAccountStatus,
    default: BankAccountStatus.ACTIVE,
  })
  status: BankAccountStatus;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ownerUserId' })
  ownerUser: User | null;

  @Index('idx_bank_accounts_ownerUserId')
  @Column({ nullable: true })
  ownerUserId: number | null;
}
