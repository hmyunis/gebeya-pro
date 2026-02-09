import { useEffect, useMemo, useRef, useState } from "react";
import {
  addToast,
  Button,
  Card,
  CardBody,
  Chip,
  Input,
  Skeleton,
  Textarea,
} from "@heroui/react";
import { useMutation } from "@tanstack/react-query";

import Providers from "@/app/Providers";
import { PUBLIC_TELEGRAM_BOT_NAME } from "@/config/env";
import { api } from "@/lib/api";
import { useI18n } from "@/features/i18n";

type TelegramUser = {
  id: number;
  first_name: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

declare global {
  interface Window {
    onTelegramMerchantApply?: (user: TelegramUser) => void;
  }
}

const ITEM_TYPE_OPTIONS = [
  { value: "Electronics", key: "merchant.item.electronics" },
  { value: "Fashion", key: "merchant.item.fashion" },
  { value: "Home & Living", key: "merchant.item.home" },
  { value: "Beauty", key: "merchant.item.beauty" },
  { value: "Groceries", key: "merchant.item.groceries" },
  { value: "Books", key: "merchant.item.books" },
  { value: "Kids", key: "merchant.item.kids" },
  { value: "Other", key: "merchant.item.other" },
] as const;

export default function MerchantApplicationApp() {
  return (
    <Providers>
      <MerchantApplicationContent />
    </Providers>
  );
}

function MerchantApplicationContent() {
  const { t } = useI18n();
  const telegramRef = useRef<HTMLDivElement | null>(null);
  const [telegramAuth, setTelegramAuth] = useState<TelegramUser | null>(null);
  const [telegramStatus, setTelegramStatus] = useState<
    "loading" | "ready" | "error" | "disabled"
  >("loading");
  const [widgetAttempt, setWidgetAttempt] = useState(0);

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [itemTypes, setItemTypes] = useState<string[]>([]);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);

  const botConfigured =
    PUBLIC_TELEGRAM_BOT_NAME && PUBLIC_TELEGRAM_BOT_NAME !== "YOUR_BOT_NAME";

  useEffect(() => {
    if (!botConfigured) {
      setTelegramStatus("disabled");
      return;
    }

    const container = telegramRef.current;
    if (!container) return;

    window.onTelegramMerchantApply = (user: TelegramUser) => {
      setTelegramAuth(user);
      addToast({
        title: t("merchant.linkedTelegram"),
        description: t("merchant.linkedTelegramDesc"),
        color: "success",
      });
    };

    container.innerHTML = "";
    setTelegramStatus("loading");

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", PUBLIC_TELEGRAM_BOT_NAME);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onTelegramMerchantApply(user)");
    script.setAttribute("data-request-access", "write");

    let isCurrent = true;
    const timeout = window.setTimeout(() => {
      if (!isCurrent) return;
      if (container.childElementCount === 0) {
        setTelegramStatus("error");
      }
    }, 12000);

    script.onload = () => {
      if (!isCurrent) return;
      window.setTimeout(() => {
        if (!isCurrent) return;
        setTelegramStatus(container.childElementCount > 0 ? "ready" : "error");
      }, 300);
    };

    script.onerror = () => {
      if (!isCurrent) return;
      setTelegramStatus("error");
    };

    container.appendChild(script);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeout);
      container.innerHTML = "";
    };
  }, [botConfigured, t, widgetAttempt]);

  const canSubmit = useMemo(
    () =>
      fullName.trim().length > 0 &&
      phoneNumber.trim().length > 0 &&
      address.trim().length > 0 &&
      itemTypes.length > 0 &&
      Boolean(telegramAuth),
    [address, fullName, itemTypes.length, phoneNumber, telegramAuth],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (!telegramAuth) {
        throw new Error("Please authorize your Telegram account first.");
      }

      const formData = new FormData();
      formData.append("fullName", fullName.trim());
      formData.append("phoneNumber", phoneNumber.trim());
      formData.append("address", address.trim());
      formData.append("itemTypes", JSON.stringify(itemTypes));
      formData.append("telegramAuthData", JSON.stringify(telegramAuth));
      if (profilePicture) {
        formData.append("profilePicture", profilePicture);
      }

      return api.post("/merchants/applications", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      addToast({
        title: t("merchant.applicationSubmitted"),
        description: t("merchant.applicationSubmittedDesc"),
        color: "success",
      });
      setFullName("");
      setPhoneNumber("");
      setAddress("");
      setItemTypes([]);
      setProfilePicture(null);
    },
    onError: (error: any) => {
      addToast({
        title: t("merchant.submissionFailed"),
        description: error?.response?.data?.message || error.message || t("order.toast.tryAgain"),
        color: "danger",
      });
    },
  });

  return (
    <Card className="theme-form-shell mx-auto max-w-3xl">
      <CardBody className="space-y-6 p-6 md:p-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-ink-muted">
            {t("merchant.application")}
          </p>
          <h1 className="font-display mt-2 text-3xl leading-tight">
            {t("merchant.startSelling")}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            {t("merchant.intro")}
          </p>
        </div>

        <div className="theme-card-subtle rounded-2xl p-4">
          <p className="text-sm font-semibold">{t("merchant.step1")}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {t("merchant.step1Hint")}
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {telegramStatus === "loading" ? (
              <Skeleton className="h-12 w-56 rounded-xl" />
            ) : null}
            <div ref={telegramRef} />
            {telegramStatus === "error" ? (
              <Button
                size="sm"
                variant="flat"
                className="theme-action-soft"
                onPress={() => setWidgetAttempt((value) => value + 1)}
              >
                {t("merchant.retryWidget")}
              </Button>
            ) : null}
            {telegramStatus === "disabled" ? (
              <p className="text-sm text-danger">
                {t("merchant.botNotConfigured")}
              </p>
            ) : null}
            {telegramAuth ? (
              <Chip color="success" variant="flat">
                {t("merchant.linkedAs", { name: telegramAuth.first_name })}
                {telegramAuth.username ? ` (@${telegramAuth.username})` : ""}
              </Chip>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label={t("merchant.fullName")}
            value={fullName}
            onValueChange={setFullName}
            isRequired
            variant="bordered"
            classNames={{ inputWrapper: "theme-field" }}
          />
          <Input
            label={t("merchant.phoneNumber")}
            value={phoneNumber}
            onValueChange={setPhoneNumber}
            isRequired
            variant="bordered"
            classNames={{ inputWrapper: "theme-field" }}
          />
        </div>

        <Textarea
          label={t("merchant.address")}
          value={address}
          onValueChange={setAddress}
          minRows={3}
          isRequired
          variant="bordered"
          classNames={{ inputWrapper: "theme-field" }}
        />

        <div>
          <p className="text-sm font-semibold">{t("merchant.step2")}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {t("merchant.step2Hint")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ITEM_TYPE_OPTIONS.map((option) => {
              const optionLabel = t(option.key);
              const selected = itemTypes.includes(option.value);
              return (
                <Button
                  key={option.value}
                  size="sm"
                  variant={selected ? "solid" : "flat"}
                  color={selected ? "primary" : "default"}
                  className={selected ? "theme-cta" : "theme-action-soft"}
                  onPress={() =>
                    setItemTypes((prev) =>
                      prev.includes(option.value)
                        ? prev.filter((item) => item !== option.value)
                        : [...prev, option.value],
                    )
                  }
                >
                  {optionLabel}
                </Button>
              );
            })}
          </div>
        </div>

        <Input
          type="file"
          label={t("merchant.profilePicture")}
          accept="image/*"
          variant="bordered"
          classNames={{ inputWrapper: "theme-field" }}
          onChange={(event) => setProfilePicture(event.target.files?.[0] ?? null)}
        />

        <Button
          color="primary"
          onPress={() => mutation.mutate()}
          isLoading={mutation.isPending}
          isDisabled={!canSubmit}
          className="theme-cta w-full md:w-auto"
        >
          {t("merchant.submit")}
        </Button>
      </CardBody>
    </Card>
  );
}
