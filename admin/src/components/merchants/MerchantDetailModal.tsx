import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Avatar,
  Button,
  Card,
  CardBody,
  Chip,
  Divider,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  Select,
  SelectItem,
  Skeleton,
} from "@heroui/react";
import {
  Basket,
  CalendarBlank,
  ClockCounterClockwise,
  ListChecks,
  LockSimpleOpen,
  MapPinLine,
  MoneyWavy,
  Package,
  Prohibit,
  TrendUp,
  UserCircle,
  UsersThree,
} from "@phosphor-icons/react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../../lib/api";
import type {
  MerchantDetailResponse,
  Order,
  OrderStatus,
  PaginatedResponse,
} from "../../types";
import { getImageUrl } from "../../types";
import { DataTable } from "../table/DataTable";
import { DataTablePagination } from "../table/DataTablePagination";

interface MerchantDetailModalProps {
  merchantId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleArchive: (merchantId: number, archived: boolean) => void;
  isTogglingArchive: boolean;
}

type HistoryStatusFilter = "ALL" | OrderStatus;

const historyStatusOptions: Array<{ key: HistoryStatusFilter; label: string }> = [
  { key: "ALL", label: "All statuses" },
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "REJECTED", label: "Rejected" },
  { key: "CANCELLED", label: "Cancelled" },
];

const statusColorMap: Record<
  OrderStatus,
  "default" | "primary" | "success" | "warning" | "danger"
> = {
  PENDING: "warning",
  APPROVED: "primary",
  SHIPPED: "success",
  REJECTED: "danger",
  CANCELLED: "default",
};

