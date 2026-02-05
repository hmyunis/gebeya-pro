import { Injectable, Logger } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Context, Telegraf, Markup } from 'telegraf';
import { ConfigService } from '@nestjs/config';
import { Order } from '../orders/entities/order.entity';
import * as fs from 'fs';
import * as path from 'path';

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
      .map((item) => {
        const formattedPrice = Number(item.price).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        return `- ${item.quantity}x ${item.productName} (${formattedPrice} Birr)`;
      })
      .join('\n');

    const formattedTotal = Number(order.totalAmount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const message = `
📦 <b>New Order #${order.id}</b>
👤 User: ${order.user.firstName} (@${order.user.username || 'N/A'})
💰 Total: ${formattedTotal} Birr
📍 Address: ${order.shippingAddress}
${order.receiptUrl ? '🧾 Receipt: attached below' : '🧾 Receipt: (none)'}

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

    const receiptFilePath = this.resolveReceiptFilePath(order.receiptUrl);
    if (!receiptFilePath) {
      return;
    }

    try {
      await this.bot.telegram.sendDocument(
        adminId,
        {
          source: fs.createReadStream(receiptFilePath),
          filename: path.basename(receiptFilePath),
        },
        {
          caption: `🧾 Receipt for Order #${order.id}`,
        },
      );
    } catch (error) {
      const err = error as Error;
      this.logger.warn(
        `Failed to send receipt for order #${order.id}: ${err.message}`,
      );
    }
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

  private resolveReceiptFilePath(
    receiptUrl: string | null | undefined,
  ): string | null {
    if (!receiptUrl) return null;
    if (!receiptUrl.startsWith('/uploads/receipts/')) return null;

    const relative = receiptUrl.replace(/^\//, '');
    const resolved = path.resolve(process.cwd(), relative);
    const allowedRoot =
      path.resolve(process.cwd(), 'uploads', 'receipts') + path.sep;
    if (!resolved.startsWith(allowedRoot)) return null;
    if (!fs.existsSync(resolved)) return null;
    return resolved;
  }
}
