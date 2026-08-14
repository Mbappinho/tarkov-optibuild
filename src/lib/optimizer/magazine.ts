import { cheapestOffer } from "./availability";
import { isMagazineSlot } from "./player-choice";
import { resolveSlotItems } from "./slots";
import type {
  Catalog,
  CatalogItem,
  ItemSlot,
  OptimizeConstraints,
} from "../tarkov/types";

export const STD_MAG_TARGET = 30;
export const DRUM_MAG_TARGET = 60;
const STD_MIN = 30;
const STD_MAX = 40;
const DRUM_MIN = 50;
const DRUM_MAX = 70;

export type MagazinePick = {
  item: CatalogItem;
  slot: ItemSlot;
  priceRub: number;
  vendor: string;
};

export function isStdMagazineCapacity(capacity: number): boolean {
  return capacity >= STD_MIN && capacity <= STD_MAX;
}

export function isDrumMagazineCapacity(capacity: number): boolean {
  return capacity >= DRUM_MIN && capacity <= DRUM_MAX;
}

export function magazineFlags(
  catalog: Catalog,
  weapon: CatalogItem,
): { hasStdMagazine: boolean; hasDrumMagazine: boolean } {
  const items = collectMagazineItems(catalog, weapon, []);
  return {
    hasStdMagazine: items.some((item) => isStdMagazineCapacity(item.magazineCapacity)),
    hasDrumMagazine: items.some((item) => isDrumMagazineCapacity(item.magazineCapacity)),
  };
}

export function pickMagazine(
  catalog: Catalog,
  weapon: CatalogItem,
  constraints: OptimizeConstraints,
  chosen: CatalogItem[],
): MagazinePick | null {
  const candidates = magazineCandidates(catalog, weapon, constraints, chosen);
  const wanted =
    constraints.magazineClass === "drum"
      ? pickBestInClass(candidates, DRUM_MAG_TARGET, isDrumMagazineCapacity)
      : pickBestInClass(candidates, STD_MAG_TARGET, isStdMagazineCapacity) ??
        pickBestInClass(
          candidates,
          STD_MAG_TARGET,
          (capacity) => capacity > 0 && capacity < DRUM_MIN,
        );
  if (wanted) return wanted;
  if (constraints.magazineClass === "drum") {
    return (
      pickBestInClass(candidates, STD_MAG_TARGET, isStdMagazineCapacity) ??
      pickBestInClass(
        candidates,
        STD_MAG_TARGET,
        (capacity) => capacity > 0 && capacity < DRUM_MIN,
      )
    );
  }
  return null;
}

function magazineCandidates(
  catalog: Catalog,
  weapon: CatalogItem,
  constraints: OptimizeConstraints,
  chosen: CatalogItem[],
): MagazinePick[] {
  const blocked = new Set<string>();
  for (const item of chosen) {
    blocked.add(item.id);
    for (const id of item.conflictingItemIds) blocked.add(id);
  }

  const seen = new Set<string>();
  const picks: MagazinePick[] = [];
  for (const slot of collectMagazineSlots(catalog, weapon, chosen)) {
    for (const item of resolveSlotItems(slot, catalog)) {
      if (item.magazineCapacity <= 0 || seen.has(item.id)) continue;
      if (blocked.has(item.id)) continue;
      if (item.conflictingItemIds.some((id) => chosen.some((entry) => entry.id === id))) {
        continue;
      }
      const offer = cheapestOffer(item, constraints);
      if (!offer) continue;
      seen.add(item.id);
      picks.push({
        item,
        slot,
        priceRub: offer.priceRub,
        vendor: offer.label,
      });
    }
  }
  return picks;
}

function collectMagazineItems(
  catalog: Catalog,
  weapon: CatalogItem,
  chosen: CatalogItem[],
): CatalogItem[] {
  const seen = new Set<string>();
  const items: CatalogItem[] = [];
  for (const slot of collectMagazineSlots(catalog, weapon, chosen)) {
    for (const item of resolveSlotItems(slot, catalog)) {
      if (item.magazineCapacity <= 0 || seen.has(item.id)) continue;
      seen.add(item.id);
      items.push(item);
    }
  }
  return items;
}

function collectMagazineSlots(
  catalog: Catalog,
  weapon: CatalogItem,
  chosen: CatalogItem[],
): ItemSlot[] {
  const slots: ItemSlot[] = [];
  for (const host of [weapon, ...chosen]) {
    for (const slot of host.slots) {
      if (isMagazineSlot(slot)) slots.push(slot);
    }
  }
  if (slots.length) return slots;

  for (const slot of weapon.slots) {
    for (const item of resolveSlotItems(slot, catalog)) {
      for (const nested of item.slots) {
        if (isMagazineSlot(nested)) slots.push(nested);
      }
    }
  }
  return slots;
}

function pickBestInClass(
  candidates: MagazinePick[],
  target: number,
  allowed: (capacity: number) => boolean,
): MagazinePick | null {
  const pool = candidates.filter((candidate) =>
    allowed(candidate.item.magazineCapacity),
  );
  if (!pool.length) return null;
  pool.sort((left, right) => compareMagazineHandling(left, right, target));
  return pool[0];
}

/** Négatif = plus rapide (dump json.tarkov.dev). Ergo d’abord, puis load, puis check. */
function compareMagazineHandling(
  left: MagazinePick,
  right: MagazinePick,
  target: number,
): number {
  const ergo = right.item.ergonomicsModifier - left.item.ergonomicsModifier;
  if (ergo !== 0) return ergo;
  const load =
    (left.item.magazineLoadModifier ?? 0) - (right.item.magazineLoadModifier ?? 0);
  if (load !== 0) return load;
  const check =
    (left.item.magazineCheckModifier ?? 0) - (right.item.magazineCheckModifier ?? 0);
  if (check !== 0) return check;
  const leftDist = Math.abs(left.item.magazineCapacity - target);
  const rightDist = Math.abs(right.item.magazineCapacity - target);
  if (leftDist !== rightDist) return leftDist - rightDist;
  return left.priceRub - right.priceRub;
}
