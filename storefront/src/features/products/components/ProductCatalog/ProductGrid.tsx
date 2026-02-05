import { Button } from "@heroui/react";

import type { Product } from "@/features/products/types";
import { ProductCard } from "./ProductCard";

export function ProductGrid({
  products,
  isLoading,
  error,
  imageBase,
  onRetry,
}: {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  imageBase: string;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <div className="glass col-span-full rounded-3xl p-8 text-center">
        <p className="font-display text-xl">We hit a snag</p>
        <p className="text-ink-muted mt-1 text-sm">{error}</p>
        <Button
          size="sm"
          variant="flat"
          className="mt-4 border border-black/10 bg-white/80"
          onPress={onRetry}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
      {isLoading ? (
        Array.from({ length: 8 }).map((_, idx) => (
          <div
            key={`product-skeleton-${idx}`}
            className="glass-strong relative flex h-full flex-col overflow-hidden rounded-2xl"
          >
            <div className="relative aspect-4/5 overflow-hidden bg-black/10 animate-pulse" />
            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="h-4 w-3/4 rounded-full bg-black/10 animate-pulse" />
              <div className="mt-auto flex items-center justify-between">
                <div className="h-4 w-16 rounded-full bg-black/10 animate-pulse" />
                <div className="h-3 w-10 rounded-full bg-black/10 animate-pulse" />
              </div>
              <div className="h-9 rounded-full bg-black/10 animate-pulse" />
            </div>
          </div>
        ))
      ) : products.length === 0 ? (
        <div className="glass col-span-full rounded-3xl p-8 text-center">
          <p className="font-display text-xl">No products found</p>
          <p className="text-ink-muted mt-1 text-sm">
            Try adjusting your filters.
          </p>
        </div>
      ) : (
        products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            imageBase={imageBase}
          />
        ))
      )}
    </div>
  );
}

