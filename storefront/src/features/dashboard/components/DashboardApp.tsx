import DashboardPage from "@/features/dashboard/components/DashboardPage";
import RequireAuth from "@/features/auth/components/RequireAuth";
import QueryProvider from "@/app/QueryProvider";
import { HeroUIProvider } from "@heroui/react";
import { I18nProvider } from "@/features/i18n";

export default function DashboardApp() {
  return (
    <I18nProvider>
      <HeroUIProvider>
        <QueryProvider>
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        </QueryProvider>
      </HeroUIProvider>
    </I18nProvider>
  );
}
