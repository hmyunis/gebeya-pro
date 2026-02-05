import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import type { Product } from "../types";
import { api, getApiErrorMessage } from "@/lib/api";

type ProductsState = {
  products: Product[];
  resultCount: number;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
};

export function useProducts(baseUrl: string, queryString: string): ProductsState {
  const url = useMemo(() => {
    const suffix = queryString ? `?${queryString}` : "";
    return `${baseUrl}/v1/products${suffix}`;
  }, [baseUrl, queryString]);

  const [debouncedUrl, setDebouncedUrl] = useState(url);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedUrl(url), 300);
    return () => window.clearTimeout(timeoutId);
  }, [url]);

  const query = useQuery({
    queryKey: ["products", debouncedUrl],
    queryFn: async ({ signal }) => {
      const response = await api.get(debouncedUrl, { signal });
      const payload: any = response.data;
      const data = Array.isArray(payload) ? payload : payload?.data;
      const meta = payload?.meta ?? {};

      const items = Array.isArray(data) ? (data as Product[]) : [];
      const total = typeof meta.total === "number" ? meta.total : items.length;
      return { items, total };
    },
    staleTime: 10_000,
  });

  const reload = useCallback(() => {
    void query.refetch();
  }, [query.refetch]);

  return {
    products: query.data?.items ?? [],
    resultCount: query.data?.total ?? 0,
    isLoading: query.isPending,
    error: query.error ? getApiErrorMessage(query.error) : null,
    reload,
  };
}
