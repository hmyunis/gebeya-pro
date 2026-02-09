import { Button, Checkbox, Radio, RadioGroup } from "@heroui/react";

import type { Category, PriceRange } from "@/features/products/types";
import { formatPriceRangeLabel } from "@/features/products/utils/pricing";
import { useI18n } from "@/features/i18n";

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
  className,
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
  className?: string;
}) {
  const { t } = useI18n();

  return (
    <aside
      className={`glass-strong rounded-3xl p-4 md:p-5 text-xs ${className ?? ""}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.35em] text-ink-muted">
          {t("common.filters")}
        </p>
        <Button
          size="sm"
          variant="flat"
          className="theme-action-soft"
          onPress={onReset}
        >
          {t("common.reset")}
        </Button>
      </div>

      <div className="mt-4 space-y-5">
        <div>
          <p className="text-xs font-semibold">{t("common.category")}</p>
          {isLoading ? (
            <div className="mt-2 space-y-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={`cat-skeleton-${idx}`}
                  className="theme-skeleton h-4 w-28 animate-pulse rounded-full"
                />
              ))}
            </div>
          ) : error ? (
            <div className="mt-2 rounded-2xl border border-rose-200 bg-rose-50/80 p-3 text-[11px] text-rose-700">
              <p>{t("filters.unable")}</p>
              <Button
                size="sm"
                variant="flat"
                className="mt-2 border border-rose-200 bg-rose-50"
                onPress={onRetry}
              >
                {t("common.retry")}
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
          <p className="text-xs font-semibold">{t("common.priceRangeBirr")}</p>
          {isLoading ? (
            <div className="mt-3 space-y-2">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div
                  key={`price-skeleton-${idx}`}
                  className="theme-skeleton h-4 w-32 animate-pulse rounded-full"
                />
              ))}
            </div>
          ) : (
            <RadioGroup
              value={priceBucket}
              onValueChange={onPriceBucketChange}
              className="mt-2"
            >
              <Radio value="all">{t("common.all")}</Radio>
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
