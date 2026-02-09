import {
  Button,
  Card,
  CardBody,
  Divider,
  Input,
  Skeleton,
  Tab,
  Tabs,
  addToast,
  closeToast,
} from "@heroui/react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { ArrowLeftIcon, LockIcon, TelegramIcon, UserIcon } from "./icons";
import type { AuthLoginProps, Mode } from "./types";
import { parseReturnTo } from "./utils";
import { useTelegramWidget } from "./useTelegramWidget";
import { loadUser } from "@/features/auth/store/authStore";
import { setAuthToken } from "@/features/auth/utils/token";
import { api, getApiErrorMessage } from "@/lib/api";
import QueryProvider from "@/app/QueryProvider";
import appLogo from "@/assets/logo.png";
import { I18nProvider, LanguageToggle, useI18n } from "@/features/i18n";

const appLogoSrc = typeof appLogo === "string" ? appLogo : appLogo.src;

async function confirmSession(): Promise<boolean> {
  for (const delayMs of [0, 250, 750]) {
    if (delayMs) {
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }
    const user = await loadUser({ force: true });
    if (user) return true;
  }
  return false;
}

export default function AuthLogin({ apiBase, telegramBot }: AuthLoginProps) {
  return (
    <I18nProvider>
      <QueryProvider>
        <AuthLoginContent apiBase={apiBase} telegramBot={telegramBot} />
      </QueryProvider>
    </I18nProvider>
  );
}

