import { Column, Entity } from 'typeorm';
import { AbstractEntity } from '../../../common/entities/abstract.entity';

@Entity('contact_messages')
export class ContactMessage extends AbstractEntity {
  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 160 })
  contact: string;

  @Column({ type: 'varchar', length: 100 })
  message: string;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'int', nullable: true })
  readByUserId: number | null;

  @Column({ type: 'datetime', nullable: true })
  readAt: Date | null;
}

