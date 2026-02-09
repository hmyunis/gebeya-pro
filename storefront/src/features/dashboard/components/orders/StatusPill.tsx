import { useI18n } from "@/features/i18n";
import { STATUS_STYLES, type OrderStatus } from "./types";

export function StatusPill({ status }: { status: OrderStatus }) {
  const { t } = useI18n();
  const label =
    status === "PENDING"
      ? t("overview.status.pending")
      : status === "APPROVED"
        ? t("overview.status.approved")
        : status === "SHIPPED"
          ? t("overview.status.shipped")
          : status === "CANCELLED"
            ? t("overview.status.cancelled")
            : t("overview.status.rejected");

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${STATUS_STYLES[status]}`}
    >
      {label}
    </span>
  );
}
