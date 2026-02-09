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
        className="theme-action-soft"
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
          className="theme-action-soft flex h-10 w-10 items-center justify-center overflow-hidden rounded-full transition"
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
