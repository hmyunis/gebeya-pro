import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { AbstractEntity } from '../../../common/entities/abstract.entity';
import { Category } from './category.entity';
import { User } from '../../users/entities/user.entity';
import { BankAccount } from '../../payments/entities/bank-account.entity';

@Entity('products')
export class Product extends AbstractEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ default: 0 })
  stock: number;

  @Column({ nullable: true })
  imageUrl?: string; // Path to the file

  @Column({ type: 'simple-json', nullable: true })
  imageUrls?: string[] | null;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Category, (category) => category.products, {
    nullable: true,
  })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ nullable: true })
  categoryId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'merchantId' })
  merchant: User | null;

  @Index('idx_products_merchantId')
  @Column({ nullable: true })
  merchantId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User | null;

  @Index('idx_products_createdById')
  @Column({ nullable: true })
  createdById: number | null;

  @ManyToOne(() => BankAccount, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'bankAccountId' })
  bankAccount: BankAccount | null;

  @Index('idx_products_bankAccountId')
  @Column({ nullable: true })
  bankAccountId: number | null;
}
