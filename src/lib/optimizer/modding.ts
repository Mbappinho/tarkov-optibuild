import type { Catalog, CatalogItem, ItemSlot } from "../tarkov/types";
import type { BuildPart } from "./optimize";

export type ModdingSlot = {
  slotId: string;
  slotName: string;
  slotNameId: string;
  required: boolean;
  part: BuildPart | null;
  children: ModdingSlot[];
};

const SLOT_LABELS: Record<string, string> = {
  mod_barrel: "CANON",
  mod_bipod: "BIPIED",
  mod_catch: "CATCH",
  mod_chamber: "CHAMBRE",
  mod_charge: "LEVIER",
  mod_equipment: "ÉQUIP.",
  mod_flashlight: "LAMPE",
  mod_foregrip: "AVANT",
  mod_gas_block: "GAS",
  mod_hammer: "CHIEN",
  mod_handguard: "GARDE-M",
  mod_launcher: "LANCEUR",
  mod_mag_shaft: "PUITS",
  mod_magazine: "MAG",
  mod_mount: "RAIL",
  mod_muzzle: "MUSE",
  mod_nvg: "NVG",
  mod_pistol_grip: "POIGNÉE",
  mod_receiver: "UPPER",
  mod_reciever: "UPPER",
  mod_scope: "OPTIQUE",
  mod_sight: "MIRE",
  mod_sight_front: "MIRE AV",
  mod_sight_rear: "MIRE AR",
  mod_silencer: "SIL.",
  mod_stock: "CROSSE",
  mod_tactical: "TAC",
  mod_trigger: "DÉTENTE",
};

function canonicalSlotId(nameId: string): string {
  return nameId.toLowerCase().replace(/_\d+$/, "");
}

export function slotBoardLabel(nameId: string, fallback: string): string {
  const id = canonicalSlotId(nameId);
  if (SLOT_LABELS[id]) return SLOT_LABELS[id];
  for (const [key, label] of Object.entries(SLOT_LABELS)) {
    if (id.startsWith(`${key}_`)) return label;
  }
  const trimmed = fallback.trim();
  if (trimmed && trimmed.length <= 12) return trimmed.toUpperCase();
  const last = id.replace(/^mod_/, "").replace(/_/g, " ");
  return last ? last.toUpperCase() : "SLOT";
}

function walkSlots(
  slots: ItemSlot[],
  bySlotId: Map<string, BuildPart>,
  catalog: Catalog,
): ModdingSlot[] {
  return slots.map((slot) => {
    const part = bySlotId.get(slot.id) ?? null;
    const childItem = part ? catalog.items.get(part.itemId) : undefined;
    return {
      slotId: slot.id,
      slotName: slot.name,
      slotNameId: slot.nameId,
      required: slot.required,
      part,
      children: childItem ? walkSlots(childItem.slots, bySlotId, catalog) : [],
    };
  });
}

export function buildModdingTree(
  weapon: CatalogItem,
  parts: BuildPart[],
  catalog: Catalog,
): ModdingSlot[] {
  const bySlotId = new Map<string, BuildPart>();
  for (const part of parts) bySlotId.set(part.slotId, part);
  return walkSlots(weapon.slots, bySlotId, catalog);
}

export function flattenModdingSlots(tree: ModdingSlot[]): ModdingSlot[] {
  const flat: ModdingSlot[] = [];
  const visit = (nodes: ModdingSlot[]) => {
    for (const node of nodes) {
      flat.push(node);
      visit(node.children);
    }
  };
  visit(tree);
  return flat;
}
