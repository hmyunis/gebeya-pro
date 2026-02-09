import { addToast, closeToast } from "@heroui/react";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import type {
  TelegramStatus,
  TelegramUser,
} from "@/features/auth/components/AuthLogin/types";
import { isTelegramBotConfigured } from "@/features/auth/components/AuthLogin/utils";
import { api, getApiErrorMessage } from "@/lib/api";
import { useI18n } from "@/features/i18n";

type UseTelegramLinkWidgetArgs = {
  telegramBot: string;
  enabled?: boolean;
  onLinked?: () => void | Promise<void>;
};

export function useTelegramLinkWidget({
  telegramBot,
  enabled = true,
  onLinked,
}: UseTelegramLinkWidgetArgs) {
  const { t } = useI18n();
  const [status, setStatus] = useState<TelegramStatus>("loading");
  const [attempt, setAttempt] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isHandlingLinkRef = useRef(false);

  const linkMutation = useMutation({
    mutationFn: async (user: TelegramUser) => {
      const response = await api.post("/auth/telegram/link", user);
      return response.data;
    },
  });
  const onLinkedRef = useRef(onLinked);
  const mutateAsyncRef = useRef(linkMutation.mutateAsync);
  const widgetSignatureRef = useRef<string | null>(null);

  const retry = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    onLinkedRef.current = onLinked;
  }, [onLinked]);

  useEffect(() => {
    mutateAsyncRef.current = linkMutation.mutateAsync;
  }, [linkMutation.mutateAsync]);

  useEffect(() => {
    if (!enabled) {
      setStatus("disabled");
      const container = containerRef.current;
      if (container) container.innerHTML = "";
      widgetSignatureRef.current = null;
      return;
    }

    window.onTelegramLink = async (user: TelegramUser) => {
      if (isHandlingLinkRef.current) return;
      isHandlingLinkRef.current = true;

      const loadingToastKey = addToast({
        title: t("auth.linkingTelegram"),
        description: t("auth.savingTelegram"),
        color: "default",
        timeout: 60_000,
      });

      try {
        await mutateAsyncRef.current(user);
        addToast({
          title: t("auth.telegramLinked"),
          description: t("auth.telegramLinkedDesc"),
          color: "success",
        });
        await onLinkedRef.current?.();
      } catch (error) {
        addToast({
          title: t("auth.linkFailed"),
          description: getApiErrorMessage(error),
          color: "danger",
        });
      } finally {
        if (loadingToastKey) closeToast(loadingToastKey);
        isHandlingLinkRef.current = false;
      }
    };

    if (!isTelegramBotConfigured(telegramBot)) {
      setStatus("disabled");
      const container = containerRef.current;
      if (container) container.innerHTML = "";
      widgetSignatureRef.current = null;
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const signature = `${telegramBot}:${attempt}`;
    if (
      widgetSignatureRef.current === signature &&
      container.childElementCount > 0
    ) {
      setStatus("ready");
      return;
    }

    widgetSignatureRef.current = signature;
    container.innerHTML = "";
    setStatus("loading");

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", telegramBot);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onTelegramLink(user)");
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
        title: t("auth.toast.telegramUnavailable"),
        description: t("auth.telegramUnavailableDescLink"),
        color: "warning",
      });
    };

    container.appendChild(script);

    return () => {
      isCurrent = false;
      clearTimers();
      if (widgetSignatureRef.current !== signature) {
        container.innerHTML = "";
      }
    };
  }, [attempt, enabled, t, telegramBot]);

  return { status, containerRef, retry };
}
