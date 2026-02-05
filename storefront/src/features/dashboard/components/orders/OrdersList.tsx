import { Button, Skeleton } from "@heroui/react";

import { getApiErrorMessage } from "@/lib/api";

import { OrderCard } from "./OrderCard";
import type { CustomerOrder } from "./types";

export function OrdersList({
  orders,
  isInitialLoading,
  isInitialError,
  error,
  imageBase,
  deletingOrderId,
  isDeletePending,
  onRetry,
  onRequestDelete,
}: {
  orders: CustomerOrder[];
  isInitialLoading: boolean;
  isInitialError: boolean;
  error: unknown;
  imageBase: string;
  deletingOrderId: number | null;
  isDeletePending: boolean;
  onRetry: () => void;
  onRequestDelete: (order: {
    id: number;
    totalAmount: number;
    itemCount: number;
  }) => void;
}) {
  if (isInitialLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="rounded-3xl border border-black/5 bg-white/80 p-5 shadow-[0_20px_40px_-28px_rgba(16,19,25,0.45)]"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 rounded-full" />
                <Skeleton className="h-3 w-48 rounded-full" />
              </div>
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
            <div className="mt-4 flex gap-2">
              <Skeleton className="h-7 w-28 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isInitialError) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
        <p className="font-semibold">Could not load orders</p>
        <p className="mt-1 text-sm text-rose-800">{getApiErrorMessage(error)}</p>
        <Button
          size="sm"
          radius="full"
          variant="flat"
          className="mt-4 border border-rose-200 bg-white/70 text-rose-900"
          onPress={onRetry}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-3xl border border-dashed border-black/10 bg-white/70 p-10 text-center">
        <div>
          <p className="font-display text-xl">No orders found</p>
          <p className="text-ink-muted mt-2 text-sm">
            Try changing filters or place your first order.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order, index) => (
        <OrderCard
          key={order.id}
          order={order}
          listNumber={index + 1}
          imageBase={imageBase}
          isDeleting={Boolean(isDeletePending && deletingOrderId === order.id)}
          onRequestDelete={onRequestDelete}
        />
      ))}
    </div>
  );
}

