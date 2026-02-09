import { I18nProvider, useI18n } from "@/features/i18n";

export default function HomeHero() {
  return (
    <I18nProvider>
      <HomeHeroContent />
    </I18nProvider>
  );
}

function HomeHeroContent() {
  const { t } = useI18n();

  return (
    <section className="glass-strong relative overflow-hidden rounded-3xl px-5 py-8 md:px-10 md:py-12">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-[11px] uppercase tracking-[0.4em] text-[color:var(--accent)]">
            {t("home.bannerLabel")}
          </p>
          <h1 className="font-display mt-3 text-3xl leading-tight md:text-5xl">
            {t("home.title")}
          </h1>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="#collection"
              className="theme-cta rounded-full px-5 py-2.5 text-xs font-semibold shadow-[0_16px_40px_-24px_rgba(29,63,114,0.7)] transition-transform duration-300 hover:-translate-y-0.5"
            >
              {t("home.shopNow")}
            </a>
            <a
              href="/merchant/apply"
              className="theme-cta-alt rounded-full border px-5 py-2.5 text-xs font-semibold shadow-[0_16px_40px_-24px_rgba(43,47,114,0.7)] transition-transform duration-300 hover:-translate-y-0.5"
            >
              {t("home.applyMerchant")}
            </a>
            <a
              href="/login"
              className="theme-action-soft rounded-full px-5 py-2.5 text-xs font-semibold"
            >
              {t("home.signIn")}
            </a>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -right-6 -top-8 h-24 w-24 rounded-3xl bg-[color:var(--orb-a)] blur-2xl"></div>
          <div className="absolute bottom-0 left-6 h-20 w-20 rounded-full bg-[color:var(--orb-b)] blur-2xl"></div>
          <div className="float-slow glass relative rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.3em] text-ink-muted">
                {t("home.featured")}
              </span>
              <span className="theme-pill rounded-full px-3 py-1 text-[10px]">
                {t("home.new")}
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              <div className="theme-card rounded-2xl p-4">
                <p className="font-display text-xl">{t("home.capsule")}</p>
                <p className="text-ink-muted mt-1 text-xs">
                  {t("home.capsuleDesc")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px] text-ink-muted">
                <div className="theme-card rounded-2xl p-3">
                  <p className="text-base font-semibold text-[color:var(--ink)]">24h</p>
                  <p>{t("home.response")}</p>
                </div>
                <div className="theme-card rounded-2xl p-3">
                  <p className="text-base font-semibold text-[color:var(--ink)]">100%</p>
                  <p>{t("home.checked")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
