import {
  Entity,
  Column,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { AbstractEntity } from '../../../common/entities/abstract.entity';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  SHIPPED = 'SHIPPED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

@Entity('orders')
export class Order extends AbstractEntity {
  @ManyToOne(() => User, { nullable: false })
  user: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'merchantId' })
  merchant: User | null;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'text', nullable: true })
  shippingAddress: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  receiptUrl: string;

  @Column({ nullable: true })
  adminNote: string;

  @Index('idx_orders_merchantId')
  @Column({ nullable: true })
  merchantId: number | null;
}
