import { Button } from "@heroui/react";
import { ArrowLeft } from "lucide-react";

import DashboardTabs from "@/features/dashboard/components/DashboardTabs";

export default function DashboardPage() {
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
            Home
          </Button>
        </div>
        <p className="text-[11px] uppercase tracking-[0.35em] text-ink-muted">
          Your space
        </p>
        <h1 className="font-display mt-3 text-3xl leading-tight md:text-4xl">
          Dashboard
        </h1>
        <p className="text-ink-muted mt-2 text-sm">
          Track orders, manage details, and tailor your experience.
        </p>
      </header>

      <DashboardTabs />
    </section>
  );
}
