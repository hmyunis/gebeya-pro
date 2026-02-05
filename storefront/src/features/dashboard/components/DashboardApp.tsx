import DashboardPage from "@/features/dashboard/components/DashboardPage";
import RequireAuth from "@/features/auth/components/RequireAuth";
import QueryProvider from "@/app/QueryProvider";
import { HeroUIProvider } from "@heroui/react";

export default function DashboardApp() {
  return (
    <HeroUIProvider>
      <QueryProvider>
        <RequireAuth>
          <DashboardPage />
        </RequireAuth>
      </QueryProvider>
    </HeroUIProvider>
  );
}
