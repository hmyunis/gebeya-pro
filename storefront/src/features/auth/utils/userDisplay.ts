import type { AuthUser } from "../store/authStore";

import { resolveImageUrl } from "@/lib/images";

export function getUserDisplayName(user: AuthUser | null): string {
  if (!user) return "";

  const firstName = user.firstName?.trim();
  if (firstName) return firstName;

  const username = user.username?.trim();
  if (username) return username.replace(/^@/, "");

  const loginUsername = user.loginUsername?.trim();
  if (loginUsername) return loginUsername;

  return "";
}

export function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "U";

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function getAvatarSrc(
  user: AuthUser | null,
  imageBase: string
): string | null {
  const avatarUrl = user?.avatarUrl?.trim();
  return resolveImageUrl(imageBase, avatarUrl);
}

