import { cheapestOffer } from "./availability";
import type {
  Catalog,
  CatalogItem,
  ItemSlot,
  OptimizeConstraints,
} from "../tarkov/types";
import { resolveSlotItems } from "./slots";

/** En dessous, c’est un rail de carry handle (M16A1E1 / A2 : ~6 viseurs). */
export const MIN_PROPER_OPTIC_OPTIONS = 15;

const opticCountCache = new WeakMap<CatalogItem, number>();

export function isReceiverSlot(slot: ItemSlot): boolean {
  const id = slot.nameId.toLowerCase();
  return id.includes("reciever") || id.includes("receiver");
}

function isScopeSlot(slot: ItemSlot): boolean {
  const id = slot.nameId.toLowerCase();
  return id === "mod_scope" || id.startsWith("mod_scope_");
}

export function opticOptionCount(item: CatalogItem, catalog: Catalog): number {
  const cached = opticCountCache.get(item);
  if (cached != null) return cached;
  let total = 0;
  for (const slot of item.slots) {
    if (!isScopeSlot(slot)) continue;
    total += resolveSlotItems(slot, catalog).length;
  }
  opticCountCache.set(item, total);
  return total;
}

export function isOpticReadyReceiver(
  item: CatalogItem,
  catalog: Catalog,
): boolean {
  return opticOptionCount(item, catalog) >= MIN_PROPER_OPTIC_OPTIONS;
}

/** Si un upper picatinny est dans la liste, jette les carry handle. */
export function preferOpticReadyReceivers<T>(
  slot: ItemSlot,
  entries: T[],
  catalog: Catalog,
  itemOf: (entry: T) => CatalogItem = (entry) => entry as CatalogItem,
): T[] {
  if (!isReceiverSlot(slot) || entries.length === 0) return entries;
  const ready = entries.filter((entry) =>
    isOpticReadyReceiver(itemOf(entry), catalog),
  );
  return ready.length > 0 ? ready : entries;
}

type PlacedPart = { slotId: string; itemId: string };

/** Lien figé avec un M16A1E1/A2 : on relance l’opti s’il existe un picatinny achetable. */
export function snapshotUsesBlockedReceiver(
  catalog: Catalog,
  weaponId: string,
  placed: PlacedPart[],
  constraints: OptimizeConstraints,
): boolean {
  const weapon = catalog.items.get(weaponId);
  if (!weapon) return false;
  for (const entry of placed) {
    const slot = weapon.slots.find((candidate) => candidate.id === entry.slotId);
    if (!slot || !isReceiverSlot(slot)) continue;
    const item = catalog.items.get(entry.itemId);
    if (!item || isOpticReadyReceiver(item, catalog)) continue;
    const availableReady = resolveSlotItems(slot, catalog).filter(
      (candidate) =>
        isOpticReadyReceiver(candidate, catalog) &&
        cheapestOffer(candidate, constraints),
    );
    if (availableReady.length > 0) return true;
  }
  return false;
}
