import type { PriceRange } from "../types";

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCompactNumber(value: number): string {
  return compactFormatter.format(value);
}

export function formatPriceRangeLabel(range: PriceRange): string {
  if (range.label) return range.label;
  if (range.min === range.max) {
    return `${formatCompactNumber(range.min)}`;
  }
  return `${formatCompactNumber(range.min)} - ${formatCompactNumber(range.max)}`;
}

