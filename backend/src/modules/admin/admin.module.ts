import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminCustomersController } from './admin-customers.controller';
import { BroadcastService } from './broadcast.service';
import { BroadcastRun } from './entities/broadcast-run.entity';
import { BroadcastDelivery } from './entities/broadcast-delivery.entity';
import { User } from '../users/entities/user.entity';
import { Order } from '../orders/entities/order.entity';
import { BotSubscriber } from '../bot/entities/bot-subscriber.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BroadcastRun,
      BroadcastDelivery,
      User,
      Order,
      BotSubscriber,
    ]),
  ],
  controllers: [AdminController, AdminCustomersController],
  providers: [BroadcastService],
})
export class AdminModule {}
