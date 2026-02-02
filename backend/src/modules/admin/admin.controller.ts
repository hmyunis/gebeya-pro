import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DataSource } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { BotService } from '../bot/bot.service';
import { RolesGuard } from '../../common/guards/roles.guard';

class BroadcastDto {
  message: string;
  target?: 'all' | 'vip';
}

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AdminController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly botService: BotService,
  ) {}

  @Get('dashboard-stats')
  async getStats() {
    const orderRepo = this.dataSource.getRepository(Order);

    const [totalOrders, pendingOrders, totalRevenue] = await Promise.all([
      orderRepo.count(),
      orderRepo.count({ where: { status: OrderStatus.PENDING } }),
      orderRepo
        .createQueryBuilder('order')
        .select('SUM(order.totalAmount)', 'sum')
        .where('order.status != :status', { status: OrderStatus.CANCELLED })
        .getRawOne<{ sum: string | null }>(),
    ]);

    return {
      totalOrders,
      pendingOrders,
      totalRevenue: totalRevenue?.sum ? Number(totalRevenue.sum) : 0,
    };
  }

  @Post('broadcast')
  async broadcastMessage(
    @Body() dto: BroadcastDto,
    @Query('limit') limit?: string,
  ) {
    const userRepo = this.dataSource.getRepository(User);
    const take = limit ? Number.parseInt(limit, 10) : undefined;

    const query = userRepo
      .createQueryBuilder('user')
      .where('user.telegramId IS NOT NULL');

    const users = take
      ? await query.take(take).getMany()
      : await query.getMany();

    let count = 0;
    for (const user of users) {
      await this.botService.notifyUser(user.telegramId, dto.message);
      count += 1;
    }

    return { sentTo: count };
  }
}
