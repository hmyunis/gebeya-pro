import { useEffect, useRef } from "react";
import { Card, CardHeader, CardBody, addToast } from "@heroui/react";
import { api } from "../../lib/api";
import { useNavigate } from "react-router-dom";

// Define the type for the Telegram user object
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
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-zinc-950">
      <Card className="w-full max-w-md p-4">
        <CardHeader className="flex flex-col gap-1 pb-4 text-center">
          <h1 className="text-2xl font-bold">Admin Login</h1>
          <p className="text-sm text-default-500">Access your store dashboard</p>
        </CardHeader>
        <CardBody className="flex items-center justify-center py-8">
          <div ref={telegramWrapperRef}></div>
          <p className="mt-4 text-xs text-default-400">
            Only Admins can access this panel.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
