import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [delayMs, value]);

  return debounced;
}

export function sanitizeOrderSearch(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return /^\d+$/.test(trimmed) ? trimmed : "";
}

