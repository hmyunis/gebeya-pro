const birrFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatBirrAmount(value: number | string): string {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return birrFormatter.format(0);
  }
  return birrFormatter.format(numeric);
}

export function formatBirrLabel(value: number | string): string {
  return `${formatBirrAmount(value)} Birr`;
}

