import { I18nProvider, useI18n } from "@/features/i18n";

export default function MerchantApplyHero() {
  return (
    <I18nProvider>
      <MerchantApplyHeroContent />
    </I18nProvider>
  );
}

function MerchantApplyHeroContent() {
  const { t } = useI18n();

  return (
    <div className="text-center">
      <p className="text-[11px] uppercase tracking-[0.35em] text-ink-muted">
        {t("merchant.heroLabel")}
      </p>
      <h1 className="font-display mt-2 text-4xl leading-tight">{t("merchant.heroTitle")}</h1>
      <p className="mb-4 text-sm text-ink-muted">{t("merchant.heroSubtitle")}</p>
    </div>
  );
}