function AuthLoginContent({ apiBase, telegramBot }: AuthLoginProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const returnTo = useMemo(() => parseReturnTo(), []);
  const {
    status: telegramStatus,
    containerRef: telegramContainerRef,
    retry: retryTelegramWidget,
  } = useTelegramWidget({ apiBase, telegramBot, returnTo });

  const sessionQuery = useQuery({
    queryKey: ["auth", "me", "bootstrap", apiBase],
    queryFn: async ({ signal }) => {
      const response = await api.get(`${apiBase}/v1/auth/me`, {
        signal,
        timeout: 4000,
      });
      return response.data;
    },
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });

  useEffect(() => {
    if (!sessionQuery.data) return;
    sessionStorage.removeItem("postLoginRedirect");
    window.location.assign(returnTo);
  }, [returnTo, sessionQuery.data]);

  const submitLabel = mode === "login" ? t("common.signIn") : t("auth.createAccount");
  const endpoint =
    mode === "login" ? "/v1/auth/password" : "/v1/auth/register/password";

  const canSubmit =
    username.trim().length >= 3 &&
    password.length >= 8 &&
    (mode === "login" || confirmPassword.length >= 8) &&
    (mode === "login" || confirmPassword === password);

  const authMutation = useMutation({
    mutationFn: async (payload: { endpoint: string; username: string; password: string }) => {
      const response = await api.post(`${apiBase}${payload.endpoint}`, {
        username: payload.username,
        password: payload.password,
      });
      return response.data;
    },
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (mode === "register" && confirmPassword !== password) {
      addToast({
        title: t("auth.passwordsDontMatch"),
        description: t("auth.confirmPasswordAgain"),
        color: "warning",
      });
      return;
    }

    if (!canSubmit || authMutation.isPending) return;

    const loadingToastKey = addToast({
      title: t("auth.signingIn"),
      description: t("auth.waitWhileLogin"),
      color: "default",
      timeout: 60_000,
    });
    try {
      const payload: any = await authMutation.mutateAsync({
        endpoint,
        username: username.trim(),
        password,
      });
      const token =
        payload && typeof payload.token === "string" ? payload.token : null;
      if (token) {
        setAuthToken(token);
      }

      const ok = await confirmSession();
      if (!ok) {
        addToast({
          title: t("auth.loginIncomplete"),
          description: t("auth.loginIncompleteDesc"),
          color: "warning",
        });
        return;
      }

      addToast({
        title: mode === "login" ? t("auth.welcomeBack") : t("auth.accountCreated"),
        description: t("auth.redirecting"),
        color: "success",
      });

      sessionStorage.removeItem("postLoginRedirect");
      window.location.assign(returnTo);
    } catch (error) {
      addToast({
        title: mode === "login" ? t("auth.loginFailed") : t("auth.signupFailed"),
        description: getApiErrorMessage(error),
        color: "danger",
      });
    } finally {
      if (loadingToastKey) {
        closeToast(loadingToastKey);
      }
    }
  };

  const isDisabled = authMutation.isPending || sessionQuery.isPending;

  return (
    <Card className="w-full max-w-sm overflow-hidden border-none shadow-[0_30px_80px_-40px_rgba(0,0,0,0.3)] md:max-w-4xl">
      <div className="flex flex-col md:flex-row">
        <div className="relative flex w-full flex-col justify-between bg-linear-to-br from-blue-900 via-indigo-800 to-slate-900 p-6 text-white md:w-5/12 md:p-8">
          <div className="flex justify-between md:justify-start">
            <Button
              as="a"
              href="/"
              variant="flat"
              radius="full"
              size="sm"
              className="bg-white/20 text-white mr-2 backdrop-blur-md hover:bg-white/30"
              startContent={<ArrowLeftIcon />}
            >
              {t("common.back")}
            </Button>
            <LanguageToggle />
          </div>

          <div className="mt-8 text-center md:mt-0 md:text-left">
            <img
              src={appLogoSrc}
              alt={t("brand.logoAlt")}
              className="mb-4 inline-flex h-14 w-14 rounded-2xl object-contain shadow-inner"
            />
            <p className="mb-1 text-[11px] uppercase tracking-[0.35em] opacity-80">
              {t("auth.account")}
            </p>
            <h1 className="font-display text-3xl font-medium md:text-4xl">
              {mode === "login" ? t("auth.welcomeBackTitle") : t("auth.joinUs")}
            </h1>
            <p className="mt-3 text-sm font-light leading-relaxed opacity-90">
              {t("auth.authDescription")}
            </p>
          </div>

          <div className="hidden text-xs opacity-60 md:block">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </div>
        </div>

        <div className="theme-form-shell w-full p-6 md:w-7/12 md:p-10">
          <CardBody className="overflow-visible p-0">
            <div className="mx-auto w-full max-w-md space-y-6">
              {sessionQuery.isPending ? (
                <div className="theme-card-subtle rounded-2xl px-4 py-3 text-center text-xs text-ink-muted">
                  {t("auth.checkingSession")}
                </div>
              ) : null}

              <Tabs
                aria-label={t("auth.authentication")}
                color="primary"
                variant="underlined"
                fullWidth
                size="lg"
                selectedKey={mode}
                onSelectionChange={(key) => {
                  if (isDisabled) return;
                  const next = String(key) as Mode;
                  setMode(next);
                  setConfirmPassword("");
                }}
                classNames={{
                  cursor: "bg-[color:var(--accent)]",
                  tabContent: "group-data-[selected=true]:text-[color:var(--accent)]",
                }}
              >
                <Tab key="login" title={t("auth.tabLogin")} />
                <Tab key="register" title={t("auth.tabSignup")} />
              </Tabs>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  isRequired
                  variant="bordered"
                  label={t("auth.username")}
                  placeholder={t("auth.usernamePlaceholder")}
                  value={username}
                  onValueChange={setUsername}
                  isDisabled={isDisabled}
                  startContent={<UserIcon className="text-default-400" />}
                  classNames={{ inputWrapper: "theme-field" }}
                />
                <Input
                  isRequired
                  variant="bordered"
                  label={t("auth.password")}
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onValueChange={setPassword}
                  isDisabled={isDisabled}
                  startContent={<LockIcon className="text-default-400" />}
                  classNames={{ inputWrapper: "theme-field" }}
                />

                {mode === "register" && (
                  <Input
                    isRequired
                    variant="bordered"
                    label={t("auth.confirmPassword")}
                    placeholder="••••••••"
                    type="password"
                    value={confirmPassword}
                    onValueChange={setConfirmPassword}
                    isDisabled={isDisabled}
                    startContent={<LockIcon className="text-default-400" />}
                    classNames={{ inputWrapper: "theme-field" }}
                  />
                )}

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  color="primary"
                  isLoading={authMutation.isPending}
                  isDisabled={!canSubmit || isDisabled}
                  className="theme-cta mt-2 font-medium"
                >
                  {submitLabel}
                </Button>
              </form>

              <div className="flex items-center gap-3">
                <Divider className="flex-1" />
                <span className="text-[10px] uppercase tracking-widest text-default-400">
                  {t("common.orContinueWith")}
                </span>
                <Divider className="flex-1" />
              </div>

              <div className="theme-card-subtle rounded-2xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-sm font-semibold text-default-700">
                  <TelegramIcon className="text-[#229ED9]" />
                  <span>{t("common.linkTelegram")}</span>
                </div>

                <div className="mt-4 flex min-h-10 justify-center">
                  {telegramStatus === "loading" && (
                    <Skeleton className="h-10 w-48 rounded-xl" />
                  )}
                  <div
                    ref={telegramContainerRef}
                    className="flex justify-center"
                  />
                </div>

                <div className="mt-2 min-h-[1.5em] space-y-2">
                  {telegramStatus === "disabled" && (
                    <p className="text-xs text-default-400">{t("auth.telegramNotConfigured")}</p>
                  )}
                  {telegramStatus === "error" && (
                    <>
                      <p className="text-xs text-danger-400">
                        {t("auth.telegramWidgetFailed")}
                      </p>
                      <Button
                        size="sm"
                        variant="flat"
                        className="theme-action-soft"
                        onPress={retryTelegramWidget}
                      >
                        {t("common.retry")}
                      </Button>
                    </>
                  )}
                  {telegramStatus === "ready" && (
                    <p className="text-[10px] text-default-400">
                      {t("auth.autoAccountCreation")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardBody>
        </div>
      </div>
    </Card>
  );
}
