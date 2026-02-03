import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardBody,
  Chip,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ArrowUpRight,
  Basket,
  ChartLineUp,
  ClockCountdown,
  Package,
  ShieldCheck,
  UserCircle,
  XCircle,
} from "@phosphor-icons/react";
import { api } from "../../lib/api";

const formatBirr = (value: number | string) => {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return "0.00";
  return numeric.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function DashboardHome() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: async () =>
      (await api.get('/admin/dashboard-overview', { params: { days: 7, limit: 10 } })).data,
    refetchInterval: 5000,
    staleTime: 4000,
  });

  const stats = dashboard?.stats;
  const totals = dashboard?.statusSummary?.counts ?? {};

  const trendData = dashboard?.salesTrend ?? [];
  const isTrendLoading = isLoading && !trendData.length;

  const statusDonutData = useMemo(() => {
    if (!dashboard?.statusSummary?.counts) return [];
    return Object.entries(dashboard.statusSummary.counts).map(([status, value]) => ({
      name: status,
      value,
    }));
  }, [dashboard?.statusSummary?.counts]);

  const statusColors: Record<string, string> = {
    PENDING: "#f5a524",
    APPROVED: "#006fee",
    SHIPPED: "#17c964",
    REJECTED: "#f31260",
    CANCELLED: "#a1a1aa",
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Revenue"
          value={stats ? `${formatBirr(stats.totalRevenue)} Birr` : "..."}
          loading={isLoading}
          icon={<ChartLineUp className="h-5 w-5 text-primary" />}
          subtitle="All-time revenue"
        />
        <StatsCard
          title="Total Orders"
          value={stats ? stats.totalOrders : "..."}
          loading={isLoading}
          icon={<Basket className="h-5 w-5 text-default-500" />}
          subtitle="All statuses"
        />
        <StatsCard
          title="Pending Orders"
          value={stats ? stats.pendingOrders : "..."}
          loading={isLoading}
          icon={<ClockCountdown className="h-5 w-5 text-warning" />}
          subtitle="Awaiting approval"
        />
        <StatsCard
          title="Active Orders"
          value={(totals.APPROVED ?? 0) + (totals.SHIPPED ?? 0)}
          loading={isLoading}
          icon={<ShieldCheck className="h-5 w-5 text-success" />}
          subtitle="Approved + shipped"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardBody className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-default-500">Sales Trend</p>
                <h3 className="text-lg font-semibold">Last 7 days</h3>
              </div>
              <Chip size="sm" variant="flat" color="primary">
                {formatBirr(trendData.reduce((sum: number, item: any) => sum + (Number(item.revenue) || 0), 0))} Birr
              </Chip>
            </div>
            <div className="h-44 min-h-44 min-w-0">
              {isTrendLoading ? (
                <div className="w-full space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString(undefined, { weekday: "short" })
                      }
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis hide />
                    <Tooltip
                      formatter={(value: number | undefined) => `${formatBirr(value ?? 0)} Birr`}
                      labelFormatter={(label) =>
                        new Date(label).toLocaleDateString(undefined, {
                          month: "short",
                          day: "2-digit",
                        })
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#006fee"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <p className="text-xs text-default-500">
              Tracks revenue from non-cancelled orders.
            </p>
          </CardBody>
        </Card>

        <Card className="lg:col-span-3">
          <CardBody className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-default-500">Top Products</p>
                <h3 className="text-lg font-semibold">Best sellers</h3>
              </div>
              <Chip size="sm" variant="flat" color="default">
                Top 10
              </Chip>
            </div>
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="h-48 w-full min-w-0 md:w-44">
                {isLoading ? (
                  <Skeleton className="h-full w-full rounded-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDonutData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {statusDonutData.map((entry) => (
                          <Cell key={entry.name} fill={statusColors[entry.name] || "#a1a1aa"} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number | undefined, name: string | undefined) => [
                          `${value ?? 0} orders`,
                          name ?? "",
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="flex-1">
            <Table aria-label="Top products" removeWrapper>
              <TableHeader>
                <TableColumn>PRODUCT</TableColumn>
                <TableColumn>SOLD</TableColumn>
                <TableColumn>REVENUE</TableColumn>
              </TableHeader>
              <TableBody
                items={dashboard?.topProducts ?? []}
                emptyContent={isLoading ? "Loading..." : "No data"}
              >
                {(item: any) => (
                  <TableRow key={item.productName}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-default-400" />
                        <span className="text-sm font-medium">{item.productName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat" color="primary">
                        {item.quantity}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-semibold text-primary">
                        {formatBirr(item.revenue)} Birr
                      </span>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-default-500">Best Customers</p>
              <h3 className="text-lg font-semibold">Order status breakdown</h3>
            </div>
            <Chip size="sm" variant="flat" color="default">
              Top 10
            </Chip>
          </div>
          <Table aria-label="Best customers" removeWrapper>
            <TableHeader>
              <TableColumn>CUSTOMER</TableColumn>
              <TableColumn>TOTAL</TableColumn>
              <TableColumn>PENDING</TableColumn>
              <TableColumn>APPROVED</TableColumn>
              <TableColumn>SHIPPED</TableColumn>
              <TableColumn>REJECTED</TableColumn>
              <TableColumn>CANCELLED</TableColumn>
            </TableHeader>
            <TableBody
              items={dashboard?.bestCustomers ?? []}
              emptyContent={isLoading ? "Loading..." : "No data"}
            >
              {(item: any) => (
                <TableRow key={item.userId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-default-400" />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{item.firstName}</span>
                        <span className="text-xs text-default-400">@{item.username}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" variant="flat" color="default">
                      {item.totalOrders}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="sm"
                      variant="flat"
                      color="warning"
                      startContent={<ClockCountdown className="h-3 w-3" />}
                    >
                      {item.statusCounts.PENDING}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="sm"
                      variant="flat"
                      color="primary"
                      startContent={<ShieldCheck className="h-3 w-3" />}
                    >
                      {item.statusCounts.APPROVED}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="sm"
                      variant="flat"
                      color="success"
                      startContent={<ArrowUpRight className="h-3 w-3" />}
                    >
                      {item.statusCounts.SHIPPED}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="sm"
                      variant="flat"
                      color="danger"
                      startContent={<XCircle className="h-3 w-3" />}
                    >
                      {item.statusCounts.REJECTED}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="sm"
                      variant="flat"
                      color="default"
                      startContent={<XCircle className="h-3 w-3" />}
                    >
                      {item.statusCounts.CANCELLED}
                    </Chip>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}

function StatsCard({ title, value, loading, icon, subtitle }: any) {
  return (
    <Card className="border border-default-200 bg-content1">
      <CardBody className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-default-400">{title}</p>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-default-100">
            {icon}
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-7 w-28 rounded-lg" />
        ) : (
          <h4 className="text-2xl font-semibold tracking-tight">{value}</h4>
        )}
        <p className="text-xs text-default-500">{subtitle}</p>
      </CardBody>
    </Card>
  );
}
