import { useQuery } from "@tanstack/react-query";
import { Card, CardBody, Skeleton } from "@heroui/react";
import { api } from "../../lib/api";

export default function DashboardHome() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/admin/dashboard-stats');
      return res.data; // { totalOrders, pendingOrders, totalRevenue }
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Total Revenue"
          value={stats ? `${stats.totalRevenue} Birr` : "..."}
          loading={isLoading}
          color="primary"
        />
        <StatsCard
          title="Pending Orders"
          value={stats ? stats.pendingOrders : "..."}
          loading={isLoading}
          color="warning"
        />
        <StatsCard
          title="Total Orders"
          value={stats ? stats.totalOrders : "..."}
          loading={isLoading}
          color="default"
        />
      </div>

      <Card>
        <CardBody className="p-6">
          <h3 className="mb-4 text-lg font-semibold">Recent Activity</h3>
          <p className="text-default-500">Activity Log UI coming soon (Check Backend Phase 6)...</p>
        </CardBody>
      </Card>
    </div>
  );
}

function StatsCard({ title, value, loading, color }: any) {
  const borderClass =
    color === 'primary'
      ? 'border-primary'
      : color === 'warning'
        ? 'border-warning'
        : 'border-default-200';

  return (
    <Card className={`border-t-4 ${borderClass}`}>
      <CardBody>
        <p className="text-sm text-default-500">{title}</p>
        {loading ? (
          <Skeleton className="mt-2 h-8 w-24 rounded-lg" />
        ) : (
          <h4 className="text-3xl font-bold">{value}</h4>
        )}
      </CardBody>
    </Card>
  );
}
