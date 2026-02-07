import { Module, Global, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotService } from './bot.service';
import { BotUpdate } from './bot.update';
import { OrdersModule } from '../orders/orders.module';
import { BotSubscriber } from './entities/bot-subscriber.entity';

@Global()
@Module({
  imports: [
    forwardRef(() => OrdersModule),
    TypeOrmModule.forFeature([BotSubscriber]),
  ],
  providers: [BotService, BotUpdate],
  exports: [BotService],
})
export class BotModule {}
