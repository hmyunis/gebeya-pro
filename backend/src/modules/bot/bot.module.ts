import { Module, Global, forwardRef } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotUpdate } from './bot.update';
import { OrdersModule } from '../orders/orders.module';

@Global()
@Module({
  imports: [forwardRef(() => OrdersModule)],
  providers: [BotService, BotUpdate],
  exports: [BotService],
})
export class BotModule {}
