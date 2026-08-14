import { magazineFlags } from "../optimizer/magazine";
import { parseLocale, type Locale } from "../i18n/locale";
import { JSON_PATHS, fetchTarkovJson } from "./json-client";
import type {
  Catalog,
  CatalogItem,
  ItemOffer,
  ItemSlot,
  TraderName,
} from "./types";

type LocaleMap = Record<string, string>;

type RawTrader = {
  id: string;
  name?: string;
  normalizedName?: string;
};

type RawBuyFromTrader = {
  trader?: string;
  priceRUB?: number | null;
  minTraderLevel?: number | null;
  taskUnlock?: string | { id: string } | null;
};

type RawSlot = {
  id: string;
  name?: string;
  nameId?: string;
  required?: boolean | null;
  filters?: {
    allowedItems?: unknown;
    excludedItems?: unknown;
    allowedCategories?: unknown;
    excludedCategories?: unknown;
  } | null;
};

type RawProperties = {
  propertiesType?: string | null;
  recoilVertical?: number | null;
  recoilHorizontal?: number | null;
  ergonomics?: number | null;
  recoilModifier?: number | null;
  recoil?: number | null;
  heatFactor?: number | null;
  coolingFactor?: number | null;
  capacity?: number | null;
  loadModifier?: number | null;
  ammoCheckModifier?: number | null;
  slots?: RawSlot[] | null;
} | null;

const PLAYER_CHOICE_PROPERTY_TYPES = new Set([
  "ItemPropertiesMagazine",
  "ItemPropertiesScope",
  "ItemPropertiesNightVision",
]);

type RawItem = {
  id: string;
  name?: string | null;
  shortName?: string | null;
  iconLink?: string | null;
  types?: string[];
  weight?: number | null;
  recoilModifier?: number | null;
  ergonomicsModifier?: number | null;
  avg24hPrice?: number | null;
  categories?: unknown;
  conflictingItems?: unknown;
  conflictingSlotIds?: string[] | null;
  buyFromTrader?: RawBuyFromTrader[] | null;
  properties?: RawProperties;
};

type ItemsPayload = {
  data?: {
    items?: Record<string, RawItem>;
  };
};

type TradersPayload = {
  data?: Record<string, RawTrader>;
};

type LocalePayload = {
  data?: LocaleMap;
};

const TRADER_NAMES = new Set<TraderName>([
  "prapor",
  "therapist",
  "skier",
  "peacekeeper",
  "mechanic",
  "ragman",
  "jaeger",
]);

const CATALOG_TTL_MS = 60 * 60 * 1000;

type RawBundle = {
  itemsPayload: ItemsPayload;
  tradersPayload: TradersPayload;
  localeFr: LocaleMap;
  localeEn: LocaleMap;
};

let rawCache: { expiresAt: number; bundle: RawBundle } | null = null;
let rawInflight: Promise<RawBundle> | null = null;
const catalogs = new Map<Locale, Catalog>();
const catalogInflight = new Map<Locale, Promise<Catalog>>();

function asIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids: string[] = [];
  for (const entry of value) {
    if (typeof entry === "string" && entry) ids.push(entry);
    else if (entry && typeof entry === "object" && "id" in entry) {
      const id = (entry as { id?: unknown }).id;
      if (typeof id === "string" && id) ids.push(id);
    }
  }
  return ids;
}

function localize(
  locales: LocaleMap[],
  key: string | null | undefined,
  fallback: string,
): string {
  if (!key) return fallback;
  for (const locale of locales) {
    const value = locale[key];
    if (value) return value;
  }
  return fallback;
}

function isQuestLocked(taskUnlock: RawBuyFromTrader["taskUnlock"]): boolean {
  if (!taskUnlock) return false;
  if (typeof taskUnlock === "string") return taskUnlock.length > 0;
  return Boolean(taskUnlock.id);
}

function thermoMultiplier(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value) || value <= 0) return 1;
  return value;
}

function recoilPercent(raw: RawItem): number {
  if (raw.recoilModifier != null) return Number(raw.recoilModifier);
  const nested = raw.properties?.recoilModifier ?? raw.properties?.recoil;
  if (nested == null) return 0;
  const value = Number(nested);
  return Math.abs(value) <= 1 ? value * 100 : value;
}

