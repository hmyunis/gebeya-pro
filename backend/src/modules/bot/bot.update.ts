import { Update, Ctx, Action, Start } from 'nestjs-telegraf';
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

  @Start()
  async onStart(@Ctx() ctx: Context) {
    await this.botService.registerSubscriber(ctx.from);
    await ctx.reply(
      '👋 Welcome! You are now subscribed to Gebeya Pro updates.\n\nYou may receive announcements and order notifications here. You can mute or stop this bot anytime from Telegram settings.',
    );
  }

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
    if (order.user.telegramId) {
      await this.botService.notifyUserStatusChange(
        order.user.telegramId,
        orderId,
        'APPROVED',
      );
    }

    await ctx.editMessageText(
      `✅ <b>Order #${orderId} approved</b>\nProcessed by: @${ctx.from?.username ?? 'unknown'}\nCustomer notification has been sent.`,
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
    if (order.user.telegramId) {
      await this.botService.notifyUserStatusChange(
        order.user.telegramId,
        orderId,
        'REJECTED',
      );
    }

    await ctx.editMessageText(
      `❌ <b>Order #${orderId} rejected</b>\nCustomer notification has been sent.`,
      {
        parse_mode: 'HTML',
      },
    );
  }
}
