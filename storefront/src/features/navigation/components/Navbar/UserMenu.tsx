import type { Key } from "react";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Skeleton,
} from "@heroui/react";
import { LayoutDashboard, LogOut } from "lucide-react";

export function UserMenu({
  isAuthenticated,
  isLoading,
  avatarSrc,
  initials,
  displayName,
  onAction,
}: {
  isAuthenticated: boolean;
  isLoading?: boolean;
  avatarSrc: string | null;
  initials: string;
  displayName: string;
  onAction: (key: Key) => void;
}) {
  if (isLoading) {
    return <Skeleton className="h-10 w-10 rounded-full" />;
  }

  if (!isAuthenticated) {
    return (
      <Button
        size="sm"
        variant="flat"
        as="a"
        href="/login"
        className="border border-black/10 bg-white/70 text-[#12141a] shadow-[0_12px_30px_-24px_rgba(16,19,25,0.7)]"
      >
        Login
      </Button>
    );
  }

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <button
          type="button"
          aria-label="User menu"
          className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-white/70 text-[#12141a] shadow-[0_12px_30px_-24px_rgba(16,19,25,0.7)] transition hover:shadow-[0_12px_30px_-18px_rgba(16,19,25,0.6)]"
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={displayName || "User avatar"}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm font-semibold">{initials}</span>
          )}
        </button>
      </DropdownTrigger>

      <DropdownMenu
        aria-label="User menu"
        onAction={onAction}
        className="min-w-[180px]"
      >
        <DropdownItem
          key="dashboard"
          startContent={<LayoutDashboard size={16} />}
        >
          Dashboard
        </DropdownItem>
        <DropdownItem
          key="logout"
          color="danger"
          startContent={<LogOut size={16} />}
        >
          Logout
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
