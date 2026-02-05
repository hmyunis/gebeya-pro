import DashboardPage from "@/features/dashboard/components/DashboardPage";
import RequireAuth from "@/features/auth/components/RequireAuth";
import QueryProvider from "@/app/QueryProvider";

export default function DashboardApp() {
  return (
    <QueryProvider>
      <RequireAuth>
        <DashboardPage />
      </RequireAuth>
    </QueryProvider>
  );
}