const formatBirr = (value: number | string) => {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return "0.00";
  return numeric.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function MerchantDetailModal({
  merchantId,
  isOpen,
  onClose,
  onToggleArchive,
  isTogglingArchive,
}: MerchantDetailModalProps) {
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersLimit, setOrdersLimit] = useState(5);
  const [ordersStatus, setOrdersStatus] = useState<HistoryStatusFilter>("ALL");

  useEffect(() => {
    if (!isOpen) return;
    setShowOrderHistory(false);
    setOrdersPage(1);
    setOrdersLimit(5);
    setOrdersStatus("ALL");
  }, [isOpen, merchantId]);

  useEffect(() => {
    setOrdersPage(1);
  }, [ordersStatus]);

  const detailQuery = useQuery<MerchantDetailResponse>({
    queryKey: ["admin", "merchants", "detail", merchantId],
    queryFn: async () => (await api.get(`/merchants/details/${merchantId}`)).data,
    enabled: isOpen && merchantId !== null,
  });

  const ordersQuery = useQuery<PaginatedResponse<Order>>({
    queryKey: ["admin", "merchants", merchantId, "orders", ordersPage, ordersLimit, ordersStatus],
    queryFn: async () =>
      (
        await api.get(`/merchants/details/${merchantId}/orders`, {
          params: {
            page: ordersPage,
            limit: ordersLimit,
            status: ordersStatus === "ALL" ? undefined : ordersStatus,
          },
        })
      ).data,
    enabled: isOpen && merchantId !== null && showOrderHistory,
  });

  const detail = detailQuery.data;
  const merchant = detail?.merchant;
  const report = detail?.report;
  const orders = ordersQuery.data?.data ?? [];
  const ordersMeta = ordersQuery.data?.meta;
  const ordersTotalPages = Math.max(1, ordersMeta?.totalPages ?? 1);
  const ordersOffset = ((ordersMeta?.page ?? ordersPage) - 1) * (ordersMeta?.limit ?? ordersLimit);

  const orderColumns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        header: "#",
        cell: ({ row }) => (
          <p className="text-sm text-default-500">{ordersOffset + row.index + 1}</p>
        ),
      },
      {
        header: "Order",
        cell: ({ row }) => <span className="font-mono text-default-500">#00{row.original.id}</span>,
      },
      {
        header: "Customer",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{row.original.user.firstName || "Unknown customer"}</p>
            <p className="truncate text-xs text-default-400">
              @{row.original.user.loginUsername || row.original.user.username || "no_username"}
            </p>
          </div>
        ),
      },
      {
        header: "Status",
        cell: ({ row }) => (
          <Chip size="sm" variant="flat" color={statusColorMap[row.original.status]}>
            {row.original.status}
          </Chip>
        ),
      },
      {
        header: "Total",
        cell: ({ row }) => (
          <span className="font-semibold text-primary">{formatBirr(row.original.totalAmount)} Birr</span>
        ),
      },
      {
        header: "Items",
        cell: ({ row }) => <span>{row.original.items.length}</span>,
      },
      {
        header: "Created",
        cell: ({ row }) => <span className="text-xs text-default-500">{formatDate(row.original.createdAt)}</span>,
      },
    ],
    [ordersOffset],
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      placement="center"
      scrollBehavior="inside"
      classNames={{ body: "p-0", header: "p-6 pb-2" }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <span className="text-xl font-bold">Merchant Details</span>
          <span className="text-sm text-default-500">
            Full profile, business metrics, and order performance report.
          </span>
        </ModalHeader>
        <ModalBody className="pb-6">
          {detailQuery.isLoading ? (
            <div className="space-y-4 px-6">
              <Skeleton className="h-24 w-full rounded-xl" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={`summary-${index}`} className="h-20 w-full rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          ) : merchant && report ? (
            <div className="space-y-5 px-6">
              <Card className="border border-default-200 shadow-none">
                <CardBody className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      size="lg"
                      src={merchant.avatarUrl ? getImageUrl(merchant.avatarUrl) : undefined}
                      name={merchant.firstName || "M"}
                      icon={!merchant.avatarUrl ? <UserCircle className="h-6 w-6" /> : undefined}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold">{merchant.firstName || "Unnamed merchant"}</p>
                      <p className="truncate text-sm text-default-500">
                        @{merchant.loginUsername || merchant.username || "no_username"}
                      </p>
                      <p className="truncate text-xs text-default-400">
                        Telegram ID: {merchant.telegramId || "not linked"}
                      </p>
                      <p className="truncate text-xs text-default-400">
                        Phone: {merchant.merchantProfile?.phoneNumber || "not provided"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip size="sm" variant="flat" color={merchant.isBanned ? "warning" : "success"}>
                      {merchant.isBanned ? "Archived" : "Active"}
                    </Chip>
                    <Chip size="sm" variant="flat">
                      Joined {new Date(merchant.createdAt).toLocaleDateString()}
                    </Chip>
                    <Button
                      size="sm"
                      color={merchant.isBanned ? "success" : "warning"}
                      variant="flat"
                      isLoading={isTogglingArchive}
                      startContent={
                        merchant.isBanned ? (
                          <LockSimpleOpen className="h-4 w-4" />
                        ) : (
                          <Prohibit className="h-4 w-4" />
                        )
                      }
                      onPress={() => onToggleArchive(merchant.id, !merchant.isBanned)}
                    >
                      {merchant.isBanned ? "Unarchive" : "Archive"}
                    </Button>
                  </div>
                </CardBody>
              </Card>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <SummaryStat
                  label="Total orders"
                  value={report.totalOrders.toLocaleString()}
                  icon={<Basket className="h-4 w-4 text-primary" />}
                />
                <SummaryStat
                  label="Total revenue"
                  value={`${formatBirr(report.totalRevenue)} Birr`}
                  icon={<MoneyWavy className="h-4 w-4 text-success" />}
                />
                <SummaryStat
                  label="Average order"
                  value={`${formatBirr(report.averageOrderValue)} Birr`}
                  icon={<TrendUp className="h-4 w-4 text-secondary" />}
                />
                <SummaryStat
                  label="Customers served"
                  value={report.customerCount.toLocaleString()}
                  icon={<UsersThree className="h-4 w-4 text-warning" />}
                />
                <SummaryStat
                  label="Total products"
                  value={report.productSummary.totalProducts.toLocaleString()}
                  icon={<Package className="h-4 w-4 text-default-600" />}
                />
                <SummaryStat
                  label="Last order"
                  value={formatDate(report.lastOrderAt)}
                  icon={<CalendarBlank className="h-4 w-4 text-default-600" />}
                />
              </div>

              <Card className="border border-default-200 shadow-none">
                <CardBody className="space-y-3 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-default-500">Merchant order status report</p>
                      <h3 className="text-base font-semibold">Last {report.monthlyTrend.length} months trend</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(report.statusCounts) as OrderStatus[]).map((status) => (
                        <Chip key={status} size="sm" variant="flat" color={statusColorMap[status]}>
                          {status}: {report.statusCounts[status]}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  <div className="h-64 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={report.monthlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.35} />
                        <XAxis dataKey="label" />
                        <YAxis yAxisId="left" allowDecimals={false} />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
                        />
                        <Tooltip
                          formatter={(
                            value: number | string | undefined,
                            name: string | undefined,
                          ) => {
                            const safeValue = value ?? 0;
                            if (name === "totalRevenue") {
                              return [`${formatBirr(Number(safeValue))} Birr`, "Revenue"];
                            }
                            return [`${safeValue}`, "Orders"];
                          }}
                        />
                        <Legend
                          formatter={(value) => (value === "totalRevenue" ? "Revenue (Birr)" : "Orders")}
                        />
                        <Line
                          yAxisId="left"
                          dataKey="orderCount"
                          name="orderCount"
                          type="monotone"
                          stroke="#006fee"
                          strokeWidth={2.5}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                        <Line
                          yAxisId="right"
                          dataKey="totalRevenue"
                          name="totalRevenue"
                          type="monotone"
                          stroke="#17c964"
                          strokeWidth={2.5}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg bg-default-50 p-3">
                      <p className="text-xs font-semibold uppercase text-default-500">Business Profile</p>
                      <p className="mt-1 text-xs text-default-700">
                        Item types: {merchant.merchantProfile?.itemTypes?.join(", ") || "Not specified"}
                      </p>
                      <p className="mt-1 flex items-start gap-1 text-xs text-default-700">
                        <MapPinLine className="mt-0.5 h-3.5 w-3.5 shrink-0 text-default-500" />
                        <span>{merchant.merchantProfile?.address || "Address not provided"}</span>
                      </p>
                    </div>
                    <div className="rounded-lg bg-default-50 p-3">
                      <p className="text-xs font-semibold uppercase text-default-500">Product Snapshot</p>
                      <p className="mt-1 text-xs text-default-700">
                        Active: {report.productSummary.activeProducts} · Inactive:{" "}
                        {report.productSummary.inactiveProducts}
                      </p>
                      <p className="mt-1 text-xs text-default-700">
                        Out of stock: {report.productSummary.outOfStockProducts}
                      </p>
                      <p className="mt-1 text-xs text-default-500">
                        Last product added: {formatDate(report.productSummary.lastProductCreatedAt)}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <div className="grid gap-3 lg:grid-cols-2">
                <Card className="border border-default-200 shadow-none">
                  <CardBody className="space-y-2 p-4">
                    <h3 className="text-sm font-semibold">Top Customers</h3>
                    {report.topCustomers.length ? (
                      <div className="space-y-2">
                        {report.topCustomers.map((customer) => (
                          <div
                            key={`${customer.customerId}-${customer.totalSpent}`}
                            className="rounded-lg border border-default-200 px-3 py-2"
                          >
                            <p className="text-sm font-semibold">{customer.firstName}</p>
                            <p className="text-xs text-default-500">
                              @{customer.loginUsername || customer.username || "no_username"}
                            </p>
                            <p className="text-xs text-default-600">
                              {customer.totalOrders} orders · {formatBirr(customer.totalSpent)} Birr · last{" "}
                              {formatDate(customer.lastOrderAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-default-400">No customer activity yet.</p>
                    )}
                  </CardBody>
                </Card>

                <Card className="border border-default-200 shadow-none">
                  <CardBody className="space-y-2 p-4">
                    <h3 className="text-sm font-semibold">Top Shipping Addresses</h3>
                    {report.topShippingAddresses.length ? (
                      <div className="space-y-1">
                        {report.topShippingAddresses.map((address) => (
                          <p key={address.shippingAddress} className="flex items-start gap-1 text-xs text-default-700">
                            <MapPinLine className="mt-0.5 h-3.5 w-3.5 shrink-0 text-default-500" />
                            <span className="line-clamp-2">
                              {address.shippingAddress} ({address.count})
                            </span>
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-default-400">No shipping addresses yet.</p>
                    )}
                  </CardBody>
                </Card>
              </div>

              <Divider />

              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold">Order History</h3>
                    <p className="text-sm text-default-500">Hidden by default to keep the view focused.</p>
                  </div>
                  <Button
                    variant={showOrderHistory ? "flat" : "solid"}
                    color={showOrderHistory ? "default" : "primary"}
                    startContent={<ClockCounterClockwise className="h-4 w-4" />}
                    onPress={() => setShowOrderHistory((previous) => !previous)}
                  >
                    {showOrderHistory ? "Hide Order History" : "Show Order History"}
                  </Button>
                </div>

                {showOrderHistory ? (
                  <Card className="border border-default-200 shadow-none">
                    <CardBody className="space-y-4 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <Select
                          label="Status"
                          labelPlacement="outside"
                          className="w-full sm:w-56"
                          selectedKeys={new Set([ordersStatus])}
                          onSelectionChange={(keys) => {
                            const value = Array.from(keys)[0];
                            if (!value) return;
                            setOrdersStatus(String(value) as HistoryStatusFilter);
                          }}
                        >
                          {historyStatusOptions.map((statusOption) => (
                            <SelectItem key={statusOption.key}>{statusOption.label}</SelectItem>
                          ))}
                        </Select>
                        <div className="rounded-lg bg-default-50 px-3 py-2 text-xs text-default-500">
                          <p className="flex items-center gap-1">
                            <ListChecks className="h-3.5 w-3.5" />
                            Use status filter and pages to review merchant orders.
                          </p>
                        </div>
                      </div>

                      <DataTable
                        columns={orderColumns}
                        data={orders}
                        isLoading={ordersQuery.isLoading}
                      />

                      <DataTablePagination
                        pagination={{
                          count: ordersMeta?.total ?? 0,
                          page: ordersMeta?.page ?? ordersPage,
                          pageSize: ordersMeta?.limit ?? ordersLimit,
                          totalPages: ordersTotalPages,
                        }}
                        onPageChange={(nextPage) => {
                          const bounded = Math.min(Math.max(1, nextPage), ordersTotalPages);
                          setOrdersPage(bounded);
                        }}
                        onPageSizeChange={(nextLimit) => {
                          setOrdersLimit(nextLimit);
                          setOrdersPage(1);
                        }}
                      />
                    </CardBody>
                  </Card>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="px-6 py-10 text-center text-default-500">
              Unable to load merchant details.
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

function SummaryStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="border border-default-200 shadow-none">
      <CardBody className="space-y-2 p-4">
        <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-default-500">
          {icon}
          {label}
        </p>
        <p className="line-clamp-2 text-sm font-semibold text-default-700">{value}</p>
      </CardBody>
    </Card>
  );
}
