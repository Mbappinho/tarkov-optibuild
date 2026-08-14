"use client";

import Link from "next/link";
import { KOFI_URL, TARKOV_DEV } from "@/lib/site";
import { useI18n } from "./I18nProvider";

export function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="mt-auto border-t border-line px-4 py-4 text-[11px] leading-5 text-muted sm:px-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>
          {t("footerDisclaimer")}{" "}
          <a
            href={TARKOV_DEV}
            target="_blank"
            rel="noopener noreferrer"
            className="text-fog underline-offset-2 hover:text-signal hover:underline"
          >
            tarkov.dev
          </a>
          .{" "}
          <Link
            href="/legal"
            className="text-fog underline-offset-2 hover:text-signal hover:underline"
          >
            {t("footerLegal")}
          </Link>
          .
        </p>
        <a
          href={KOFI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-signal underline-offset-2 hover:underline"
        >
          {t("footerKofi")}
        </a>
      </div>
    </footer>
  );
}
