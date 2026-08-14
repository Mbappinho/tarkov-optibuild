"use client";

import { useI18n } from "./I18nProvider";
import type { Locale } from "@/lib/i18n/locale";

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();
  const next: Locale = locale === "fr" ? "en" : "fr";

  return (
    <button
      type="button"
      aria-label={t("langAria")}
      title={next === "en" ? t("langEn") : t("langFr")}
      onClick={() => setLocale(next)}
      className="chamfer-sm hud-panel-raised px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.18em] text-muted uppercase transition-colors hover:text-signal"
    >
      {locale === "fr" ? t("langFr") : t("langEn")}
    </button>
  );
}
