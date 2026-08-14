"use client";

import Link from "next/link";
import { GITHUB_ISSUES_URL, GITHUB_REPO, KOFI_URL, TARKOV_DEV } from "@/lib/site";
import { useI18n } from "./I18nProvider";
import { LanguageToggle } from "./LanguageToggle";

export function LegalContent() {
  const { t } = useI18n();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <p>
          <Link
            href="/"
            className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase hover:text-signal"
          >
            {t("legalBack")}
          </Link>
        </p>
        <LanguageToggle />
      </div>
      <header className="flex flex-col gap-2">
        <p className="hud-label">{t("legalKicker")}</p>
        <h1 className="text-3xl font-bold tracking-wide text-fog uppercase">
          {t("legalTitle")}
        </h1>
      </header>

      <section className="chamfer hud-panel flex flex-col gap-3 p-4">
        <h2 className="hud-label">{t("legalDisclaimer")}</h2>
        <p className="text-sm leading-6 text-fog">{t("legalDisclaimerP1")}</p>
        <p className="text-sm leading-6 text-muted">{t("legalDisclaimerP2")}</p>
      </section>

      <section className="chamfer hud-panel flex flex-col gap-3 p-4">
        <h2 className="hud-label">{t("legalData")}</h2>
        <p className="text-sm leading-6 text-fog">
          {t("legalDataP1Before")}{" "}
          <a
            href={TARKOV_DEV}
            target="_blank"
            rel="noopener noreferrer"
            className="text-signal underline-offset-2 hover:underline"
          >
            tarkov.dev
          </a>{" "}
          {t("legalDataP1Via")}{" "}
          <a
            href="https://json.tarkov.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-signal underline-offset-2 hover:underline"
          >
            json.tarkov.dev
          </a>
          {t("legalDataP1After")}
        </p>
      </section>

      <section className="chamfer hud-panel flex flex-col gap-3 p-4">
        <h2 className="hud-label">{t("legalPrivacy")}</h2>
        <p className="text-sm leading-6 text-fog">{t("legalPrivacyP1")}</p>
        <p className="text-sm leading-6 text-muted">{t("legalPrivacyP2")}</p>
      </section>

      <section className="chamfer hud-panel flex flex-col gap-3 p-4">
        <h2 className="hud-label">{t("legalPublisher")}</h2>
        <p className="text-sm leading-6 text-fog">
          {t("legalPublisherP1Before")}{" "}
          <a
            href={`https://github.com/${GITHUB_REPO}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-signal underline-offset-2 hover:underline"
          >
            {GITHUB_REPO}
          </a>
          {t("legalPublisherP1Contact")}{" "}
          <a
            href={GITHUB_ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-signal underline-offset-2 hover:underline"
          >
            {t("legalPublisherP1Issues")}
          </a>
          .
        </p>
        <p className="text-sm leading-6 text-muted">
          {t("legalHost")}{" "}
          <a
            href="https://vercel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-signal underline-offset-2 hover:underline"
          >
            Vercel Inc.
          </a>
          {t("legalHostAddress")}
        </p>
        <p className="text-sm leading-6 text-muted">
          {t("legalKofiBefore")}{" "}
          <a
            href={KOFI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-signal underline-offset-2 hover:underline"
          >
            Ko-fi
          </a>{" "}
          {t("legalKofiAfter")}
        </p>
      </section>
    </div>
  );
}
