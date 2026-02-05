import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import type { Category, PriceRange } from "../types";
import { api, getApiErrorMessage } from "@/lib/api";

type ProductFiltersState = {
  categories: Category[];
  priceRanges: PriceRange[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
};

export function useProductFilters(baseUrl: string, queryString: string): ProductFiltersState {
  const url = useMemo(() => {
    const suffix = queryString ? `?${queryString}` : "";
    return `${baseUrl}/v1/products/filters${suffix}`;
  }, [baseUrl, queryString]);

  const [debouncedUrl, setDebouncedUrl] = useState(url);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedUrl(url), 250);
    return () => window.clearTimeout(timeoutId);
  }, [url]);

  const query = useQuery({
    queryKey: ["products", "filters", debouncedUrl],
    queryFn: async () => {
      const response = await api.get(debouncedUrl);
      const payload: any = response.data;
      const categories = Array.isArray(payload?.categories)
        ? (payload.categories as Category[])
        : [];
      const priceRanges = Array.isArray(payload?.priceRanges)
        ? (payload.priceRanges as PriceRange[])
        : [];
      return { categories, priceRanges };
    },
    staleTime: 60_000,
  });

  const reload = useCallback(() => {
    void query.refetch();
  }, [query.refetch]);

  return {
    categories: query.data?.categories ?? [],
    priceRanges: query.data?.priceRanges ?? [],
    isLoading: query.isPending,
    error: query.error ? getApiErrorMessage(query.error) : null,
    reload,
  };
}
