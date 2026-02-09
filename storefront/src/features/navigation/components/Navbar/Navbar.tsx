import { Button, HeroUIProvider, Navbar, NavbarContent, addToast } from "@heroui/react";
import type { Key } from "react";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import { useMutation } from "@tanstack/react-query";
import { MoonStar, Store, SunMedium } from "lucide-react";

import { API_BASE } from "@/config/env";
import { api, getApiErrorMessage } from "@/lib/api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { logout, requireLogin } from "@/features/auth/store/authStore";
import { $cartCount, $cartItems } from "@/features/cart/store/cartStore";
import {
  getAvatarSrc,
  getInitials,
  getUserDisplayName,
} from "@/features/auth/utils/userDisplay";
import OrderModal from "@/features/orders/components/OrderModal";
import { CartIconButton } from "@/features/cart/components/CartIconButton";
import { CartDrawer } from "@/features/cart/components/CartDrawer";
import QueryProvider from "@/app/QueryProvider";
import {
  STOREFRONT_THEME_STORAGE_KEY,
  applyStorefrontTheme,
  resolveStorefrontTheme,
  type StorefrontTheme,
} from "@/features/theme/storefrontTheme";

import { Brand } from "./Brand";
import { UserMenu } from "./UserMenu";

export default function AppNavbar({ showCartButton = true }: { showCartButton?: boolean }) {
  return (
    <HeroUIProvider>
      <QueryProvider>
        <NavbarContentRoot showCartButton={showCartButton} />
      </QueryProvider>
    </HeroUIProvider>
  );
}

function NavbarContentRoot({ showCartButton = true }: { showCartButton?: boolean }) {
  const count = useStore($cartCount);
  const cartItems = useStore($cartItems);
  const { user, authReady } = useAuth();

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const [theme, setTheme] = useState<StorefrontTheme>("light");
  const [themeReady, setThemeReady] = useState(false);

  const items = useMemo(() => Object.values(cartItems), [cartItems]);
  const total = useMemo(
    () => items.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [items]
  );

  const displayName = useMemo(() => getUserDisplayName(user), [user]);
  const initials = useMemo(() => getInitials(displayName), [displayName]);
  const avatarSrc = useMemo(() => getAvatarSrc(user, API_BASE), [user]);
  const showBecomeMerchantCta =
    authReady && String(user?.role ?? "").toLowerCase() !== "merchant";

  const openOrderModal = () => {
    setIsCartOpen(false);
    setIsOrderOpen(true);
  };

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post("/auth/logout");
    },
    onSettled: () => {
      void logout();
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const initialTheme = resolveStorefrontTheme();
    setTheme(initialTheme);
    setThemeReady(true);
    applyStorefrontTheme(initialTheme, { persist: false });

    const onStorage = (event: StorageEvent) => {
      if (event.key !== STOREFRONT_THEME_STORAGE_KEY) return;
      const nextTheme = resolveStorefrontTheme();
      setTheme(nextTheme);
      applyStorefrontTheme(nextTheme, { persist: false });
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!showCartButton) return;
    if (!authReady) return;

    const url = new URL(window.location.href);
    const shouldOpenOrder = url.searchParams.get("openOrder") === "1";
    if (!shouldOpenOrder) return;

    if (items.length === 0) {
      url.searchParams.delete("openOrder");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      return;
    }

    if (user) {
      url.searchParams.delete("openOrder");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      openOrderModal();
    }
  }, [authReady, items.length, showCartButton, user]);

  const handleCheckout = () => {
    if (!user) {
      addToast({
        title: "Login required",
        description: "Please login with Telegram to place your order.",
        color: "warning",
      });
      const url = new URL(window.location.href);
      url.searchParams.set("openOrder", "1");
      setIsCartOpen(false);
      requireLogin(url.pathname + url.search + url.hash);
      return;
    }

    openOrderModal();
  };

  const handleLogout = async () => {
    const serverOk = await logoutMutation
      .mutateAsync()
      .then(() => true)
      .catch((error) => {
        addToast({
          title: "Logout warning",
          description: getApiErrorMessage(error),
          color: "warning",
        });
        return false;
      });

    addToast({
      title: "Logged out",
      description: serverOk
        ? "You have been signed out successfully."
        : "Signed out locally. Please retry if this persists.",
      color: "success",
    });
    window.location.replace("/");
  };

  const handleUserMenuAction = (key: Key) => {
    if (key === "dashboard") {
      window.location.assign("/dashboard");
      return;
    }
    if (key === "logout") {
      void handleLogout();
    }
  };

  const toggleTheme = () => {
    const nextTheme: StorefrontTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyStorefrontTheme(nextTheme);
  };

  const isDarkTheme = themeReady && theme === "dark";
  const themeToggleLabel = isDarkTheme
    ? "Switch to light mode"
    : "Switch to dark mode";

  return (
    <>
      <Navbar
        isBordered
        className="theme-nav fixed top-0 left-0 w-full backdrop-blur-xl"
      >
        <Brand />

        <NavbarContent justify="end" className="gap-1 sm:gap-2">
          <Button
            isIconOnly
            variant="light"
            radius="full"
            aria-label={themeToggleLabel}
            title={themeToggleLabel}
            onPress={toggleTheme}
            className="theme-action-soft"
          >
            {isDarkTheme ? (
              <SunMedium className="h-4 w-4" />
            ) : (
              <MoonStar className="h-4 w-4" />
            )}
          </Button>
          {showBecomeMerchantCta ? (
            <>
              <Button
                as="a"
                href="/merchant/apply"
                size="sm"
                isIconOnly
                aria-label="Apply as merchant"
                className="theme-action-soft sm:hidden"
              >
                <Store className="h-4 w-4" />
              </Button>
              <Button
                as="a"
                href="/merchant/apply"
                size="sm"
                variant="flat"
                className="theme-action-soft hidden sm:inline-flex"
              >
                Become a Merchant
              </Button>
            </>
          ) : null}
          {showCartButton ? (
            <CartIconButton count={count} onPress={() => setIsCartOpen(true)} />
          ) : null}
          <UserMenu
            isAuthenticated={Boolean(user)}
            isLoading={!authReady}
            avatarSrc={avatarSrc}
            initials={initials}
            displayName={displayName}
            onAction={handleUserMenuAction}
          />
        </NavbarContent>
      </Navbar>

      {showCartButton ? (
        <>
          <CartDrawer
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            items={items}
            total={total}
            imageBase={API_BASE}
            onCheckout={handleCheckout}
          />
          <OrderModal
            isOpen={isOrderOpen}
            onClose={() => setIsOrderOpen(false)}
          />
        </>
      ) : null}
    </>
  );
}
