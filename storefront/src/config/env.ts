import { stripTrailingSlash } from "@/lib/url";

const DEFAULT_API_BASE = "http://localhost:3000";

export const PUBLIC_API_BASE: string =
  (import.meta.env.PUBLIC_API_BASE as string | undefined) ?? DEFAULT_API_BASE;

export const API_BASE: string = stripTrailingSlash(PUBLIC_API_BASE);

export const PUBLIC_TELEGRAM_BOT_NAME: string =
  (import.meta.env.PUBLIC_TELEGRAM_BOT_NAME as string | undefined) ??
  "YOUR_BOT_NAME";

export const PUBLIC_CONTACT_EMAIL: string =
  (import.meta.env.PUBLIC_CONTACT_EMAIL as string | undefined) ??
  "contact@gebeya.pro";

export const PUBLIC_SOCIAL_GITHUB_URL: string =
  (import.meta.env.PUBLIC_SOCIAL_GITHUB_URL as string | undefined) ??
  "https://github.com";

export const PUBLIC_SOCIAL_TIKTOK_URL: string =
  (import.meta.env.PUBLIC_SOCIAL_TIKTOK_URL as string | undefined) ??
  "https://www.tiktok.com";

export const PUBLIC_SOCIAL_TELEGRAM_URL: string =
  (import.meta.env.PUBLIC_SOCIAL_TELEGRAM_URL as string | undefined) ??
  (PUBLIC_TELEGRAM_BOT_NAME && PUBLIC_TELEGRAM_BOT_NAME !== "YOUR_BOT_NAME"
    ? `https://t.me/${PUBLIC_TELEGRAM_BOT_NAME}`
    : "https://t.me");
