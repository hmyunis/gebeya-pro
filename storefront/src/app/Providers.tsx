import { HeroUIProvider, ToastProvider } from "@heroui/react";
import type { ReactNode } from "react";

import QueryProvider from "@/app/QueryProvider";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <HeroUIProvider>
        <ToastProvider placement="top-right" maxVisibleToasts={4} />
        {children}
      </HeroUIProvider>
    </QueryProvider>
  );
}
