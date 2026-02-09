import { HeroUIProvider, ToastProvider } from "@heroui/react";
import type { ReactNode } from "react";

import QueryProvider from "@/app/QueryProvider";
import { I18nProvider } from "@/features/i18n";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <QueryProvider>
        <HeroUIProvider>
          <ToastProvider placement="top-right" maxVisibleToasts={4} />
          {children}
        </HeroUIProvider>
      </QueryProvider>
    </I18nProvider>
  );
}
