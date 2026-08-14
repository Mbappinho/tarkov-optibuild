"use client";

import { useI18n } from "./I18nProvider";

export function HomeFallback() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-10 text-muted">
      <p className="font-mono text-xs tracking-[0.2em] uppercase">
        {t("loading")}
      </p>
    </div>
  );
}
