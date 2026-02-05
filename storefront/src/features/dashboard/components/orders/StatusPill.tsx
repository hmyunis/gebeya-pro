import { STATUS_LABELS, STATUS_STYLES, type OrderStatus } from "./types";

export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

