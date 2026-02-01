import { Entity, Column, Index } from 'typeorm';
import { AbstractEntity } from '../../../common/entities/abstract.entity';

export enum UserRole {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
}

@Entity('users')
export class User extends AbstractEntity {
  // Telegram ID is unique and crucial for login
  @Index({ unique: true })
  @Column({ type: 'bigint' }) 
  telegramId: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  username: string; // Telegram handle (e.g., @john_doe)

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  @Column({ default: false })
  isBanned: boolean;
}