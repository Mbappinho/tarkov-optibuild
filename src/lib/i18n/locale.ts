export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_STORAGE_KEY = "optibuild-lang";

export function parseLocale(value: unknown): Locale {
  return value === "fr" ? "fr" : "en";
}

export function detectLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored === "en" || stored === "fr") return stored;
  return "en";
}