function mapSlot(raw: RawSlot, locales: LocaleMap[]): ItemSlot {
  const nameKey = raw.name ?? raw.nameId ?? raw.id;
  return {
    id: raw.id,
    name: localize(locales, nameKey, raw.nameId ?? raw.name ?? raw.id),
    nameId: raw.nameId ?? raw.id,
    required: Boolean(raw.required),
    allowedItemIds: asIdList(raw.filters?.allowedItems),
    excludedItemIds: asIdList(raw.filters?.excludedItems),
    allowedCategoryIds: asIdList(raw.filters?.allowedCategories),
    excludedCategoryIds: asIdList(raw.filters?.excludedCategories),
  };
}

function mapOffers(
  raw: RawItem,
  traderById: Map<string, TraderName | string>,
): ItemOffer[] {
  const offers: ItemOffer[] = [];

  for (const entry of raw.buyFromTrader ?? []) {
    if (entry.priceRUB == null || !entry.trader) continue;
    const mapped = traderById.get(entry.trader);
    const trader =
      mapped && TRADER_NAMES.has(mapped as TraderName)
        ? (mapped as TraderName)
        : null;
    const vendor =
      trader ?? (typeof mapped === "string" ? mapped : "Trader");
    offers.push({
      priceRub: entry.priceRUB,
      vendor,
      trader,
      minTraderLevel: entry.minTraderLevel ?? null,
      questLocked: isQuestLocked(entry.taskUnlock),
      isFlea: false,
    });
  }

  if (raw.avg24hPrice && raw.avg24hPrice > 0) {
    offers.push({
      priceRub: raw.avg24hPrice,
      vendor: "Flea",
      trader: null,
      minTraderLevel: null,
      questLocked: false,
      isFlea: true,
    });
  }

  return offers;
}

function mapItem(
  raw: RawItem,
  locales: LocaleMap[],
  traderById: Map<string, TraderName | string>,
): CatalogItem | null {
  if (!raw.id) return null;
  const types = raw.types ?? [];
  if (types.includes("preset")) return null;

  const isWeapon = types.includes("gun");
  const isMod = types.includes("mods");
  if (!isWeapon && !isMod) return null;

  const name = localize(locales, raw.name ?? `${raw.id} Name`, raw.id);
  const shortName = localize(
    locales,
    raw.shortName ?? `${raw.id} ShortName`,
    name,
  );

  return {
    id: raw.id,
    name,
    shortName,
    iconLink: raw.iconLink ?? null,
    isWeapon,
    recoilModifier: isWeapon ? 0 : recoilPercent(raw),
    ergonomicsModifier: isWeapon
      ? 0
      : Number(raw.properties?.ergonomics ?? raw.ergonomicsModifier ?? 0),
    baseRecoilVertical: isWeapon
      ? Number(raw.properties?.recoilVertical ?? 0)
      : 0,
    baseRecoilHorizontal: isWeapon
      ? Number(raw.properties?.recoilHorizontal ?? 0)
      : 0,
    baseErgonomics: isWeapon ? Number(raw.properties?.ergonomics ?? 0) : 0,
    heatFactor: isWeapon ? 1 : thermoMultiplier(raw.properties?.heatFactor),
    coolingFactor: isWeapon
      ? 1
      : thermoMultiplier(raw.properties?.coolingFactor),
    weight: Number(raw.weight ?? 0),
    categoryIds: asIdList(raw.categories),
    conflictingItemIds: asIdList(raw.conflictingItems),
    conflictingSlotIds: raw.conflictingSlotIds ?? [],
    slots: (raw.properties?.slots ?? []).map((slot) => mapSlot(slot, locales)),
    offers: mapOffers(raw, traderById),
    avg24hPrice: raw.avg24hPrice ?? null,
    excludeFromAutoBuild: PLAYER_CHOICE_PROPERTY_TYPES.has(
      raw.properties?.propertiesType ?? "",
    ),
    isSuppressor: types.includes("suppressor"),
    magazineCapacity:
      raw.properties?.propertiesType === "ItemPropertiesMagazine"
        ? Number(raw.properties.capacity ?? 0)
        : 0,
    magazineLoadModifier:
      raw.properties?.propertiesType === "ItemPropertiesMagazine"
        ? Number(raw.properties.loadModifier ?? 0)
        : 0,
    magazineCheckModifier:
      raw.properties?.propertiesType === "ItemPropertiesMagazine"
        ? Number(raw.properties.ammoCheckModifier ?? 0)
        : 0,
  };
}

