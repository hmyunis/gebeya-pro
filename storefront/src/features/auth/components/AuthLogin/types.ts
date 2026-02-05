export type Mode = "login" | "register";
export type TelegramStatus = "loading" | "ready" | "error" | "disabled";

export type AuthLoginProps = {
  apiBase: string;
  telegramBot: string;
};

export type TelegramUser = {
  id: number;
  first_name: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramUser) => void;
    onTelegramLink?: (user: TelegramUser) => void;
  }
}
