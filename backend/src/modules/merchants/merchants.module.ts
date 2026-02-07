import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { MerchantProfile } from './entities/merchant-profile.entity';
import { MerchantApplication } from './entities/merchant-application.entity';
import { MerchantsController } from './merchants.controller';
import { MerchantsService } from './merchants.service';
import { MerchantImageService } from './merchant-image.service';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Product } from '../products/entities/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      MerchantProfile,
      MerchantApplication,
      Order,
      OrderItem,
      Product,
    ]),
  ],
  controllers: [MerchantsController],
  providers: [MerchantsService, MerchantImageService],
  exports: [MerchantsService],
})
export class MerchantsModule {}
