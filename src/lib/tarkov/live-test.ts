import { getCatalog, catalogStats } from "./catalog";
import { optimizeWeapon } from "../optimizer/optimize";
import { defaultConstraints } from "./defaults";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const catalog = await getCatalog();
  const stats = catalogStats(catalog);
  console.log("catalog", stats);

  assert(stats.weapons > 50, `trop peu d'armes: ${stats.weapons}`);
  assert(stats.items > 500, `trop peu d'items: ${stats.items}`);

  const m4 =
    catalog.weapons.find((weapon) => weapon.shortName === "M4A1") ??
    catalog.weapons.find((weapon) =>
      weapon.name.toLowerCase().includes("m4a1"),
    );
  assert(m4, "M4A1 introuvable");
  assert(!m4.name.includes("Name"), `nom non traduit: ${m4.name}`);
  console.log("m4", m4);

  const item = catalog.items.get(m4.id);
  assert(item, "item M4A1 manquant");
  assert(item.slots.length > 0, "M4A1 sans slots");
  assert(item.baseRecoilVertical > 0, "recul de base à 0");
  assert(item.weight > 0, "M4A1 sans poids");
  const magCapacities = [...catalog.items.values()]
    .filter((entry) => entry.magazineCapacity > 0)
    .length;
  assert(magCapacities > 20, `trop peu de chargeurs: ${magCapacities}`);

  const result = optimizeWeapon(catalog, m4.id, {
    ...defaultConstraints(),
    objective: "recoil",
  });

  console.log("optimize", {
    parts: result.parts.length,
    cost: result.costRub,
    recoil: result.recoilVertical,
    ergo: result.ergonomics,
    weightKg: result.weightKg,
    truncated: result.truncated,
    nodes: result.nodesVisited,
    elapsedMs: result.elapsedMs,
    firstParts: result.parts.slice(0, 8).map((part) => ({
      slot: part.slotName,
      item: part.shortName,
      vendor: part.vendor,
    })),
  });

  assert(result.parts.length > 0, "build vide");
  assert(result.weightKg > item.weight, "M4: poids du build <= arme nue");
  assert(
    result.ergonomics <= 100,
    `M4: ergo > 100 (${result.ergonomics})`,
  );
  assert(
    result.recoilVertical < item.baseRecoilVertical,
    "le recul n'a pas baissé",
  );
  assert(
    result.parts.every(
      (part) =>
        !part.slotNameId.startsWith("mod_scope") &&
        !part.slotNameId.startsWith("mod_nvg") &&
        !part.slotNameId.startsWith("mod_launcher"),
    ),
    "un viseur ou lance-grenades a été inclus",
  );
  const m4Mag = result.parts.find((part) =>
    part.slotNameId.startsWith("mod_magazine"),
  );
  assert(m4Mag, "M4: chargeur ~30 attendu");
  const m4MagItem = catalog.items.get(m4Mag.itemId);
  assert(m4MagItem, "M4: item chargeur manquant");
  assert(
    m4MagItem.magazineCapacity >= 30 && m4MagItem.magazineCapacity <= 40,
    `M4: capa chargeur inattendue (${m4MagItem.magazineCapacity})`,
  );
  for (const part of result.parts) {
    const catalogItem = catalog.items.get(part.itemId);
    assert(
      catalogItem &&
        (!catalogItem.excludeFromAutoBuild ||
          part.slotNameId.includes("sight_") ||
          part.slotNameId.startsWith("mod_magazine")),
      `pièce joueur dans le build: ${part.shortName}`,
    );
  }
  const m4Upper = result.parts.find((part) =>
    /recie?ver/i.test(part.slotNameId),
  );
  assert(m4Upper, "M4: boîtier manquant");
  assert(
    !/M16A1E1|M16A2/i.test(m4Upper.shortName),
    `M4: boîtier carry handle retenu (${m4Upper.shortName})`,
  );

  const model1 =
    catalog.weapons.find(
      (weapon) =>
        weapon.name.toLowerCase().includes("model 1") &&
        weapon.name.toLowerCase().includes("fa"),
    ) ??
    catalog.weapons.find((weapon) =>
      weapon.shortName.toLowerCase().includes("model 1"),
    );
  assert(model1, "Model 1 FA introuvable");
  const model1Result = optimizeWeapon(catalog, model1.id, {
    ...defaultConstraints(),
    objective: "recoil",
  });
  console.log("model1", {
    parts: model1Result.parts.map(
      (part) => `${part.slotNameId}:${part.shortName}`,
    ),
    recoil: model1Result.recoilVertical,
    ergo: model1Result.ergonomics,
    truncated: model1Result.truncated,
    nodes: model1Result.nodesVisited,
  });
  assert(model1Result.parts.length > 0, "Model 1: build vide");
  const blob = model1Result.parts.map((part) => part.shortName).join(" ");
  assert(
    /PRS/i.test(blob),
    `Model 1: PRS attendue (${blob})`,
  );
  assert(/ERE/i.test(blob), `Model 1: Magpul ERE attendu (${blob})`);
  assert(
    /MBUS|CDM|Guid/i.test(blob),
    `Model 1: cran de mire attendu (${blob})`,
  );
  assert(
    model1Result.recoilVertical < 50,
    `Model 1: recul trop haut (${model1Result.recoilVertical})`,
  );
  assert(
    !/M203|GP-25|GP-34/i.test(blob),
    `Model 1: lance-grenades inclus (${blob})`,
  );
  assert(
    model1Result.ergonomics <= 100,
    `Model 1: ergo > 100 (${model1Result.ergonomics})`,
  );

  const model1Ergo = optimizeWeapon(catalog, model1.id, {
    ...defaultConstraints(),
    objective: "ergonomics",
  });
  console.log("model1 ergo max", {
    recoil: model1Ergo.recoilVertical,
    ergo: model1Ergo.ergonomics,
    truncated: model1Ergo.truncated,
    parts: model1Ergo.parts.map((part) => part.shortName),
  });
  assert(
    model1Ergo.ergonomics <= 100,
    `Model 1 ergo max: ergo > 100 (${model1Ergo.ergonomics})`,
  );

  const model1Balanced = optimizeWeapon(catalog, model1.id, {
    ...defaultConstraints(),
    objective: "balanced",
  });
  console.log("model1 équilibré", {
    recoil: model1Balanced.recoilVertical,
    ergo: model1Balanced.ergonomics,
    weightKg: model1Balanced.weightKg,
    truncated: model1Balanced.truncated,
    parts: model1Balanced.parts.map((part) => part.shortName),
  });
  assert(
    model1Balanced.ergonomics <= 100,
    `Model 1 équilibré: ergo > 100 (${model1Balanced.ergonomics})`,
  );
  assert(model1Balanced.weightKg > 1, "Model 1 équilibré: poids trop bas");

  const silenced = optimizeWeapon(catalog, model1.id, {
    ...defaultConstraints(),
    objective: "recoil",
    requireSuppressor: true,
  });
  console.log("model1 silencieux", {
    hasSuppressor: silenced.hasSuppressor,
    recoil: silenced.recoilVertical,
    ergo: silenced.ergonomics,
    parts: silenced.parts
      .filter((part) => catalog.items.get(part.itemId)?.isSuppressor)
      .map((part) => part.shortName),
  });
  assert(silenced.hasSuppressor, "Model 1: silencieux imposé absent");

  const m4Drum = optimizeWeapon(catalog, m4.id, {
    ...defaultConstraints(),
    objective: "balanced",
    magazineClass: "drum",
  });
  const drumPart = m4Drum.parts.find((part) =>
    part.slotNameId.startsWith("mod_magazine"),
  );
  assert(drumPart, "M4 drum: chargeur absent");
  const drumItem = catalog.items.get(drumPart.itemId);
  assert(drumItem, "M4 drum: item manquant");
  assert(
    drumItem.magazineCapacity >= 50 && drumItem.magazineCapacity <= 70,
    `M4 drum: capa ${drumItem.magazineCapacity}, 60 attendu (pas 100)`,
  );
  assert(
    drumItem.magazineCapacity < 80,
    `M4 drum: 100+ interdit (${drumItem.magazineCapacity})`,
  );
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
