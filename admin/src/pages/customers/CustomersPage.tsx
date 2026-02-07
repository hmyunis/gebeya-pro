import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Avatar,
  Button,
  Card,
  CardBody,
  Chip,
  Input,
  Select,
  SelectItem,
  Tooltip,
  useDisclosure,
} from "@heroui/react";
import {
  ArrowsDownUp,
  Eye,
  FunnelSimple,
  MagnifyingGlass,
  UserCircle,
  UsersThree,
  XCircle,
} from "@phosphor-icons/react";
import { api } from "../../lib/api";
import type { CustomerListItem, OrderStatus, PaginatedResponse } from "../../types";
import { getImageUrl } from "../../types";
import { DataTable } from "../../components/table/DataTable";
import { DataTablePagination } from "../../components/table/DataTablePagination";
import CustomerDetailModal from "../../components/customers/CustomerDetailModal";

type AccountStateFilter = "ALL" | "ACTIVE" | "ARCHIVED";
type OrderActivityFilter =
  | "ALL"
  | "NO_ORDERS"
  | "HAS_PENDING"
  | "HAS_APPROVED"
  | "HAS_SHIPPED"
  | "HAS_REJECTED"
  | "HAS_CANCELLED";
type CustomerSortFilter = "NEWEST" | "OLDEST" | "MOST_ORDERS" | "HIGHEST_SPEND" | "LAST_ORDER";

const statusOrder: OrderStatus[] = ["PENDING", "APPROVED", "SHIPPED", "REJECTED", "CANCELLED"];

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

