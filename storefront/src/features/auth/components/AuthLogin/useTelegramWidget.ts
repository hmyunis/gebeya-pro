import { useCallback, useEffect, useRef, useState } from "react";
import { addToast, closeToast } from "@heroui/react";
import { useMutation } from "@tanstack/react-query";

import type { TelegramStatus, TelegramUser } from "./types";
import { isTelegramBotConfigured } from "./utils";
import { loadUser } from "@/features/auth/store/authStore";
import { setAuthToken } from "@/features/auth/utils/token";
import { api, getApiErrorMessage } from "@/lib/api";

type UseTelegramWidgetArgs = {
  apiBase: string;
  telegramBot: string;
  returnTo: string;
};

export function useTelegramWidget({
  apiBase,
  telegramBot,
  returnTo,
}: UseTelegramWidgetArgs) {
  const [status, setStatus] = useState<TelegramStatus>("loading");
  const [attempt, setAttempt] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isHandlingAuthRef = useRef(false);

  const telegramMutation = useMutation({
    mutationFn: async (user: TelegramUser) => {
      const response = await api.post(`${apiBase}/v1/auth/telegram`, user);
      return response.data;
    },
  });

  const retry = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    window.onTelegramAuth = async (user: TelegramUser) => {
      if (isHandlingAuthRef.current) return;
      isHandlingAuthRef.current = true;

      const loadingToastKey = addToast({
        title: "Signing in with Telegram…",
        description: "Finalizing your login.",
        color: "default",
        timeout: 60_000,
      });

      try {
        const payload: any = await telegramMutation.mutateAsync(user);
        const token =
          payload && typeof payload.token === "string" ? payload.token : null;
        if (token) {
          setAuthToken(token);
        }

        let confirmed = false;
        for (const delayMs of [0, 250, 750]) {
          if (delayMs) {
            await new Promise((resolve) => window.setTimeout(resolve, delayMs));
          }
          const loggedInUser = await loadUser({ force: true });
          if (loggedInUser) {
            confirmed = true;
            break;
          }
        }

        if (!confirmed) {
          addToast({
            title: "Login incomplete",
            description:
              "We couldn’t confirm your session. Please retry (and allow cookies if prompted).",
            color: "warning",
          });
          return;
        }

        sessionStorage.removeItem("postLoginRedirect");
        window.location.assign(returnTo);
      } catch (error) {
        addToast({
          title: "Telegram login failed",
          description: getApiErrorMessage(error),
          color: "danger",
        });
      } finally {
        if (loadingToastKey) {
          closeToast(loadingToastKey);
        }
        isHandlingAuthRef.current = false;
      }
    };

    if (!isTelegramBotConfigured(telegramBot)) {
      setStatus("disabled");
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";
    setStatus("loading");

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", telegramBot);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");

    let isCurrent = true;
    let renderCheckTimer: number | null = null;
    let hardFailTimer: number | null = null;

    const clearTimers = () => {
      if (renderCheckTimer) window.clearInterval(renderCheckTimer);
      if (hardFailTimer) window.clearTimeout(hardFailTimer);
      renderCheckTimer = null;
      hardFailTimer = null;
    };

    const hasWidgetRendered = () => container.childElementCount > 0;

    const markError = () => {
      if (!isCurrent) return;
      setStatus("error");
    };

    hardFailTimer = window.setTimeout(() => {
      if (!isCurrent) return;
      if (hasWidgetRendered()) return;
      markError();
    }, 20000);

    script.onload = () => {
      if (!isCurrent) return;

      const startedAt = Date.now();
      renderCheckTimer = window.setInterval(() => {
        if (!isCurrent) return;

        if (hasWidgetRendered()) {
          clearTimers();
          setStatus("ready");
          return;
        }

        if (Date.now() - startedAt > 5000) {
          clearTimers();
          markError();
        }
      }, 200);
    };

    script.onerror = () => {
      if (!isCurrent) return;
      clearTimers();
      markError();
      addToast({
        title: "Telegram unavailable",
        description:
          "Could not load Telegram login. Please use password login or retry.",
        color: "warning",
      });
    };

    container.appendChild(script);

    return () => {
      isCurrent = false;
      clearTimers();
      container.innerHTML = "";
    };
  }, [apiBase, attempt, telegramBot, returnTo]);

  return { status, containerRef, retry };
}
