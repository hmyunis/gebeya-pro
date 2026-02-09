import type { Selection } from "@heroui/react";
import { Button, Input, Select, SelectItem } from "@heroui/react";
import { RefreshCcw, Search } from "lucide-react";
import { useI18n } from "@/features/i18n";

import type { OrderStatus } from "./types";

export function OrdersHeader({
  status,
  onStatusChange,
  search,
  onSearchChange,
  isRefreshing,
  isLoadingMore,
  onRefresh,
}: {
  status: OrderStatus | "ALL";
  onStatusChange: (status: OrderStatus | "ALL") => void;
  search: string;
  onSearchChange: (value: string) => void;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  onRefresh: () => void;
}) {
  const { t } = useI18n();

  return (
    <header className="rounded-3xl border border-black/5 bg-white/80 p-5 shadow-[0_20px_40px_-28px_rgba(16,19,25,0.45)]">
      <div>
        <p className="text-[11px] uppercase tracking-[0.35em] text-ink-muted">
          {t("dashboard.orders")}
        </p>
        <h2 className="font-display mt-2 text-2xl">{t("ordersHeader.title")}</h2>
        <p className="text-ink-muted mt-1 text-sm">
          {t("ordersHeader.subtitle")}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
        <div className="space-y-1 sm:col-span-1 lg:col-span-3">
          <label
            className="text-xs font-medium text-ink-muted"
            htmlFor="orders-status"
          >
            {t("ordersHeader.status")}
          </label>
          <Select
            id="orders-status"
            aria-label={t("ordersHeader.orderStatus")}
            selectedKeys={new Set([status])}
            onSelectionChange={(keys: Selection) => {
              if (keys === "all") return;
              const selected = Array.from(keys)[0];
              if (!selected) return;
              onStatusChange(selected as OrderStatus | "ALL");
            }}
            size="sm"
            radius="full"
            variant="flat"
            classNames={{
              base: "w-full",
              trigger:
                "min-h-9 h-9 border border-black/10 bg-white/70 shadow-[0_12px_30px_-24px_rgba(16,19,25,0.7)] data-[open=true]:shadow-[0_12px_30px_-18px_rgba(16,19,25,0.6)]",
              value: "text-sm text-[#12141a]",
              popoverContent: "rounded-2xl border border-black/10",
            }}
          >
            <SelectItem key="ALL">{t("common.all")}</SelectItem>
            <SelectItem key="PENDING">{t("overview.status.pending")}</SelectItem>
            <SelectItem key="APPROVED">{t("overview.status.approved")}</SelectItem>
            <SelectItem key="SHIPPED">{t("overview.status.shipped")}</SelectItem>
            <SelectItem key="CANCELLED">{t("overview.status.cancelled")}</SelectItem>
            <SelectItem key="REJECTED">{t("overview.status.rejected")}</SelectItem>
          </Select>
        </div>

        <div className="space-y-1 sm:col-span-2 lg:col-span-7">
          <label className="text-xs font-medium text-ink-muted" htmlFor="orders-search">
            {t("common.search")}
          </label>
          <Input
            id="orders-search"
            value={search}
            onValueChange={onSearchChange}
            placeholder={t("ordersHeader.searchPlaceholder")}
            variant="flat"
            radius="full"
            size="sm"
            startContent={<Search size={16} className="text-ink-muted" />}
            classNames={{
              base: "w-full",
              inputWrapper:
                "border border-black/10 bg-white/70 shadow-[0_12px_30px_-24px_rgba(16,19,25,0.7)]",
            }}
          />
        </div>

        <div className="space-y-1 sm:col-span-2 lg:col-span-2">
          <span className="text-xs font-medium text-ink-muted"> </span>
          <Button
            size="sm"
            variant="flat"
            radius="full"
            startContent={
              <RefreshCcw
                size={16}
                className={isRefreshing ? "animate-spin" : ""}
              />
            }
            isDisabled={isRefreshing || isLoadingMore}
            onPress={onRefresh}
            className="w-full border border-black/10 bg-white/70 text-[#12141a] shadow-[0_12px_30px_-24px_rgba(16,19,25,0.7)]"
          >
            {t("common.refresh")}
          </Button>
        </div>
      </div>
    </header>
  );
}
