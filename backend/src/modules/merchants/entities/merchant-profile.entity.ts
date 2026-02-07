import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { AbstractEntity } from '../../../common/entities/abstract.entity';
import { User } from '../../users/entities/user.entity';

@Entity('merchant_profiles')
export class MerchantProfile extends AbstractEntity {
  @OneToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ unique: true })
  userId: number;

  @Column({ type: 'varchar', length: 32 })
  phoneNumber: string;

  @Column({ type: 'simple-json' })
  itemTypes: string[];

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  profilePictureUrl: string | null;
}