export default function CustomersPage() {
  const detailModal = useDisclosure();
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [accountState, setAccountState] = useState<AccountStateFilter>("ALL");
  const [orderActivity, setOrderActivity] = useState<OrderActivityFilter>("ALL");
  const [sortBy, setSortBy] = useState<CustomerSortFilter>("NEWEST");
  const [customersPage, setCustomersPage] = useState(1);
  const [customersLimit, setCustomersLimit] = useState(10);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setCustomersPage(1);
  }, [search, accountState, orderActivity, sortBy]);

  const customersQuery = useQuery<PaginatedResponse<CustomerListItem>>({
    queryKey: [
      "admin",
      "customers",
      search,
      accountState,
      orderActivity,
      sortBy,
      customersPage,
      customersLimit,
    ],
    queryFn: async () =>
      (
        await api.get("/admin/customers", {
          params: {
            search: search || undefined,
            accountState,
            orderActivity,
            sortBy,
            page: customersPage,
            limit: customersLimit,
          },
        })
      ).data,
  });

  const customers = customersQuery.data?.data ?? [];
  const customersMeta = customersQuery.data?.meta;
  const customersTotalPages = Math.max(1, customersMeta?.totalPages ?? 1);
  const customersOffset =
    ((customersMeta?.page ?? customersPage) - 1) * (customersMeta?.limit ?? customersLimit);

  const totalCustomers = customersMeta?.total ?? 0;
  const totalOrders = customers.reduce(
    (sum, customer) => sum + customer.orderStats.totalOrders,
    0,
  );
  const totalSpend = customers.reduce(
    (sum, customer) => sum + customer.orderStats.totalSpent,
    0,
  );

  const columns = useMemo<ColumnDef<CustomerListItem>[]>(
    () => [
      {
        header: "#",
        cell: ({ row }) => (
          <p className="text-sm text-default-500">{customersOffset + row.index + 1}</p>
        ),
      },
      {
        header: "Customer",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Avatar
              size="sm"
              src={row.original.avatarUrl ? getImageUrl(row.original.avatarUrl) : undefined}
              name={row.original.firstName || "C"}
              icon={!row.original.avatarUrl ? <UserCircle className="h-4 w-4" /> : undefined}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{row.original.firstName || "Unnamed customer"}</p>
              <p className="truncate text-xs text-default-400">
                @{row.original.loginUsername || row.original.username || "no_username"}
              </p>
            </div>
          </div>
        ),
      },
      {
        header: "Status",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <Chip
              size="sm"
              variant="flat"
              color={row.original.isBanned ? "warning" : "success"}
              className="w-fit"
            >
              {row.original.isBanned ? "Archived" : "Active"}
            </Chip>
            <p className="text-xs text-default-400">{row.original.telegramId || "No Telegram"}</p>
          </div>
        ),
      },
      {
        header: "Orders",
        cell: ({ row }) => (
          <div className="space-y-1">
            <Chip size="sm" variant="flat" color="default">
              {row.original.orderStats.totalOrders} total
            </Chip>
            <div className="flex flex-wrap gap-1">
              {statusOrder.map((status) => (
                <Tooltip
                  key={`${row.original.id}-${status}`}
                  content={`${status}: ${row.original.orderStats.statusCounts[status]}`}
                >
                  <Chip size="sm" variant="dot" color={statusColorMap[status]}>
                    {status.slice(0, 1)} {row.original.orderStats.statusCounts[status]}
                  </Chip>
                </Tooltip>
              ))}
            </div>
          </div>
        ),
      },
      {
        header: "Spent",
        cell: ({ row }) => (
          <span className="font-semibold text-primary">
            {formatBirr(row.original.orderStats.totalSpent)} Birr
          </span>
        ),
      },
      {
        header: "Last Order",
        cell: ({ row }) => (
          <span className="text-xs text-default-500">
            {formatDate(row.original.orderStats.lastOrderAt)}
          </span>
        ),
      },
      {
        header: "Actions",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="flat"
            startContent={<Eye className="h-3.5 w-3.5" />}
            onPress={() => {
              setSelectedCustomerId(row.original.id);
              detailModal.onOpen();
            }}
          >
            Details
          </Button>
        ),
      },
    ],
    [customersOffset, detailModal],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <UsersThree className="h-6 w-6 text-primary" />
              Customers
            </h1>
            <p className="text-sm text-default-500">
              Manage customer profiles, status-specific order counts, and deep reports.
            </p>
          </div>
          <Button
            variant="light"
            startContent={<XCircle className="h-4 w-4" />}
            onPress={() => {
              setSearchInput("");
              setSearch("");
              setAccountState("ALL");
              setOrderActivity("ALL");
              setSortBy("NEWEST");
            }}
            isDisabled={
              !searchInput &&
              accountState === "ALL" &&
              orderActivity === "ALL" &&
              sortBy === "NEWEST"
            }
          >
            Reset Filters
          </Button>
        </div>

        <Card className="border border-default-200 shadow-none">
          <CardBody className="space-y-3 p-4">
            <div className="grid gap-3 lg:grid-cols-12">
              <Input
                className="lg:col-span-5"
                label="Search"
                labelPlacement="outside"
                placeholder="Name, username, telegram ID, customer ID..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                startContent={<MagnifyingGlass className="h-4 w-4 text-default-400" />}
              />

              <Select
                className="lg:col-span-2"
                label="Account"
                labelPlacement="outside"
                selectedKeys={new Set([accountState])}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0];
                  if (!value) return;
                  setAccountState(String(value) as AccountStateFilter);
                }}
                startContent={<FunnelSimple className="h-4 w-4 text-default-400" />}
              >
                <SelectItem key="ALL">All</SelectItem>
                <SelectItem key="ACTIVE">Active</SelectItem>
                <SelectItem key="ARCHIVED">Archived</SelectItem>
              </Select>

              <Select
                className="lg:col-span-3"
                label="Order Activity"
                labelPlacement="outside"
                selectedKeys={new Set([orderActivity])}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0];
                  if (!value) return;
                  setOrderActivity(String(value) as OrderActivityFilter);
                }}
                startContent={<FunnelSimple className="h-4 w-4 text-default-400" />}
              >
                <SelectItem key="ALL">All customers</SelectItem>
                <SelectItem key="NO_ORDERS">No orders</SelectItem>
                <SelectItem key="HAS_PENDING">Has pending orders</SelectItem>
                <SelectItem key="HAS_APPROVED">Has approved orders</SelectItem>
                <SelectItem key="HAS_SHIPPED">Has shipped orders</SelectItem>
                <SelectItem key="HAS_REJECTED">Has rejected orders</SelectItem>
                <SelectItem key="HAS_CANCELLED">Has cancelled orders</SelectItem>
              </Select>

              <Select
                className="lg:col-span-2"
                label="Sort"
                labelPlacement="outside"
                selectedKeys={new Set([sortBy])}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0];
                  if (!value) return;
                  setSortBy(String(value) as CustomerSortFilter);
                }}
                startContent={<ArrowsDownUp className="h-4 w-4 text-default-400" />}
              >
                <SelectItem key="NEWEST">Newest</SelectItem>
                <SelectItem key="OLDEST">Oldest</SelectItem>
                <SelectItem key="MOST_ORDERS">Most orders</SelectItem>
                <SelectItem key="HIGHEST_SPEND">Highest spend</SelectItem>
                <SelectItem key="LAST_ORDER">Recent orders first</SelectItem>
              </Select>
            </div>

            <div className="grid gap-2 rounded-lg bg-default-50 p-3 text-xs sm:grid-cols-3">
              <p className="text-default-600">
                <span className="font-semibold text-foreground">{totalCustomers}</span> matching customers
              </p>
              <p className="text-default-600">
                <span className="font-semibold text-foreground">{totalOrders.toLocaleString()}</span> orders in current page
              </p>
              <p className="text-default-600">
                <span className="font-semibold text-foreground">{formatBirr(totalSpend)} Birr</span> spend in current page
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      <DataTable columns={columns} data={customers} isLoading={customersQuery.isLoading} />

      <DataTablePagination
        pagination={{
          count: customersMeta?.total ?? 0,
          page: customersMeta?.page ?? customersPage,
          pageSize: customersMeta?.limit ?? customersLimit,
          totalPages: customersTotalPages,
        }}
        onPageChange={(page) => {
          const bounded = Math.min(Math.max(1, page), customersTotalPages);
          setCustomersPage(bounded);
        }}
        onPageSizeChange={(size) => {
          setCustomersLimit(size);
          setCustomersPage(1);
        }}
      />

      <CustomerDetailModal
        customerId={selectedCustomerId}
        isOpen={detailModal.isOpen}
        onClose={() => {
          detailModal.onClose();
          setSelectedCustomerId(null);
        }}
      />
    </div>
  );
}
