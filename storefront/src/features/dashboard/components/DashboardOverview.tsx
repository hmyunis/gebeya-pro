import { Skeleton, addToast } from "@heroui/react";
import { useEffect, useMemo, useRef } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { API_BASE } from "@/config/env";
import { resolveImageUrl } from "@/lib/images";
import { formatBirrLabel } from "@/lib/money";
import { api, getApiErrorMessage } from "@/lib/api";
import { formatLocaleDate, useI18n } from "@/features/i18n";

type OrderStatus =
  | "PENDING"
  | "APPROVED"
  | "SHIPPED"
  | "CANCELLED"
  | "REJECTED";

type OverviewStats = {
  totalOrders: number;
  pendingOrders: number;
  mostBought: {
    productId: number | null;
    productName: string;
    imageUrl: string | null;
    quantity: number;
  } | null;
};

type OverviewOrder = {
  id: number;
  status: OrderStatus;
  createdAt: string;
  totalAmount: number;
  itemCount: number;
  items: Array<{
    productName: string;
    quantity: number;
    imageUrl: string | null;
  }>;
};

type OverviewChartEntry = {
  productId: number | null;
  productName: string;
  imageUrl: string | null;
  quantity: number;
};

type OverviewResponse = {
  stats: OverviewStats;
  orders: OverviewOrder[];
  chart: OverviewChartEntry[];
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-900 border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-900 border-emerald-200",
  SHIPPED: "bg-sky-100 text-sky-900 border-sky-200",
  CANCELLED: "bg-zinc-200 text-zinc-800 border-zinc-300",
  REJECTED: "bg-rose-100 text-rose-900 border-rose-200",
};

