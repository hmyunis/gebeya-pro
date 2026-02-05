import { NavbarBrand } from "@heroui/react";

export function Brand() {
  return (
    <NavbarBrand className="gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-[#0b2447] via-[#1e3a8a] to-[#334155] text-white shadow-[0_12px_30px_-18px_rgba(11,36,71,0.8)]">
        <span className="font-display text-lg">G</span>
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-lg font-semibold tracking-tight">Gebeya Pro</span>
        <span className="text-[11px] uppercase tracking-[0.35em] text-ink-muted">
          Marketplace
        </span>
      </div>
    </NavbarBrand>
  );
}

