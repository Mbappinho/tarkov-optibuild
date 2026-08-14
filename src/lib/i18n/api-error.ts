import type { MessageKey } from "./messages";

export type I18nError = {
  key: MessageKey;
  vars?: Record<string, string | number>;
};

export function isI18nError(value: unknown): value is I18nError {
  return Boolean(
    value &&
      typeof value === "object" &&
      "key" in value &&
      typeof (value as { key: unknown }).key === "string",
  );
}

export function mapApiError(payload: {
  error?: string;
  retryAfterSec?: number;
}): I18nError {
  switch (payload.error) {
    case "rate_limited":
      return {
        key: "errRateLimited",
        vars: { s: payload.retryAfterSec ?? 60 },
      };
    case "catalog_unavailable":
      return { key: "errCatalog" };
    case "weapon_required":
      return { key: "errWeaponRequired" };
    case "weapon_not_found":
      return { key: "errWeaponNotFound" };
    case "no_parts":
      return { key: "errNoParts" };
    case "part_not_found":
      return { key: "errPartNotFound" };
    case "optimize_failed":
      return { key: "errOptimize" };
    default:
      return { key: "errGeneric" };
  }
}
