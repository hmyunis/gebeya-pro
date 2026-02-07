import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { validate } from './config/env.validation';
import { DatabaseModule } from './modules/database/database.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { TelegrafModule } from 'nestjs-telegraf';
import { OrdersModule } from './modules/orders/orders.module';
import { BotModule } from './modules/bot/bot.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuditModule } from './modules/audit/audit.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ContactModule } from './modules/contact/contact.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MerchantsModule } from './modules/merchants/merchants.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      cache: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    ScheduleModule.forRoot(),

    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        token: configService.get<string>('TELEGRAM_BOT_TOKEN') ?? '',
      }),
    }),

    // Feature Modules
    DatabaseModule,
    AuditModule,
    UsersModule,
    AuthModule,
    ProductsModule,
    OrdersModule,
    BotModule,
    AdminModule,
    PaymentsModule,
    ContactModule,
    MerchantsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
