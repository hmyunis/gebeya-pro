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
    <QueryProvider>
      <AuthLoginContent apiBase={apiBase} telegramBot={telegramBot} />
    </QueryProvider>
  );
}

function AuthLoginContent({ apiBase, telegramBot }: AuthLoginProps) {
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

  const submitLabel = mode === "login" ? "Sign in" : "Create account";
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
        title: "Passwords don’t match",
        description: "Please confirm your password again.",
        color: "warning",
      });
      return;
    }

    if (!canSubmit || authMutation.isPending) return;

    const loadingToastKey = addToast({
      title: "Signing in…",
      description: "Please wait while we log you in.",
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
          title: "Login incomplete",
          description:
            "We couldn’t confirm your session. Please retry (and allow cookies if prompted).",
          color: "warning",
        });
        return;
      }

      addToast({
        title: mode === "login" ? "Welcome back" : "Account created",
        description: "Redirecting…",
        color: "success",
      });

      sessionStorage.removeItem("postLoginRedirect");
      window.location.assign(returnTo);
    } catch (error) {
      addToast({
        title: mode === "login" ? "Login failed" : "Signup failed",
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
              className="bg-white/20 text-white backdrop-blur-md hover:bg-white/30"
              startContent={<ArrowLeftIcon />}
            >
              Back
            </Button>
          </div>

          <div className="mt-8 text-center md:mt-0 md:text-left">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-white shadow-inner backdrop-blur-lg">
              <span className="font-display text-2xl font-bold">G</span>
            </div>
            <p className="mb-1 text-[11px] uppercase tracking-[0.35em] opacity-80">
              Account
            </p>
            <h1 className="font-display text-3xl font-medium md:text-4xl">
              {mode === "login" ? "Welcome Back" : "Join Us"}
            </h1>
            <p className="mt-3 text-sm font-light leading-relaxed opacity-90">
              Access your dashboard, manage your settings, and connect with your
              merchant.
            </p>
          </div>

          <div className="hidden text-xs opacity-60 md:block">
            © {new Date().getFullYear()} Gebeya Pro. All rights reserved.
          </div>
        </div>

        <div className="w-full bg-white p-6 md:w-7/12 md:p-10">
          <CardBody className="overflow-visible p-0">
            <div className="mx-auto w-full max-w-md space-y-6">
              {sessionQuery.isPending ? (
                <div className="rounded-2xl border border-black/5 bg-black/5 px-4 py-3 text-center text-xs text-ink-muted">
                  Checking your session…
                </div>
              ) : null}

              <Tabs
                aria-label="Authentication"
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
                  cursor: "bg-[#0f2a4d]",
                  tabContent: "group-data-[selected=true]:text-[#0f2a4d]",
                }}
              >
                <Tab key="login" title="Login" />
                <Tab key="register" title="Sign up" />
              </Tabs>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  isRequired
                  variant="faded"
                  label="Username"
                  placeholder="e.g. abebe"
                  value={username}
                  onValueChange={setUsername}
                  isDisabled={isDisabled}
                  startContent={<UserIcon className="text-default-400" />}
                />
                <Input
                  isRequired
                  variant="faded"
                  label="Password"
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onValueChange={setPassword}
                  isDisabled={isDisabled}
                  startContent={<LockIcon className="text-default-400" />}
                />

                {mode === "register" && (
                  <Input
                    isRequired
                    variant="faded"
                    label="Confirm password"
                    placeholder="••••••••"
                    type="password"
                    value={confirmPassword}
                    onValueChange={setConfirmPassword}
                    isDisabled={isDisabled}
                    startContent={<LockIcon className="text-default-400" />}
                  />
                )}

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  color="primary"
                  isLoading={authMutation.isPending}
                  isDisabled={!canSubmit || isDisabled}
                  className="mt-2 bg-[#12141a] font-medium text-white shadow-lg shadow-black/20"
                >
                  {submitLabel}
                </Button>
              </form>

              <div className="flex items-center gap-3">
                <Divider className="flex-1" />
                <span className="text-[10px] uppercase tracking-widest text-default-400">
                  Or continue with
                </span>
                <Divider className="flex-1" />
              </div>

              <div className="rounded-2xl border border-default-100 bg-default-50/50 p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-sm font-semibold text-default-700">
                  <TelegramIcon className="text-[#229ED9]" />
                  <span>Telegram</span>
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
                    <p className="text-xs text-default-400">Not configured.</p>
                  )}
                  {telegramStatus === "error" && (
                    <>
                      <p className="text-xs text-danger-400">
                        Telegram widget didn’t load.
                      </p>
                      <Button
                        size="sm"
                        variant="flat"
                        className="border border-black/10 bg-white/80"
                        onPress={retryTelegramWidget}
                      >
                        Retry
                      </Button>
                    </>
                  )}
                  {telegramStatus === "ready" && (
                    <p className="text-[10px] text-default-400">
                      Automatic account creation.
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