function indexCatalog(items: CatalogItem[], locale: Locale): Catalog {
  const map = new Map<string, CatalogItem>();
  for (const item of items) map.set(item.id, item);

  const itemsByCategory = new Map<string, string[]>();
  for (const item of map.values()) {
    for (const categoryId of item.categoryIds) {
      const list = itemsByCategory.get(categoryId) ?? [];
      list.push(item.id);
      itemsByCategory.set(categoryId, list);
    }
  }

  for (const item of map.values()) {
    const extra = new Set(item.conflictingItemIds);
    for (const otherId of item.conflictingItemIds) {
      const other = map.get(otherId);
      if (!other) continue;
      if (!other.conflictingItemIds.includes(item.id)) {
        other.conflictingItemIds.push(item.id);
      }
      extra.add(otherId);
    }
    item.conflictingItemIds = [...extra];
  }

  const catalog: Catalog = {
    fetchedAt: new Date().toISOString(),
    items: map,
    itemsByCategory,
    weapons: [],
  };

  catalog.weapons = [...map.values()]
    .filter((item) => item.isWeapon)
    .map((item) => {
      const flags = magazineFlags(catalog, item);
      return {
        id: item.id,
        name: item.name,
        shortName: item.shortName,
        iconLink: item.iconLink,
        hasStdMagazine: flags.hasStdMagazine,
        hasDrumMagazine: flags.hasDrumMagazine,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, locale));

  return catalog;
}

function traderIndex(payload: TradersPayload): Map<string, TraderName | string> {
  const map = new Map<string, TraderName | string>();
  for (const trader of Object.values(payload.data ?? {})) {
    if (!trader?.id || !trader.normalizedName) continue;
    map.set(trader.id, trader.normalizedName.toLowerCase());
  }
  return map;
}

async function loadRawBundle(): Promise<RawBundle> {
  if (rawCache && rawCache.expiresAt > Date.now()) return rawCache.bundle;
  if (rawInflight) return rawInflight;

  rawInflight = Promise.all([
    fetchTarkovJson<ItemsPayload>(JSON_PATHS.items),
    fetchTarkovJson<TradersPayload>(JSON_PATHS.traders),
    fetchTarkovJson<LocalePayload>(JSON_PATHS.localeFr),
    fetchTarkovJson<LocalePayload>(JSON_PATHS.localeEn),
  ])
    .then(([itemsPayload, tradersPayload, localeFr, localeEn]) => {
      const bundle: RawBundle = {
        itemsPayload,
        tradersPayload,
        localeFr: localeFr.data ?? {},
        localeEn: localeEn.data ?? {},
      };
      rawCache = { bundle, expiresAt: Date.now() + CATALOG_TTL_MS };
      catalogs.clear();
      return bundle;
    })
    .finally(() => {
      rawInflight = null;
    });

  return rawInflight;
}

function buildCatalog(bundle: RawBundle, locale: Locale): Catalog {
  const locales =
    locale === "en"
      ? [bundle.localeEn, bundle.localeFr]
      : [bundle.localeFr, bundle.localeEn];
  const traders = traderIndex(bundle.tradersPayload);
  const mapped: CatalogItem[] = [];

  for (const raw of Object.values(bundle.itemsPayload.data?.items ?? {})) {
    const item = mapItem(raw, locales, traders);
    if (item) mapped.push(item);
  }

  return indexCatalog(mapped, locale);
}

export async function getCatalog(locale: Locale | string = "en"): Promise<Catalog> {
  const lang = parseLocale(locale);
  const cached = catalogs.get(lang);
  if (cached && rawCache && rawCache.expiresAt > Date.now()) return cached;

  const pending = catalogInflight.get(lang);
  if (pending) return pending;

  const work = loadRawBundle().then((bundle) => {
    const existing = catalogs.get(lang);
    if (existing && rawCache && rawCache.expiresAt > Date.now()) return existing;
    const catalog = buildCatalog(bundle, lang);
    catalogs.set(lang, catalog);
    return catalog;
  }).finally(() => {
    catalogInflight.delete(lang);
  });
  catalogInflight.set(lang, work);
  return work;
}

export function catalogStats(catalog: Catalog) {
  return {
    fetchedAt: catalog.fetchedAt,
    weapons: catalog.weapons.length,
    items: catalog.items.size,
  };
}
