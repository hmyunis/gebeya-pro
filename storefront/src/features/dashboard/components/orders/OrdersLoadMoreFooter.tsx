import { Button, Skeleton } from "@heroui/react";
import type { RefObject } from "react";

export function OrdersLoadMoreFooter({
  hasOrders,
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError,
  onFetchNextPage,
  sentinelRef,
}: {
  hasOrders: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  onFetchNextPage: () => void;
  sentinelRef: RefObject<HTMLDivElement | null>;
}) {
  if (!hasOrders) return null;

  return (
    <div className="rounded-3xl border border-black/5 bg-white/70 px-6 py-4 shadow-[0_20px_40px_-28px_rgba(16,19,25,0.45)]">
      {isFetchingNextPage ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-black/5 bg-white/80 p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32 rounded-full" />
                  <Skeleton className="h-3 w-48 rounded-full" />
                </div>
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : isFetchNextPageError ? (
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-ink-muted">Could not load more orders.</p>
          <Button
            size="sm"
            radius="full"
            variant="flat"
            onPress={onFetchNextPage}
            className="border border-black/10 bg-white/70 text-[#12141a]"
          >
            Retry
          </Button>
        </div>
      ) : hasNextPage ? (
        <div className="flex flex-col gap-2 text-center md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-ink-muted">Loading more as you scroll…</p>
          <Button
            size="sm"
            radius="full"
            variant="flat"
            onPress={onFetchNextPage}
            className="border border-black/10 bg-white/70 text-[#12141a]"
          >
            Load more
          </Button>
        </div>
      ) : (
        <p className="text-center text-sm text-ink-muted">You’ve reached the end.</p>
      )}
      <div ref={sentinelRef} className="h-1 w-full" />
    </div>
  );
}
