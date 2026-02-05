import { Button, Checkbox, Radio, RadioGroup } from "@heroui/react";

import type { Category, PriceRange } from "@/features/products/types";
import { formatPriceRangeLabel } from "@/features/products/utils/pricing";

export function ProductFilters({
  categories,
  priceRanges,
  activeCategories,
  onToggleCategory,
  priceBucket,
  onPriceBucketChange,
  isLoading,
  error,
  onReset,
  onRetry,
}: {
  categories: Category[];
  priceRanges: PriceRange[];
  activeCategories: Set<number>;
  onToggleCategory: (categoryId: number, checked: boolean) => void;
  priceBucket: string;
  onPriceBucketChange: (value: string) => void;
  isLoading: boolean;
  error: string | null;
  onReset: () => void;
  onRetry: () => void;
}) {
  return (
    <aside className="glass-strong rounded-3xl p-4 md:p-5 text-xs">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.35em] text-ink-muted">
          Filters
        </p>
        <Button
          size="sm"
          variant="flat"
          className="border border-black/10 bg-white/80"
          onPress={onReset}
        >
          Reset
        </Button>
      </div>

      <div className="mt-4 space-y-5">
        <div>
          <p className="text-xs font-semibold">Category</p>
          {isLoading ? (
            <div className="mt-2 space-y-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={`cat-skeleton-${idx}`}
                  className="h-4 w-28 animate-pulse rounded-full bg-black/10"
                />
              ))}
            </div>
          ) : error ? (
            <div className="mt-2 rounded-2xl border border-rose-200 bg-rose-50/80 p-3 text-[11px] text-rose-700">
              <p>Unable to load filters.</p>
              <Button
                size="sm"
                variant="flat"
                className="mt-2 border border-rose-200 bg-white"
                onPress={onRetry}
              >
                Retry
              </Button>
            </div>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              {categories.map((cat) => (
                <Checkbox
                  key={cat.id}
                  isSelected={activeCategories.has(cat.id)}
                  onValueChange={(checked) => onToggleCategory(cat.id, checked)}
                >
                  {cat.name}
                </Checkbox>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold">Price range (Birr)</p>
          {isLoading ? (
            <div className="mt-3 space-y-2">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div
                  key={`price-skeleton-${idx}`}
                  className="h-4 w-32 animate-pulse rounded-full bg-black/10"
                />
              ))}
            </div>
          ) : (
            <RadioGroup
              value={priceBucket}
              onValueChange={onPriceBucketChange}
              className="mt-2"
            >
              <Radio value="all">All</Radio>
              {priceRanges.map((range) => (
                <Radio key={range.id} value={range.id}>
                  {formatPriceRangeLabel(range)}
                </Radio>
              ))}
            </RadioGroup>
          )}
        </div>
      </div>
    </aside>
  );
}