const CHART_COLORS = [
  "#0f2a4d",
  "#1e1b4b",
  "#4f46e5",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

function StatusPill({ status }: { status: OrderStatus }) {
  const { t } = useI18n();
  const label =
    status === "PENDING"
      ? t("overview.status.pending")
      : status === "APPROVED"
        ? t("overview.status.approved")
        : status === "SHIPPED"
          ? t("overview.status.shipped")
          : status === "CANCELLED"
            ? t("overview.status.cancelled")
            : t("overview.status.rejected");

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${STATUS_STYLES[status]}`}
    >
      {label}
    </span>
  );
}

export default function DashboardOverview() {
  const { locale, t } = useI18n();
  const lastErrorRef = useRef<string | null>(null);

  const overviewQuery = useQuery({
    queryKey: ["orders", "overview"],
    queryFn: async ({ signal }) => {
      const response = await api.get<OverviewResponse>("/orders/overview", {
        signal,
      });
      return response.data;
    },
    select: (payload) => ({
      stats: payload.stats,
      orders: payload.orders,
      chart: payload.chart,
    }),
    placeholderData: keepPreviousData,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    staleTime: 5000,
  });

  useEffect(() => {
    if (!overviewQuery.error) {
      lastErrorRef.current = null;
      return;
    }

    const message = getApiErrorMessage(overviewQuery.error);
    if (message === lastErrorRef.current) return;
    lastErrorRef.current = message;

    addToast({
      title: t("overview.unavailable"),
      description: message,
      color: "danger",
    });
  }, [overviewQuery.error, t]);

  const stats = overviewQuery.data?.stats ?? null;
  const orders = overviewQuery.data?.orders ?? [];
  const chart = overviewQuery.data?.chart ?? [];
  const isLoading = overviewQuery.isPending && !overviewQuery.data;

  const mostBoughtImage = useMemo(
    () =>
      stats?.mostBought?.imageUrl
        ? resolveImageUrl(API_BASE, stats.mostBought.imageUrl)
        : null,
    [stats?.mostBought?.imageUrl]
  );

  const isEmptyOrders = !isLoading && orders.length === 0;
  const hasChartData = chart.length > 0;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-black/5 bg-white/80 p-5 shadow-[0_20px_40px_-28px_rgba(16,19,25,0.45)]">
          {isLoading || !stats ? (
            <div className="space-y-3">
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-8 w-16 rounded-xl" />
              <Skeleton className="h-3 w-32 rounded-full" />
            </div>
          ) : (
            <>
              <p className="text-[11px] uppercase tracking-[0.35em] text-ink-muted">
                {t("overview.totalOrders")}
              </p>
              <p className="mt-2 text-2xl font-semibold">{stats.totalOrders}</p>
              <p className="text-ink-muted mt-1 text-xs">
                {t("overview.totalOrdersHint")}
              </p>
            </>
          )}
        </div>

        <div className="rounded-3xl border border-black/5 bg-white/80 p-5 shadow-[0_20px_40px_-28px_rgba(16,19,25,0.45)]">
          {isLoading || !stats ? (
            <div className="space-y-3">
              <Skeleton className="h-3 w-28 rounded-full" />
              <Skeleton className="h-8 w-16 rounded-xl" />
              <Skeleton className="h-3 w-36 rounded-full" />
            </div>
          ) : (
            <>
              <p className="text-[11px] uppercase tracking-[0.35em] text-ink-muted">
                {t("overview.pendingOrders")}
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {stats.pendingOrders}
              </p>
              <p className="text-ink-muted mt-1 text-xs">
                {t("overview.pendingOrdersHint")}
              </p>
            </>
          )}
        </div>

        <div className="rounded-3xl border border-black/5 bg-white/80 p-5 shadow-[0_20px_40px_-28px_rgba(16,19,25,0.45)]">
          {isLoading || !stats ? (
            <div className="space-y-3">
              <Skeleton className="h-3 w-36 rounded-full" />
              <Skeleton className="h-10 w-24 rounded-2xl" />
              <Skeleton className="h-3 w-40 rounded-full" />
            </div>
          ) : stats.mostBought ? (
            <>
              <p className="text-[11px] uppercase tracking-[0.35em] text-ink-muted">
                {t("overview.mostBought")}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-2xl bg-black/10">
                  {mostBoughtImage ? (
                    <img
                      src={mostBoughtImage}
                      alt={stats.mostBought.productName}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {stats.mostBought.productName}
                  </p>
                  <p className="text-ink-muted text-xs">
                    {t("overview.itemsOrdered", {
                      count: stats.mostBought.quantity,
                    })}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-[11px] uppercase tracking-[0.35em] text-ink-muted">
                {t("overview.mostBought")}
              </p>
              <p className="mt-2 text-2xl font-semibold">—</p>
              <p className="text-ink-muted mt-1 text-xs">
                {t("overview.unlockHint")}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="rounded-3xl border border-black/5 bg-white/80 p-6 shadow-[0_20px_40px_-28px_rgba(16,19,25,0.45)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-ink-muted">
                {t("overview.recentOrders")}
              </p>
              <h2 className="font-display mt-2 text-2xl">
                {t("overview.trackLatest")}
              </h2>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`order-skeleton-${index}`}
                    className="rounded-2xl border border-black/5 bg-white/70 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32 rounded-full" />
                        <Skeleton className="h-3 w-24 rounded-full" />
                      </div>
                      <Skeleton className="h-6 w-24 rounded-full" />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Skeleton className="h-8 w-8 rounded-xl" />
                      <Skeleton className="h-8 w-8 rounded-xl" />
                      <Skeleton className="h-8 w-8 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            ) : isEmptyOrders ? (
              <div className="rounded-2xl border border-dashed border-black/10 p-6 text-center">
                <p className="font-display text-xl">{t("overview.noOrdersYet")}</p>
                <p className="text-ink-muted mt-1 text-sm">
                  {t("overview.noOrdersHint")}
                </p>
              </div>
            ) : (
              orders.map((order) => {
                const createdAt = new Date(order.createdAt);
                return (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-black/5 bg-white/70 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">
                            {t("overview.order", { id: order.id })}
                          </p>
                          <StatusPill status={order.status} />
                        </div>
                        <p className="text-ink-muted mt-1 text-xs">
                          {formatLocaleDate(createdAt, locale, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}{" "}
                          ·{" "}
                          {formatLocaleDate(createdAt, locale, {
                            hour: "numeric",
                            minute: "2-digit",
                          })}{" "}
                          ·{" "}
                          {order.itemCount === 1
                            ? t("overview.itemCount", { count: order.itemCount })
                            : t("overview.itemCountPlural", { count: order.itemCount })}
                        </p>
                      </div>
                      <div className="text-sm font-semibold">
                        {formatBirrLabel(order.totalAmount)}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {order.items.slice(0, 4).map((item, index) => {
                        const image = item.imageUrl
                          ? resolveImageUrl(API_BASE, item.imageUrl)
                          : null;
                        return (
                          <div
                            key={`${order.id}-${item.productName}-${index}`}
                            className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-2 py-1 text-xs"
                          >
                            <div className="h-6 w-6 overflow-hidden rounded-full bg-black/10">
                              {image ? (
                                <img
                                  src={image}
                                  alt={item.productName}
                                  className="h-full w-full object-cover"
                                />
                              ) : null}
                            </div>
                            <span className="font-medium">
                              {item.productName}
                            </span>
                            <span className="text-ink-muted">
                              x{item.quantity}
                            </span>
                          </div>
                        );
                      })}
                      {order.items.length > 4 ? (
                        <span className="text-ink-muted text-xs">
                          {t("common.more", { count: order.items.length - 4 })}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-black/5 bg-white/80 p-6 shadow-[0_20px_40px_-28px_rgba(16,19,25,0.45)]">
          <p className="text-[11px] uppercase tracking-[0.35em] text-ink-muted">
            {t("overview.approvedPurchases")}
          </p>
          <h2 className="font-display mt-2 text-2xl">
            {t("overview.productFrequency")}
          </h2>
          <p className="text-ink-muted mt-1 text-sm">
            {t("overview.approvedOnly")}
          </p>

          <div className="mt-6 h-64">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Skeleton className="h-44 w-44 rounded-full" />
              </div>
            ) : hasChartData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chart}
                    dataKey="quantity"
                    nameKey="productName"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                  >
                    {chart.map((entry, index) => (
                      <Cell
                        key={`${entry.productId ?? "unknown"}-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | undefined, name: string | undefined) => [
                      t("overview.tooltipItems", { count: value ?? 0 }),
                      name,
                    ]}
                    contentStyle={{
                      borderRadius: "12px",
                      borderColor: "rgba(0,0,0,0.08)",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-black/10 text-center">
                <div>
                  <p className="font-display text-lg">{t("overview.noApproved")}</p>
                  <p className="text-ink-muted mt-1 text-sm">
                    {t("overview.noApprovedHint")}
                  </p>
                </div>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="mt-4 space-y-2">
              <Skeleton className="h-3 w-32 rounded-full" />
              <Skeleton className="h-3 w-24 rounded-full" />
            </div>
          ) : hasChartData ? (
            <div className="mt-4 space-y-2">
              {chart.slice(0, 4).map((entry, index) => (
                <div
                  key={`legend-${entry.productId ?? entry.productName}`}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          CHART_COLORS[index % CHART_COLORS.length],
                      }}
                    />
                    <span className="text-ink-muted">{entry.productName}</span>
                  </div>
                  <span className="font-semibold">{entry.quantity}</span>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
