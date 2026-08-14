import { parseLocale, type Locale } from "../i18n/locale";
import { translate } from "../i18n/translate";
import { parseShareQuery } from "./query";

export type EmbedWeapon = {
  name: string;
  shortName: string;
  iconLink: string | null;
};

export type EmbedCopy = {
  locale: Locale;
  title: string;
  description: string;
  weaponName: string | null;
  weaponShortName: string | null;
  iconLink: string | null;
  tags: string[];
};

export function searchParamsFromRecord(
  raw: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first) params.set(key, first);
  }
  return params;
}

export function ogImageQuery(params: URLSearchParams): string {
  const og = new URLSearchParams();
  const weaponId = params.get("w");
  if (weaponId) og.set("w", weaponId);
  const objective = params.get("obj");
  if (objective) og.set("obj", objective);
  if (params.get("sil") === "1") og.set("sil", "1");
  if (params.get("mag") === "60") og.set("mag", "60");
  if (params.get("p")) og.set("frozen", "1");
  if (params.get("lang") === "fr") og.set("lang", "fr");
  return og.toString();
}

export function buildEmbed(
  params: URLSearchParams,
  weapon: EmbedWeapon | null,
): EmbedCopy {
  const locale = parseLocale(params.get("lang"));
  const share = parseShareQuery(params);
  const goalKey =
    share.objective === "recoil"
      ? "ogGoalRecoil"
      : share.objective === "ergonomics"
        ? "ogGoalErgo"
        : "ogGoalBalanced";
  const tags = [translate(locale, goalKey)];
  if (share.requireSuppressor) tags.push(translate(locale, "ogTagSuppressor"));
  if (share.magazineClass === "drum") tags.push(translate(locale, "ogTagDrum"));
  if (share.parts?.length || params.get("frozen") === "1") {
    tags.push(translate(locale, "ogTagFrozen"));
  }

  const shortName = weapon?.shortName ?? null;
  const name = weapon?.name ?? null;
  const hasWeapon = Boolean(shortName || name);
  const title = hasWeapon
    ? translate(locale, "ogTitle", { name: shortName || name || "" })
    : translate(locale, "ogSite");
  const description = hasWeapon
    ? [name && name !== shortName ? name : null, ...tags]
        .filter(Boolean)
        .join(" · ")
    : translate(locale, "ogSiteDescription");

  return {
    locale,
    title,
    description,
    weaponName: name,
    weaponShortName: shortName,
    iconLink: weapon?.iconLink ?? null,
    tags,
  };
}
