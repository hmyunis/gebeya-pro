import { Injectable, Logger } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Context, Telegraf, Markup } from 'telegraf';
import { ConfigService } from '@nestjs/config';
import { Order } from '../orders/entities/order.entity';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly configService: ConfigService,
  ) {}

  async notifyAdminNewOrder(order: Order): Promise<void> {
    const adminId = this.configService.get<string>('TELEGRAM_ADMIN_ID');
    if (!adminId) {
      this.logger.warn(
        'TELEGRAM_ADMIN_ID not configured; skipping admin notification',
      );
      return;
    }

    const itemsList = order.items
      .map((item) => `- ${item.quantity}x ${item.productName}`)
      .join('\n');

    const message = `
📦 <b>New Order #${order.id}</b>
👤 User: ${order.user.firstName} (@${order.user.username || 'N/A'})
💰 Total: $${Number(order.totalAmount).toFixed(2)}
📍 Address: ${order.shippingAddress}

<i>Items:</i>
${itemsList}
    `;

    await this.bot.telegram.sendMessage(adminId, message, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Approve', `approve_order:${order.id}`),
          Markup.button.callback('❌ Reject', `reject_order:${order.id}`),
        ],
      ]),
    });
  }

  async notifyUserStatusChange(
    telegramId: string,
    orderId: number,
    status: string,
  ): Promise<void> {
    await this.bot.telegram.sendMessage(
      telegramId,
      `ℹ️ Your Order #${orderId} is now: <b>${status}</b>`,
      { parse_mode: 'HTML' },
    );
  }

  async notifyUser(telegramId: string, message: string): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(telegramId, message, {
        parse_mode: 'HTML',
      });
    } catch (error) {
      const err = error as Error;
      this.logger.warn(`Failed to send to ${telegramId}: ${err.message}`);
    }
  }
}
