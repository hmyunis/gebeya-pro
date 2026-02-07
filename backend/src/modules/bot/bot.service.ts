import { Injectable, Logger } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Context, Telegraf, Markup } from 'telegraf';
import { ConfigService } from '@nestjs/config';
import { Order } from '../orders/entities/order.entity';
import * as fs from 'fs';
import * as path from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BotSubscriber } from './entities/bot-subscriber.entity';

type TelegramSourceUser = {
  id?: number | string;
  username?: string;
  first_name?: string;
  last_name?: string;
};

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly configService: ConfigService,
    @InjectRepository(BotSubscriber)
    private readonly subscriberRepo: Repository<BotSubscriber>,
  ) {}

  async registerSubscriber(from: TelegramSourceUser | null | undefined) {
    const telegramIdRaw = from?.id;
    if (telegramIdRaw === undefined || telegramIdRaw === null) {
      return;
    }

    const telegramId = String(telegramIdRaw).trim();
    if (!telegramId) {
      return;
    }

    const now = new Date();
    await this.subscriberRepo
      .createQueryBuilder()
      .insert()
      .into(BotSubscriber)
      .values({
        telegramId,
        username: from?.username ?? null,
        firstName: from?.first_name ?? null,
        lastName: from?.last_name ?? null,
        isActive: true,
        lastSeenAt: now,
      })
      .orUpdate(
        ['username', 'firstName', 'lastName', 'isActive', 'lastSeenAt'],
        ['telegramId'],
      )
      .execute();
  }

  async markSubscriberInactive(telegramId: string) {
    const trimmedTelegramId = String(telegramId ?? '').trim();
    if (!trimmedTelegramId) {
      return;
    }

    await this.subscriberRepo.update(
      { telegramId: trimmedTelegramId },
      { isActive: false },
    );
  }

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

  async notifyMerchantNewOrder(order: Order): Promise<void> {
    const merchantTelegramId = order.merchant?.telegramId;
    if (!merchantTelegramId) {
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
📦 <b>New Merchant Order #${order.id}</b>
👤 Customer: ${order.user.firstName} (@${order.user.username || 'N/A'})
💰 Total: ${formattedTotal} Birr
📍 Address: ${order.shippingAddress}
${order.receiptUrl ? '🧾 Receipt: attached below' : '🧾 Receipt: (none)'}

<i>Items:</i>
${itemsList}
    `;

    await this.bot.telegram.sendMessage(merchantTelegramId, message, {
      parse_mode: 'HTML',
    });

    const receiptFilePath = this.resolveReceiptFilePath(order.receiptUrl);
    if (!receiptFilePath) {
      return;
    }

    try {
      await this.bot.telegram.sendDocument(
        merchantTelegramId,
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
        `Failed to send merchant receipt for order #${order.id}: ${err.message}`,
      );
    }
  }

  async notifyMerchantCredentials(
    telegramId: string,
    username: string,
    password: string,
  ): Promise<void> {
    const message = `
✅ <b>Your merchant account is ready</b>

Username: <code>${username}</code>
Password: <code>${password}</code>

Use these credentials in the merchant dashboard and change your password after first login.
    `;

    await this.bot.telegram.sendMessage(telegramId, message, {
      parse_mode: 'HTML',
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
      await this.sendUserMessage(telegramId, message);
    } catch (error) {
      const err = error as Error;
      this.logger.warn(`Failed to send to ${telegramId}: ${err.message}`);
    }
  }

  async sendUserMessage(
    telegramId: string,
    message: string,
  ): Promise<{ messageId: number }> {
    const response = await this.bot.telegram.sendMessage(telegramId, message, {
      parse_mode: 'HTML',
    });
    return { messageId: response.message_id };
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
