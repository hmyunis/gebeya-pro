import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ImageService } from './image.service';
import { CategoriesController } from './categories.controller';
import { User } from '../users/entities/user.entity';
import { BankAccount } from '../payments/entities/bank-account.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category, User, BankAccount])],
  controllers: [ProductsController, CategoriesController],
  providers: [ProductsService, ImageService],
})
export class ProductsModule {}
