import { addToast } from "@heroui/react";
import {
  type InfiniteData,
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { API_BASE } from "@/config/env";
import { api, getApiErrorMessage } from "@/lib/api";

import { DeleteOrderConfirmModal } from "./DeleteOrderConfirmModal";
import { OrdersHeader } from "./OrdersHeader";
import { OrdersList } from "./OrdersList";
import { OrdersLoadMoreFooter } from "./OrdersLoadMoreFooter";
import { PAGE_SIZE, type OrdersResponse, type OrdersResponseApi, type OrderStatus } from "./types";
import { sanitizeOrderSearch, useDebouncedValue } from "./utils";

export default function DashboardOrders() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<OrderStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<{
    id: number;
    totalAmount: number;
    itemCount: number;
  } | null>(null);

  const debouncedSearch = useDebouncedValue(search, 350);
  const orderId = useMemo(
    () => sanitizeOrderSearch(debouncedSearch),
    [debouncedSearch]
  );

  const params = useMemo(() => {
    const resolved: Record<string, string | number> = {};
    if (status !== "ALL") resolved.status = status;
    if (orderId) resolved.q = orderId;
    return resolved;
  }, [orderId, status]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const ordersQuery = useInfiniteQuery({
    queryKey: ["orders", "my", params],
    queryFn: async ({ pageParam = 1, signal }) => {
      const response = await api.get<OrdersResponseApi>("/orders/my", {
        params: {
          page: pageParam,
          limit: PAGE_SIZE,
          ...params,
        },
        signal,
      });

      const payload = response.data;
      return {
        meta: payload.meta,
        data: payload.data.map((order) => ({
          ...order,
          items: (order.items ?? []).map((item) => ({
            id: item.id,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
            imageUrl: item.product?.imageUrl ?? null,
          })),
        })),
      } satisfies OrdersResponse;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNext ? lastPage.meta.page + 1 : undefined,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (orderId: number) => {
      await api.delete(`/orders/my/${orderId}`);
    },
    onMutate: (orderId) => {
      setDeletingOrderId(orderId);
    },
    onSuccess: (_, orderId) => {
      addToast({
        title: "Order deleted",
        description: "Your pending order was removed successfully.",
        color: "success",
      });
      setDeleteCandidate(null);
      queryClient.setQueriesData<InfiniteData<OrdersResponse>>(
        { queryKey: ["orders", "my"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.filter((order) => order.id !== orderId),
            })),
          };
        }
      );
      void queryClient.invalidateQueries({
        queryKey: ["orders", "my"],
        refetchType: "none",
      });
      void queryClient.invalidateQueries({ queryKey: ["orders", "overview"] });
    },
    onError: (error) => {
      addToast({
        title: "Could not delete order",
        description: getApiErrorMessage(error),
        color: "danger",
      });
    },
    onSettled: () => {
      setDeletingOrderId(null);
    },
  });

  const orders = useMemo(
    () => ordersQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [ordersQuery.data?.pages]
  );
  const hasOrders = orders.length > 0;
  const hasNextPage = ordersQuery.hasNextPage ?? false;
  const isInitialLoading = ordersQuery.isPending && !ordersQuery.data;
  const isInitialError = ordersQuery.isError && !hasOrders;

  const fetchNextPage = ordersQuery.fetchNextPage;
  const isFetchingNextPage = ordersQuery.isFetchingNextPage;

  useEffect(() => {
    if (!hasNextPage) return;
    if (isFetchingNextPage) return;

    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (!hasNextPage) return;
        if (isFetchingNextPage) return;
        void fetchNextPage();
      },
      { root: null, rootMargin: "300px", threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <section className="space-y-6">
      <OrdersHeader
        status={status}
        onStatusChange={setStatus}
        search={search}
        onSearchChange={setSearch}
        isRefreshing={ordersQuery.isRefetching}
        isLoadingMore={ordersQuery.isFetchingNextPage}
        onRefresh={() => void ordersQuery.refetch()}
      />

      <OrdersList
        orders={orders}
        isInitialLoading={isInitialLoading}
        isInitialError={isInitialError}
        error={ordersQuery.error}
        imageBase={API_BASE}
        deletingOrderId={deletingOrderId}
        isDeletePending={deleteMutation.isPending}
        onRetry={() => void ordersQuery.refetch()}
        onRequestDelete={(candidate) => setDeleteCandidate(candidate)}
      />

      <OrdersLoadMoreFooter
        hasOrders={hasOrders}
        hasNextPage={hasNextPage}
        isFetchingNextPage={ordersQuery.isFetchingNextPage}
        isFetchNextPageError={ordersQuery.isFetchNextPageError}
        onFetchNextPage={() => void ordersQuery.fetchNextPage()}
        sentinelRef={sentinelRef}
      />

      <DeleteOrderConfirmModal
        candidate={deleteCandidate}
        isDeleting={deleteMutation.isPending}
        onCancel={() => setDeleteCandidate(null)}
        onConfirm={() => {
          if (!deleteCandidate) return;
          deleteMutation.mutate(deleteCandidate.id);
        }}
      />
    </section>
  );
}
