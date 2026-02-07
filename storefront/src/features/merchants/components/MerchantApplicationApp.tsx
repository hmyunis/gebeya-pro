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
  "Electronics",
  "Fashion",
  "Home & Living",
  "Beauty",
  "Groceries",
  "Books",
  "Kids",
  "Other",
];

export default function MerchantApplicationApp() {
  return (
    <Providers>
      <MerchantApplicationContent />
    </Providers>
  );
}

function MerchantApplicationContent() {
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
        title: "Telegram linked",
        description: "Your Telegram account is authorized for the application.",
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
  }, [botConfigured, widgetAttempt]);

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
        title: "Application submitted",
        description:
          "Your merchant application was received. We will notify you after review.",
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
        title: "Submission failed",
        description: error?.response?.data?.message || error.message || "Please try again.",
        color: "danger",
      });
    },
  });

  return (
    <Card className="mx-auto max-w-3xl border border-black/10 bg-white/80 shadow-[0_20px_50px_-30px_rgba(16,19,25,0.6)]">
      <CardBody className="space-y-6 p-6 md:p-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-ink-muted">
            Merchant Application
          </p>
          <h1 className="font-display mt-2 text-3xl leading-tight">
            Start selling on Gebeya Pro
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Submit your details, link Telegram, and we will review your request.
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/70 p-4">
          <p className="text-sm font-semibold">1. Link Telegram</p>
          <p className="mt-1 text-xs text-ink-muted">
            Telegram authorization is required so we can verify your application and notify you.
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
                onPress={() => setWidgetAttempt((value) => value + 1)}
              >
                Retry Telegram Widget
              </Button>
            ) : null}
            {telegramStatus === "disabled" ? (
              <p className="text-sm text-danger">
                Telegram bot is not configured. Please contact support.
              </p>
            ) : null}
            {telegramAuth ? (
              <Chip color="success" variant="flat">
                Linked: {telegramAuth.first_name}
                {telegramAuth.username ? ` (@${telegramAuth.username})` : ""}
              </Chip>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Full name"
            value={fullName}
            onValueChange={setFullName}
            isRequired
          />
          <Input
            label="Phone number"
            value={phoneNumber}
            onValueChange={setPhoneNumber}
            isRequired
          />
        </div>

        <Textarea
          label="Address"
          value={address}
          onValueChange={setAddress}
          minRows={3}
          isRequired
        />

        <div>
          <p className="text-sm font-semibold">2. Choose item types</p>
          <p className="mt-1 text-xs text-ink-muted">
            Select all categories you want to sell.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ITEM_TYPE_OPTIONS.map((option) => {
              const selected = itemTypes.includes(option);
              return (
                <Button
                  key={option}
                  size="sm"
                  variant={selected ? "solid" : "flat"}
                  color={selected ? "primary" : "default"}
                  onPress={() =>
                    setItemTypes((prev) =>
                      prev.includes(option)
                        ? prev.filter((item) => item !== option)
                        : [...prev, option],
                    )
                  }
                >
                  {option}
                </Button>
              );
            })}
          </div>
        </div>

        <Input
          type="file"
          label="Profile picture (optional)"
          accept="image/*"
          onChange={(event) => setProfilePicture(event.target.files?.[0] ?? null)}
        />

        <Button
          color="primary"
          onPress={() => mutation.mutate()}
          isLoading={mutation.isPending}
          isDisabled={!canSubmit}
          className="w-full md:w-auto"
        >
          Submit Application
        </Button>
      </CardBody>
    </Card>
  );
}
