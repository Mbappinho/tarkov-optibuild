import { messages, type MessageKey } from "./messages";
import type { Locale } from "./locale";

export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  let text = messages[locale][key] ?? messages.fr[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

export function numberLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "fr-FR";
}
