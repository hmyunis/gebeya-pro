import { Button } from "@heroui/react";
import { Trash2 } from "lucide-react";

import { resolveImageUrl } from "@/lib/images";
import { formatBirrLabel } from "@/lib/money";

import { StatusPill } from "./StatusPill";
import { dateFormatter, timeFormatter, type CustomerOrder } from "./types";

export function OrderCard({
  order,
  listNumber,
  imageBase,
  isDeleting,
  onRequestDelete,
}: {
  order: CustomerOrder;
  listNumber: number;
  imageBase: string;
  isDeleting: boolean;
  onRequestDelete: (order: {
    id: number;
    totalAmount: number;
    itemCount: number;
  }) => void;
}) {
  const createdAt = new Date(order.createdAt);
  const itemCount = order.items?.length ?? 0;
  const canDelete = order.status === "PENDING";

  return (
    <article className="relative rounded-3xl border border-black/5 bg-white/80 p-5 shadow-[0_20px_40px_-28px_rgba(16,19,25,0.45)]">
      <div className="absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-full rounded-br-none bg-linear-to-br from-blue-900 to-slate-800 text-sm font-semibold text-white shadow-[0_12px_30px_-16px_rgba(16,19,25,0.8)]">
        {listNumber}
      </div>

      <div className="flex flex-col gap-3 pl-12 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold">Order #{order.id}</p>
            <StatusPill status={order.status} />
          </div>
          <p className="text-ink-muted mt-1 text-xs">
            {dateFormatter.format(createdAt)} · {timeFormatter.format(createdAt)}{" "}
            · {itemCount} item{itemCount === 1 ? "" : "s"}
          </p>
          {order.shippingAddress ? (
            <p className="text-ink-muted mt-2 text-sm">{order.shippingAddress}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold">
            {formatBirrLabel(order.totalAmount)}
          </div>
          {canDelete ? (
            <Button
              size="sm"
              radius="full"
              variant="flat"
              color="danger"
              startContent={<Trash2 size={16} />}
              isLoading={isDeleting}
              onPress={() =>
                onRequestDelete({
                  id: order.id,
                  totalAmount: order.totalAmount,
                  itemCount,
                })
              }
            >
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(order.items ?? []).slice(0, 6).map((item) => {
          const imageUrl = item.imageUrl
            ? resolveImageUrl(imageBase, item.imageUrl)
            : null;
          return (
            <span
              key={item.id}
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-2 py-1 text-xs"
            >
              <span className="h-5 w-5 overflow-hidden rounded-full bg-black/10">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={item.productName}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-ink-muted">
                    {item.productName.trim().slice(0, 1).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="font-medium">{item.productName}</span>{" "}
              <span className="text-ink-muted">x{item.quantity}</span>
            </span>
          );
        })}
        {(order.items ?? []).length > 6 ? (
          <span className="text-ink-muted text-xs">
            +{(order.items ?? []).length - 6} more
          </span>
        ) : null}
      </div>
    </article>
  );
}

