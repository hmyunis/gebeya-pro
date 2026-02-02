import { z } from 'zod';

export const envSchema = z.object({
  // Server
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),

  DB_HOST: z.string(),
  DB_PORT: z.coerce.number().default(3306),
  DB_USERNAME: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),

  // Security
  JWT_SECRET: z.string().min(10),

  // Telegram
  TELEGRAM_BOT_TOKEN: z.string(),
  TELEGRAM_ADMIN_ID: z.coerce.string(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>) {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    console.error('❌ Invalid Environment Variables:', parsed.error.format());
    throw new Error('Invalid Environment Configuration');
  }
  return parsed.data;
}
