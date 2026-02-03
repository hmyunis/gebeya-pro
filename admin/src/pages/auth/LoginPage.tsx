import { useEffect, useRef } from "react";
import { Card, CardHeader, CardBody, addToast } from "@heroui/react";
import { api } from "../../lib/api";
import { useNavigate } from "react-router-dom";
import { Package } from "@phosphor-icons/react";

interface TelegramUser {
  id: number;
  first_name: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

declare global {
  interface Window {
    onTelegramAuth: (user: TelegramUser) => void;
  }
}

export default function LoginPage() {
  const telegramWrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME as string | undefined;

    // 1. Create the global callback function
    window.onTelegramAuth = async (user) => {
      try {
        addToast({
          title: "Authenticating...",
          description: "Verifying with server",
        });

        // 2. Send to Backend
        await api.post("/auth/telegram", user);

        addToast({
          title: "Success",
          description: "Logged in successfully",
          color: "success",
        });

        // 3. Redirect
        navigate("/");
      } catch (error) {
        console.error(error);
        addToast({
          title: "Login Failed",
          description: "Could not verify Telegram credentials.",
          color: "danger",
        });
      }
    };

    if (!botName) {
      console.error("Missing VITE_TELEGRAM_BOT_NAME in environment variables.");
      return;
    }

    // 4. Inject the Telegram Script
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", botName);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");

    if (telegramWrapperRef.current) {
      telegramWrapperRef.current.innerHTML = "";
      telegramWrapperRef.current.appendChild(script);
    }
  }, [navigate]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-blue-800 via-indigo-900 to-slate-950 px-4 py-10">
      <Card className="w-full max-w-md p-2">
        <CardHeader className="flex flex-col gap-2 pb-2 text-center">
          <div className="size-12 flex items-center justify-center rounded-lg bg-linear-to-r from-blue-500 via-indigo-500 to-slate-500 shrink-0">
            <Package className="size-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Admin Login</h1>
          <p className="text-sm text-slate-500">Secure access to your store dashboard</p>
        </CardHeader>
        <CardBody className="flex flex-col items-center justify-center gap-4 py-2">
          <div
            ref={telegramWrapperRef}
            className="flex w-full justify-center px-3 py-4"
          />
          <p className="text-xs text-slate-400">
            Only verified admins can access this panel.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
