import { Entity, Column, OneToMany } from 'typeorm';
import { AbstractEntity } from '../../../common/entities/abstract.entity';
import { Product } from './product.entity';

@Entity('categories')
export class Category extends AbstractEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];
}
