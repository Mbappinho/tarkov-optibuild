export type TraderName =
  | "prapor"
  | "therapist"
  | "skier"
  | "peacekeeper"
  | "mechanic"
  | "ragman"
  | "jaeger";

export const GUN_TRADERS: TraderName[] = [
  "prapor",
  "skier",
  "peacekeeper",
  "mechanic",
  "jaeger",
  "ragman",
  "therapist",
];

export type Objective = "recoil" | "ergonomics" | "balanced";

export type MagazineClass = "std" | "drum";

export type TraderLevels = Record<TraderName, number>;

export type OptimizeConstraints = {
  traders: TraderLevels;
  flea: boolean;
  budget: number | null;
  includeQuestLocked: boolean;
  includeLoot: boolean;
  objective: Objective;
  requireSuppressor: boolean;
  magazineClass: MagazineClass;
};

export type ItemOffer = {
  priceRub: number;
  vendor: string;
  trader: TraderName | null;
  minTraderLevel: number | null;
  questLocked: boolean;
  isFlea: boolean;
};

export type ItemSlot = {
  id: string;
  name: string;
  nameId: string;
  required: boolean;
  allowedItemIds: string[];
  excludedItemIds: string[];
  allowedCategoryIds: string[];
  excludedCategoryIds: string[];
};

export type CatalogItem = {
  id: string;
  name: string;
  shortName: string;
  iconLink: string | null;
  isWeapon: boolean;
  recoilModifier: number;
  ergonomicsModifier: number;
  baseRecoilVertical: number;
  baseRecoilHorizontal: number;
  baseErgonomics: number;
  heatFactor: number;
  coolingFactor: number;
  weight: number;
  categoryIds: string[];
  conflictingItemIds: string[];
  conflictingSlotIds: string[];
  slots: ItemSlot[];
  offers: ItemOffer[];
  avg24hPrice: number | null;
  excludeFromAutoBuild: boolean;
  isSuppressor: boolean;
  magazineCapacity: number;
  magazineLoadModifier: number;
  magazineCheckModifier: number;
};

export type WeaponSummary = {
  id: string;
  name: string;
  shortName: string;
  iconLink: string | null;
  hasStdMagazine: boolean;
  hasDrumMagazine: boolean;
};

export type Catalog = {
  fetchedAt: string;
  items: Map<string, CatalogItem>;
  itemsByCategory: Map<string, string[]>;
  weapons: WeaponSummary[];
};
