import { NavbarBrand } from "@heroui/react";

export function Brand() {
  return (
    <NavbarBrand>
      <a
        href="/"
        className="flex min-w-0 items-center gap-2 rounded-xl px-1 py-1 outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary/60 sm:gap-3"
        aria-label="Go to homepage"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-[#0b2447] via-[#1e3a8a] to-[#334155] text-white shadow-[0_12px_30px_-18px_rgba(11,36,71,0.8)] sm:h-11 sm:w-11">
          <span className="font-display text-lg">G</span>
        </div>
        <div className="min-w-0 flex flex-col leading-none">
          <span className="truncate text-base font-semibold tracking-tight sm:text-lg">
            Gebeya Pro
          </span>
          <span className="hidden text-[11px] uppercase tracking-[0.35em] text-ink-muted sm:block">
            Marketplace
          </span>
        </div>
      </a>
    </NavbarBrand>
  );
}
