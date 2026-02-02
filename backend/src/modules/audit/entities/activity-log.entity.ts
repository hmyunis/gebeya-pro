import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  userId: number;

  @Column({ nullable: true })
  userRole: string;

  @Column()
  method: string;

  @Column()
  path: string;

  @Column({ type: 'text', nullable: true })
  payload: string;

  @Column()
  ipAddress: string;

  @CreateDateColumn()
  timestamp: Date;
}
