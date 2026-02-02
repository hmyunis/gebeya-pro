import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ImageService } from './image.service';
import { CategoriesController } from './categories.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category])],
  controllers: [ProductsController, CategoriesController],
  providers: [ProductsService, ImageService],
})
export class ProductsModule {}
