import { cheapestOffer } from "./availability";
import { buildModdingTree } from "./modding";
import type { BuildPart, OptimizeResult } from "./optimize";
import type {
  Catalog,
  CatalogItem,
  ItemSlot,
  Objective,
  OptimizeConstraints,
} from "../tarkov/types";

const ERGO_CAP = 100;

export type SnapshotPart = {
  slotId: string;
  itemId: string;
};

function finalRecoil(weapon: CatalogItem, recoilSum: number): number {
  return Math.max(1, weapon.baseRecoilVertical * (1 + recoilSum / 100));
}

function effectiveErgo(weapon: CatalogItem, ergoSum: number): number {
  return Math.min(ERGO_CAP, weapon.baseErgonomics + ergoSum);
}

function factorToPercent(factor: number): number {
  return Math.round((factor - 1) * 1000) / 10;
}

function findSlot(hosts: CatalogItem[], slotId: string): ItemSlot | null {
  for (const host of hosts) {
    for (const slot of host.slots) {
      if (slot.id === slotId) return slot;
    }
  }
  return null;
}

export function hydrateBuild(
  catalog: Catalog,
  weaponId: string,
  placed: SnapshotPart[],
  constraints: OptimizeConstraints,
): OptimizeResult {
  const weapon = catalog.items.get(weaponId);
  if (!weapon || !weapon.isWeapon) {
    throw new Error("Arme introuvable dans le catalogue");
  }
  if (!placed.length) {
    throw new Error("Aucune pièce à figer");
  }

  const hosts: CatalogItem[] = [weapon];
  const parts: BuildPart[] = [];
  let recoilSum = 0;
  let ergoSum = 0;
  let heat = 1;
  let cool = 1;
  let weightKg = weapon.weight;
  let costRub = 0;
  let hasSuppressor = false;

  for (const entry of placed) {
    const item = catalog.items.get(entry.itemId);
    if (!item) {
      throw new Error(`Pièce introuvable : ${entry.itemId}`);
    }
    const slot = findSlot(hosts, entry.slotId);
    const offer = cheapestOffer(item, constraints);
    const priceRub = offer?.priceRub ?? 0;
    const vendor = offer?.label ?? "Indispo";
    parts.push({
      slotId: entry.slotId,
      slotName: slot?.name ?? entry.slotId,
      slotNameId: slot?.nameId ?? entry.slotId,
      itemId: item.id,
      name: item.name,
      shortName: item.shortName,
      iconLink: item.iconLink,
      recoilModifier: item.recoilModifier,
      ergonomicsModifier: item.ergonomicsModifier,
      heatFactor: item.heatFactor,
      coolingFactor: item.coolingFactor,
      weight: item.weight,
      priceRub,
      vendor,
    });
    recoilSum += item.recoilModifier;
    ergoSum += item.ergonomicsModifier;
    heat *= item.heatFactor;
    cool *= item.coolingFactor;
    weightKg += item.weight;
    costRub += priceRub;
    if (item.isSuppressor) hasSuppressor = true;
    hosts.push(item);
  }

  const objective: Objective = constraints.objective;

  return {
    weaponId: weapon.id,
    weaponName: weapon.name,
    weaponShortName: weapon.shortName,
    iconLink: weapon.iconLink,
    objective,
    parts,
    modding: buildModdingTree(weapon, parts, catalog),
    recoilModifierSum: recoilSum,
    ergonomicsModifierSum: ergoSum,
    recoilVertical: Math.round(finalRecoil(weapon, recoilSum) * 10) / 10,
    recoilHorizontal:
      Math.round(
        weapon.baseRecoilHorizontal * (1 + recoilSum / 100) * 10,
      ) / 10,
    ergonomics: Math.round(effectiveErgo(weapon, ergoSum) * 10) / 10,
    heatPercent: factorToPercent(heat),
    coolingPercent: factorToPercent(cool),
    weightKg: Math.round(weightKg * 1000) / 1000,
    hasSuppressor,
    costRub,
    truncated: false,
    snapshot: true,
    nodesVisited: 0,
    elapsedMs: 0,
  };
}
