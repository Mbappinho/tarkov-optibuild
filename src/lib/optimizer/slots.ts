import type { Catalog, CatalogItem, ItemSlot } from "../tarkov/types";

export function resolveSlotItems(
  slot: ItemSlot,
  catalog: Catalog,
): CatalogItem[] {
  const allowed = new Set<string>();

  for (const id of slot.allowedItemIds) allowed.add(id);
  for (const categoryId of slot.allowedCategoryIds) {
    for (const id of catalog.itemsByCategory.get(categoryId) ?? []) {
      allowed.add(id);
    }
  }
  for (const id of slot.excludedItemIds) allowed.delete(id);
  for (const categoryId of slot.excludedCategoryIds) {
    for (const id of catalog.itemsByCategory.get(categoryId) ?? []) {
      allowed.delete(id);
    }
  }

  const items: CatalogItem[] = [];
  for (const id of allowed) {
    const item = catalog.items.get(id);
    if (!item || item.isWeapon) continue;
    items.push(item);
  }
  return items;
}
