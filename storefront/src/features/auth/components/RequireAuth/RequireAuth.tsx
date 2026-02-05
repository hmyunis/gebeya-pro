import type { ReactNode } from "react";
import { addToast, closeToast } from "@heroui/react";
import { useEffect, useRef } from "react";

import { getCurrentPathWithQueryAndHash } from "@/lib/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { requireLogin } from "@/features/auth/store/authStore";

export default function RequireAuth({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { user, authReady } = useAuth();
  const hasRedirected = useRef(false);
  const toastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authReady) return;
    if (user) return;
    if (hasRedirected.current) return;

    hasRedirected.current = true;
    requireLogin(getCurrentPathWithQueryAndHash());
  }, [authReady, user]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!authReady) {
      if (toastKeyRef.current) return;
      const key = addToast({
        title: "Checking your session…",
        description: "Just a moment.",
        color: "default",
        timeout: 60_000,
      });
      toastKeyRef.current = typeof key === "string" ? key : String(key);
      return;
    }

    if (toastKeyRef.current) {
      closeToast(toastKeyRef.current);
      toastKeyRef.current = null;
    }
  }, [authReady]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!authReady) return;
    if (!user) return;
    document.documentElement.dataset.dashboardReady = "true";
  }, [authReady, user]);

  useEffect(() => {
    return () => {
      if (!toastKeyRef.current) return;
      closeToast(toastKeyRef.current);
      toastKeyRef.current = null;
    };
  }, []);

  if (!authReady) {
    return fallback ? <>{fallback}</> : null;
  }

  if (!user) {
    return (
      <div className="glass-strong rounded-3xl p-8 text-center">
        <p className="font-display text-xl">Login required</p>
        <p className="text-ink-muted mt-1 text-sm">
          Redirecting you to Telegram login...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
