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
    const dashboardLoginUrl = this.getDashboardLoginUrl();
    const customerName = this.escapeHtml(order.user.firstName || 'Customer');
    const customerUsername = this.escapeHtml(
      order.user.username ? `@${order.user.username}` : 'no_username',
    );
    const safeAddress = this.escapeHtml(order.shippingAddress || 'Not provided');
    const safeDashboardLoginUrl = this.escapeHtml(dashboardLoginUrl);

    const message = `
🛎️ <b>New order received</b>

Order: <b>#${order.id}</b>
Customer: ${customerName} (${customerUsername})
Total: <b>${formattedTotal} Birr</b>
Delivery address: <code>${safeAddress}</code>
Receipt: ${order.receiptUrl ? 'attached below' : 'not provided'}

<b>Next step:</b> Use the buttons below to approve or reject.
Dashboard login: <a href="${safeDashboardLoginUrl}">${safeDashboardLoginUrl}</a>

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
    const dashboardLoginUrl = this.getDashboardLoginUrl();
    const customerName = this.escapeHtml(order.user.firstName || 'Customer');
    const customerUsername = this.escapeHtml(
      order.user.username ? `@${order.user.username}` : 'no_username',
    );
    const safeAddress = this.escapeHtml(order.shippingAddress || 'Not provided');
    const safeDashboardLoginUrl = this.escapeHtml(dashboardLoginUrl);

    const message = `
📦 <b>New order for your store</b>

Order: <b>#${order.id}</b>
Customer: ${customerName} (${customerUsername})
Total: <b>${formattedTotal} Birr</b>
Delivery address: <code>${safeAddress}</code>
Receipt: ${order.receiptUrl ? 'attached below' : 'not provided'}

<b>Action required:</b> log in to your dashboard to review and update this order.
Dashboard login: <a href="${safeDashboardLoginUrl}">${safeDashboardLoginUrl}</a>

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
    const dashboardLoginUrl = this.getDashboardLoginUrl();
    const safeDashboardLoginUrl = this.escapeHtml(dashboardLoginUrl);
    const safeUsername = this.escapeHtml(username);
    const safePassword = this.escapeHtml(password);
    const message = `
🎉 <b>Your merchant account is ready</b>

You can now sign in to the merchant dashboard.
<b>Login URL</b> (same URL used by admins and merchants):
<a href="${safeDashboardLoginUrl}">${safeDashboardLoginUrl}</a>

Username: <code>${safeUsername}</code>
Password: <code>${safePassword}</code>

<b>Next steps:</b>
1. Open the login URL above.
2. Sign in with the credentials.
3. Go to Profile and change your password immediately.

If anything fails, contact support/admin and share this message.
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
    const normalizedStatus = String(status || '').toUpperCase();
    const statusLabel = this.escapeHtml(normalizedStatus || 'UPDATED');
    const followUp =
      normalizedStatus === 'APPROVED'
        ? 'Your order is confirmed and will be prepared soon.'
        : normalizedStatus === 'SHIPPED'
          ? 'Your order is on the way.'
          : normalizedStatus === 'REJECTED'
            ? 'Please contact support if you need help or want to reorder.'
            : normalizedStatus === 'CANCELLED'
              ? 'If this was unexpected, contact support.'
              : 'Thanks for shopping with us.';

    await this.bot.telegram.sendMessage(
      telegramId,
      `ℹ️ <b>Order update</b>\nOrder <b>#${orderId}</b> is now <b>${statusLabel}</b>.\n${this.escapeHtml(
        followUp,
      )}`,
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

  private getDashboardLoginUrl(): string {
    const base = this.getDashboardBaseUrl();
    if (base.toLowerCase().endsWith('/login')) {
      return base;
    }
    return `${base}/login`;
  }

  private getDashboardBaseUrl(): string {
    const directUrl = this.normalizeHttpUrl(
      this.configService.get<string>('DASHBOARD_URL') ?? '',
    );
    if (directUrl) {
      return directUrl;
    }

    const corsOrigins = (this.configService.get<string>('CORS_ORIGINS') ?? '')
      .split(',')
      .map((origin) => this.normalizeHttpUrl(origin))
      .filter((origin): origin is string => Boolean(origin));

    const preferredOrigin =
      corsOrigins.find((origin) => origin.toLowerCase().includes('admin')) ??
      corsOrigins.find((origin) => !origin.includes('localhost')) ??
      corsOrigins[0];

    return preferredOrigin ?? 'http://localhost:5173';
  }

  private normalizeHttpUrl(rawUrl: string): string | null {
    const trimmed = String(rawUrl ?? '').trim();
    if (!trimmed) return null;

    try {
      const parsed = new URL(trimmed);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return null;
      }
      return parsed.toString().replace(/\/$/, '');
    } catch {
      return null;
    }
  }

  private escapeHtml(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
