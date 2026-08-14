"use client";

import { KOFI_URL } from "@/lib/site";
import { useI18n } from "./I18nProvider";
import { LanguageToggle } from "./LanguageToggle";

export function TopBar({
  weaponsCount,
  itemsCount,
  fetchedAt,
  onFeedback,
}: {
  weaponsCount: number;
  itemsCount: number | null;
  fetchedAt: string | null;
  onFeedback: () => void;
}) {
  const { t, numberLocale } = useI18n();
  const dataAge = fetchedAt
    ? new Date(fetchedAt).toLocaleString(numberLocale, {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <header className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 sm:px-6">
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold tracking-[0.12em] text-fog uppercase">
          Optibuild
        </span>
        <span className="chamfer-sm bg-signal-deep/60 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.2em] text-signal">
          {t("fan")}
        </span>
        <LanguageToggle />
      </div>
      <div className="flex items-center gap-3 font-mono text-[11px] tracking-wider text-muted sm:gap-4">
        {weaponsCount ? (
          <span className="hidden sm:inline">
            <span className="text-fog">{weaponsCount}</span>{" "}
            {t("weapons").toUpperCase()}
          </span>
        ) : null}
        {itemsCount ? (
          <span className="hidden md:inline">
            <span className="text-fog">{itemsCount}</span>{" "}
            {t("partsMeta").toUpperCase()}
          </span>
        ) : null}
        {dataAge ? (
          <span className="hidden lg:inline">
            {t("data").toUpperCase()} <span className="text-fog">{dataAge}</span>
          </span>
        ) : null}
        <span className="hidden items-center gap-1.5 sm:flex">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-olive"
          />
          TARKOV.DEV
        </span>
        <button
          type="button"
          onClick={onFeedback}
          className="chamfer-sm hud-panel-raised px-2 py-1 text-[11px] font-semibold tracking-[0.12em] text-fog uppercase transition-colors hover:text-signal"
        >
          {t("feedback")}
        </button>
        <a
          href={KOFI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="chamfer-sm bg-signal-deep/70 px-2 py-1 text-[11px] font-semibold tracking-[0.12em] text-signal uppercase transition-colors hover:bg-signal hover:text-ink"
        >
          {t("kofi")}
        </a>
      </div>
    </header>
  );
}
