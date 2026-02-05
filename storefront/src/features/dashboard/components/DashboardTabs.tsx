import { Tab, Tabs } from "@heroui/react";
import { LayoutDashboard, Package, Settings } from "lucide-react";
import { useState } from "react";

import DashboardOverview from "@/features/dashboard/components/DashboardOverview";
import DashboardOrders from "@/features/dashboard/components/DashboardOrders";
import DashboardSettings from "@/features/dashboard/components/DashboardSettings";

type DashboardTabKey = "overview" | "orders" | "settings";

const TAB_TITLES: Record<DashboardTabKey, string> = {
  overview: "Overview",
  orders: "Orders",
  settings: "Settings",
};

export default function DashboardTabs() {
  const [selectedKey, setSelectedKey] = useState<DashboardTabKey>("overview");
  const title = TAB_TITLES[selectedKey];

  return (
    <div className="pb-6">
      <div className="flex justify-center">
        <Tabs
          aria-label="Dashboard navigation"
          variant="light"
          radius="full"
          selectedKey={selectedKey}
          onSelectionChange={(key) => setSelectedKey(key as DashboardTabKey)}
          classNames={{
            tabList:
              "bg-white/70 border border-black/10 shadow-[0_16px_40px_-26px_rgba(16,19,25,0.6)]",
            tab: "px-4 py-2 text-sm font-medium",
            tabContent: "group-data-[selected=true]:text-white",
            cursor: "bg-[#12141a]",
          }}
        >
          <Tab
            key="overview"
            title={
              <span className="flex items-center gap-2">
                <LayoutDashboard size={16} />
                Overview
              </span>
            }
          />
          <Tab
            key="orders"
            title={
              <span className="flex items-center gap-2">
                <Package size={16} />
                <span className="hidden sm:inline">Orders</span>
              </span>
            }
          />
          <Tab
            key="settings"
            title={
              <span className="flex items-center gap-2">
                <Settings size={16} />
                <span className="hidden sm:inline">Settings</span>
              </span>
            }
          />
        </Tabs>
      </div>

      <div className="mt-6">
        {selectedKey === "overview" ? (
          <DashboardOverview />
        ) : selectedKey === "orders" ? (
          <DashboardOrders />
        ) : (
          <DashboardSettings title={title} />
        )}
      </div>
    </div>
  );
}
