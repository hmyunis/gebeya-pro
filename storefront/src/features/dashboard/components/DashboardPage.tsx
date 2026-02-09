import { Button } from "@heroui/react";
import { ArrowLeft } from "lucide-react";

import DashboardTabs from "@/features/dashboard/components/DashboardTabs";
import { useI18n } from "@/features/i18n";

export default function DashboardPage() {
  const { t } = useI18n();

  return (
    <section className="space-y-8">
      <header className="space-y-6 text-center">
        <div className="flex justify-start">
          <Button
            as="a"
            href="/"
            variant="flat"
            radius="full"
            size="sm"
            startContent={<ArrowLeft size={16} />}
          >
            {t("common.home")}
          </Button>
        </div>
        <p className="text-[11px] uppercase tracking-[0.35em] text-ink-muted">
          {t("dashboard.yourSpace")}
        </p>
        <h1 className="font-display mt-3 text-3xl leading-tight md:text-4xl">
          {t("dashboard.title")}
        </h1>
        <p className="text-ink-muted mt-2 text-sm">
          {t("dashboard.subtitle")}
        </p>
      </header>

      <DashboardTabs />
    </section>
  );
}
