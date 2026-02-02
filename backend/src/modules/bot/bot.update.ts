import { Update, Ctx, Action } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '../orders/entities/order.entity';
import { BotService } from './bot.service';

@Update()
export class BotUpdate {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly botService: BotService,
  ) {}

  @Action(/approve_order:(\d+)/)
  async onApprove(@Ctx() ctx: Context) {
    const adminId = Number.parseInt(process.env.TELEGRAM_ADMIN_ID ?? '', 10);
    if (!Number.isNaN(adminId) && ctx.from?.id !== adminId) {
      return;
    }
    const match = (ctx as Context & { match?: RegExpExecArray }).match;
    const orderId = match ? Number.parseInt(match[1], 10) : NaN;
    if (Number.isNaN(orderId)) {
      return;
    }

    const order = await this.ordersService.updateStatus(
      orderId,
      OrderStatus.APPROVED,
    );
    await this.botService.notifyUserStatusChange(
      order.user.telegramId,
      orderId,
      'APPROVED',
    );

    await ctx.editMessageText(
      `✅ <b>Order #${orderId} Approved</b>\nProcessed by: @${ctx.from?.username ?? 'unknown'}`,
      { parse_mode: 'HTML' },
    );
  }

  @Action(/reject_order:(\d+)/)
  async onReject(@Ctx() ctx: Context) {
    const adminId = Number.parseInt(process.env.TELEGRAM_ADMIN_ID ?? '', 10);
    if (!Number.isNaN(adminId) && ctx.from?.id !== adminId) {
      return;
    }
    const match = (ctx as Context & { match?: RegExpExecArray }).match;
    const orderId = match ? Number.parseInt(match[1], 10) : NaN;
    if (Number.isNaN(orderId)) {
      return;
    }

    const order = await this.ordersService.updateStatus(
      orderId,
      OrderStatus.REJECTED,
    );
    await this.botService.notifyUserStatusChange(
      order.user.telegramId,
      orderId,
      'REJECTED',
    );

    await ctx.editMessageText(`❌ <b>Order #${orderId} Rejected</b>`, {
      parse_mode: 'HTML',
    });
  }
}
