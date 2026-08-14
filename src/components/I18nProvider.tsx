"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  detectLocale,
  LOCALE_STORAGE_KEY,
  type Locale,
} from "@/lib/i18n/locale";
import type { MessageKey } from "@/lib/i18n/messages";
import { numberLocale as localeTag, translate } from "@/lib/i18n/translate";

type I18nValue = {
  locale: Locale;
  ready: boolean;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  numberLocale: string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const next = detectLocale();
    setLocaleState(next);
    document.documentElement.lang = next;
    setReady(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    document.documentElement.lang = next;
  }, []);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      ready,
      setLocale,
      t,
      numberLocale: localeTag(locale),
    }),
    [locale, ready, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used within I18nProvider");
  return value;
}
