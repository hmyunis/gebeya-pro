import { atom } from "nanostores";
import axios from "axios";

import { clearClientCookies } from "@/lib/cookies";
import { api } from "@/lib/api";
import { getQueryClient } from "@/lib/queryClient";
import { clearCart } from "@/features/cart/store/cartStore";
import { clearAuthToken, getAuthToken } from "@/features/auth/utils/token";

export type AuthUser = {
  firstName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  loginUsername?: string | null;
};

const USER_STORE_KEY = "__GEBEYA_AUTH_USER_STORE__";
const AUTH_READY_STORE_KEY = "__GEBEYA_AUTH_READY_STORE__";

type GlobalStore = typeof globalThis & {
  [USER_STORE_KEY]?: ReturnType<typeof atom<AuthUser | null>>;
  [AUTH_READY_STORE_KEY]?: ReturnType<typeof atom<boolean>>;
};

function getSingletonAtom<T>(key: string, initial: T) {
  const scope = globalThis as GlobalStore;
  const existing = (scope as any)[key];
  if (existing) return existing as ReturnType<typeof atom<T>>;
  const created = atom<T>(initial);
  (scope as any)[key] = created;
  return created;
}

export const $user = getSingletonAtom<AuthUser | null>(USER_STORE_KEY, null);
export const $authReady = getSingletonAtom<boolean>(AUTH_READY_STORE_KEY, false);

export async function loadUser(options: { force?: boolean } = {}): Promise<AuthUser | null> {
  if (typeof window === "undefined") return null;

  try {
    const queryClient = getQueryClient();
    if (options.force) {
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    }

    const data = await queryClient.fetchQuery({
      queryKey: ["auth", "me"],
      queryFn: async ({ signal }) => {
        const response = await api.get<AuthUser>("/auth/me", {
          signal,
          timeout: 5000,
        });
        return response.data as AuthUser;
      },
      staleTime: 15_000,
      retry: false,
      networkMode: "always",
    });
    const user = data && typeof data === "object" ? (data as AuthUser) : null;

    $user.set(user);
    $authReady.set(true);
    return user;
  } catch (error) {
    const token = getAuthToken();
    if (token && axios.isAxiosError(error) && error.response?.status === 401) {
      clearAuthToken();
    }
    $user.set(null);
    $authReady.set(true);
    return null;
  }
}

export async function logout(): Promise<void> {
  if (typeof window === "undefined") return;

  clearAuthToken();
  const queryClient = getQueryClient();
  queryClient.removeQueries({ queryKey: ["auth", "me"] });

  $user.set(null);
  $authReady.set(true);
  clearCart();
  clearClientCookies();
  try {
    localStorage.clear();
  } catch {
    // ignore
  }
  try {
    sessionStorage.clear();
  } catch {
    // ignore
  }
}

export function requireLogin(returnTo: string): void {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem("postLoginRedirect", returnTo);
  } catch {
    // Ignore storage issues and continue.
  }

  const encoded = encodeURIComponent(returnTo);
  window.location.assign(`/login?returnTo=${encoded}`);
}
