import type { CatalogItem, ItemSlot } from "../tarkov/types";

const IGNORED_SLOT_PREFIXES = [
  "mod_magazine",
  "mod_scope",
  "mod_nvg",
  "mod_launcher",
] as const;

export function isPlayerChoiceSlot(slot: ItemSlot): boolean {
  const id = slot.nameId.toLowerCase();
  return IGNORED_SLOT_PREFIXES.some(
    (prefix) => id === prefix || id.startsWith(`${prefix}_`),
  );
}

export function isMagazineSlot(slot: ItemSlot): boolean {
  const id = slot.nameId.toLowerCase();
  return id === "mod_magazine" || id.startsWith("mod_magazine_");
}

export function isIronSightSlot(slot: ItemSlot): boolean {
  const id = slot.nameId.toLowerCase();
  return (
    id.includes("sight_front") ||
    id.includes("sight_rear") ||
    id === "mod_sight"
  );
}

export function isPlayerChoiceItem(item: CatalogItem, slot?: ItemSlot): boolean {
  if (!item.excludeFromAutoBuild) return false;
  if (slot && isIronSightSlot(slot)) return false;
  return true;
}

export function autoBuildSlots(slots: ItemSlot[]): ItemSlot[] {
  return slots.filter((slot) => !isPlayerChoiceSlot(slot));
}
