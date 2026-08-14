import type { Catalog, CatalogItem, ItemSlot } from "../tarkov/types";
import { defaultConstraints } from "../tarkov/defaults";
import { parseShareQuery, serializeShareQuery } from "../share/query";
import { buildEmbed } from "../share/embed";
import { hydrateBuild } from "./hydrate";
import { flattenModdingSlots, slotBoardLabel } from "./modding";
import { optimizeWeapon } from "./optimize";
import {
  MIN_PROPER_OPTIC_OPTIONS,
  preferOpticReadyReceivers,
  snapshotUsesBlockedReceiver,
} from "./optic-rail";
import { shoppingList, shoppingListText } from "./shopping";

function slot(
  id: string,
  name: string,
  allowed: string[],
  required = false,
): ItemSlot {
  return {
    id,
    name,
    nameId: id,
    required,
    allowedItemIds: allowed,
    excludedItemIds: [],
    allowedCategoryIds: [],
    excludedCategoryIds: [],
  };
}

function item(partial: Partial<CatalogItem> & Pick<CatalogItem, "id" | "name">): CatalogItem {
  return {
    shortName: partial.shortName ?? partial.name,
    iconLink: null,
    isWeapon: false,
    recoilModifier: 0,
    ergonomicsModifier: 0,
    heatFactor: 1,
    coolingFactor: 1,
    weight: 0.1,
    baseRecoilVertical: 0,
    baseRecoilHorizontal: 0,
    baseErgonomics: 0,
    categoryIds: [],
    conflictingItemIds: [],
    conflictingSlotIds: [],
    slots: [],
    offers: [
      {
        priceRub: 1000,
        vendor: "Mechanic",
        trader: "mechanic",
        minTraderLevel: 1,
        questLocked: false,
        isFlea: false,
      },
    ],
    avg24hPrice: 1000,
    excludeFromAutoBuild: false,
    isSuppressor: false,
    magazineCapacity: 0,
    magazineLoadModifier: 0,
    magazineCheckModifier: 0,
    ...partial,
  };
}

function catalogOf(items: CatalogItem[]): Catalog {
  return {
    fetchedAt: new Date().toISOString(),
    items: new Map(items.map((entry) => [entry.id, entry])),
    itemsByCategory: new Map(),
    weapons: items
      .filter((entry) => entry.isWeapon)
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        shortName: entry.shortName,
        iconLink: entry.iconLink,
        hasStdMagazine: false,
        hasDrumMagazine: false,
      })),
  };
}

const gun = item({
  id: "gun",
  name: "Test Rifle",
  isWeapon: true,
  baseRecoilVertical: 100,
  baseRecoilHorizontal: 200,
  baseErgonomics: 40,
  slots: [
    slot("grip", "Pistol Grip", ["grip-recoil", "grip-ergo"], true),
    slot("muzzle", "Muzzle", ["muzzle-recoil", "muzzle-ergo"]),
    slot("mod_magazine", "Chargeur", ["mag-cheat"]),
    slot("mod_scope", "Viseur", ["sight-cheat"]),
    slot("mod_launcher", "Lanceur", ["launcher-cheat"]),
    slot("mod_sight_rear", "Cran de mire", ["iron-sight"]),
  ],
});

const gripRecoil = item({
  id: "grip-recoil",
  name: "Grip recul",
  recoilModifier: -10,
  ergonomicsModifier: -2,
});
const gripErgo = item({
  id: "grip-ergo",
  name: "Grip ergo",
  recoilModifier: -1,
  ergonomicsModifier: 12,
});
const muzzleRecoil = item({
  id: "muzzle-recoil",
  name: "Muzzle recul",
  recoilModifier: -15,
  ergonomicsModifier: -8,
});
const muzzleErgo = item({
  id: "muzzle-ergo",
  name: "Muzzle ergo",
  recoilModifier: -2,
  ergonomicsModifier: 6,
});
const magCheat = item({
  id: "mag-cheat",
  name: "Mag cheat",
  recoilModifier: -50,
  excludeFromAutoBuild: true,
});
const sightCheat = item({
  id: "sight-cheat",
  name: "Sight cheat",
  recoilModifier: -40,
  excludeFromAutoBuild: true,
});
const launcherCheat = item({
  id: "launcher-cheat",
  name: "Launcher cheat",
  recoilModifier: -30,
});
const ironSight = item({
  id: "iron-sight",
  name: "Iron sight",
  recoilModifier: 0,
  ergonomicsModifier: 0.5,
  excludeFromAutoBuild: true,
});

const catalog = catalogOf([
  gun,
  gripRecoil,
  gripErgo,
  muzzleRecoil,
  muzzleErgo,
  magCheat,
  sightCheat,
  launcherCheat,
  ironSight,
]);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const recoilBuild = optimizeWeapon(catalog, "gun", {
  ...defaultConstraints(),
  objective: "recoil",
  flea: false,
});
assert(
  recoilBuild.parts.some((part) => part.itemId === "grip-recoil"),
  "recoil: grip recul attendu",
);
assert(
  recoilBuild.parts.some((part) => part.itemId === "muzzle-recoil"),
  "recoil: muzzle recul attendu",
);
assert(
  recoilBuild.parts.some((part) => part.itemId === "iron-sight"),
  "recoil: cran de mire attendu",
);
assert(
  recoilBuild.parts.every(
    (part) =>
      part.itemId !== "mag-cheat" &&
      part.itemId !== "sight-cheat" &&
      part.itemId !== "launcher-cheat",
  ),
  "recoil: chargeur/viseur/lanceur ne doivent pas être choisis",
);

const ergoBuild = optimizeWeapon(catalog, "gun", {
  ...defaultConstraints(),
  objective: "ergonomics",
  flea: false,
});
assert(
  ergoBuild.parts.some((part) => part.itemId === "grip-ergo"),
  "ergo: grip ergo attendu",
);
assert(
  ergoBuild.parts.some((part) => part.itemId === "muzzle-ergo"),
  "ergo: muzzle ergo attendu",
);

const gripBlock = item({
  id: "grip-block",
  name: "Grip block",
  recoilModifier: -23,
  conflictingItemIds: ["stock-best"],
});
const gripCompat = item({
  id: "grip-compat",
  name: "Grip compat",
  recoilModifier: -2,
});
const stockBest = item({
  id: "stock-best",
  name: "Stock best",
  recoilModifier: -24,
  conflictingItemIds: ["grip-block"],
});
const stockWeak = item({
  id: "stock-weak",
  name: "Stock weak",
  recoilModifier: -1,
});
const conflictGun = item({
  id: "conflict-gun",
  name: "Conflict gun",
  isWeapon: true,
  baseRecoilVertical: 100,
  baseRecoilHorizontal: 200,
  baseErgonomics: 40,
  slots: [
    slot("mod_pistol_grip", "Grip", ["grip-block", "grip-compat"], true),
    slot("mod_stock", "Stock", ["stock-best", "stock-weak"], true),
  ],
});
const conflictCatalog = catalogOf([
  conflictGun,
  gripBlock,
  gripCompat,
  stockBest,
  stockWeak,
]);
const conflictBuild = optimizeWeapon(conflictCatalog, "conflict-gun", {
  ...defaultConstraints(),
  objective: "recoil",
  flea: false,
});
assert(
  conflictBuild.parts.some((part) => part.itemId === "grip-compat"),
  "conflit: grip compatible attendu",
);
assert(
  conflictBuild.parts.some((part) => part.itemId === "stock-best"),
  "conflit: meilleure crosse attendue",
);

const muzzleLoot = item({
  id: "muzzle-loot",
  name: "Muzzle loot",
  recoilModifier: -40,
  offers: [],
  avg24hPrice: 0,
});
const muzzlePaid = item({
  id: "muzzle-paid",
  name: "Muzzle paid",
  recoilModifier: -5,
});
const lootGun = item({
  id: "loot-gun",
  name: "Loot gun",
  isWeapon: true,
  baseRecoilVertical: 100,
  baseRecoilHorizontal: 200,
  baseErgonomics: 40,
  slots: [slot("muzzle", "Muzzle", ["muzzle-loot", "muzzle-paid"], true)],
});
const lootBuild = optimizeWeapon(
  catalogOf([lootGun, muzzleLoot, muzzlePaid]),
  "loot-gun",
  { ...defaultConstraints(), objective: "recoil", flea: false },
);
assert(
  lootBuild.parts.some((part) => part.itemId === "muzzle-loot"),
  "loot: pièce sans trader/flea attendue",
);
assert(
  lootBuild.parts.some((part) => part.vendor === "Loot"),
  "loot: vendor Loot attendu",
);

const shopOnly = optimizeWeapon(
  catalogOf([lootGun, muzzleLoot, muzzlePaid]),
  "loot-gun",
  {
    ...defaultConstraints(),
    objective: "recoil",
    flea: false,
    includeLoot: false,
  },
);
assert(
  shopOnly.parts.some((part) => part.itemId === "muzzle-paid"),
  "loot off: pièce trader attendue",
);
assert(
  shopOnly.parts.every((part) => part.itemId !== "muzzle-loot"),
  "loot off: pièce loot exclue",
);

const muzzleHot = item({
  id: "muzzle-hot",
  name: "Muzzle hot",
  recoilModifier: -10,
  heatFactor: 1.2,
  coolingFactor: 0.9,
});
const muzzleCool = item({
  id: "muzzle-cool",
  name: "Muzzle cool",
  recoilModifier: -10,
  heatFactor: 0.85,
  coolingFactor: 0.9,
});
const thermoGun = item({
  id: "thermo-gun",
  name: "Thermo gun",
  isWeapon: true,
  baseRecoilVertical: 100,
  baseRecoilHorizontal: 200,
  baseErgonomics: 40,
  slots: [slot("muzzle", "Muzzle", ["muzzle-hot", "muzzle-cool"], true)],
});
const thermoBuild = optimizeWeapon(
  catalogOf([thermoGun, muzzleHot, muzzleCool]),
  "thermo-gun",
  { ...defaultConstraints(), objective: "recoil", flea: false },
);
assert(
  thermoBuild.parts.some((part) => part.itemId === "muzzle-cool"),
  "thermo: moindre chauffe attendue à recul égal",
);
assert(thermoBuild.heatPercent < 0, "thermo: chauffe négative attendue");

const muzzleSlowCool = item({
  id: "muzzle-slow-cool",
  name: "Muzzle slow cool",
  recoilModifier: -10,
  heatFactor: 0.85,
  coolingFactor: 0.8,
});
const muzzleFastCool = item({
  id: "muzzle-fast-cool",
  name: "Muzzle fast cool",
  recoilModifier: -10,
  heatFactor: 0.85,
  coolingFactor: 1.15,
});
const coolGun = item({
  id: "cool-gun",
  name: "Cool gun",
  isWeapon: true,
  baseRecoilVertical: 100,
  baseRecoilHorizontal: 200,
  baseErgonomics: 40,
  slots: [
    slot("muzzle", "Muzzle", ["muzzle-slow-cool", "muzzle-fast-cool"], true),
  ],
});
const coolBuild = optimizeWeapon(
  catalogOf([coolGun, muzzleSlowCool, muzzleFastCool]),
  "cool-gun",
  { ...defaultConstraints(), objective: "recoil", flea: false },
);
assert(
  coolBuild.parts.some((part) => part.itemId === "muzzle-fast-cool"),
  "thermo: meilleur refroidissement attendu à chauffe égale",
);
assert(coolBuild.coolingPercent > 0, "thermo: refroidissement positif attendu");

const chargeWeak = item({
  id: "charge-weak",
  name: "Charge weak",
  recoilModifier: 0,
  ergonomicsModifier: 0.5,
});
const chargeStrong = item({
  id: "charge-strong",
  name: "Charge strong",
  recoilModifier: 0,
  ergonomicsModifier: 3,
});
const chargeGun = item({
  id: "charge-gun",
  name: "Charge gun",
  isWeapon: true,
  baseRecoilVertical: 100,
  baseRecoilHorizontal: 200,
  baseErgonomics: 40,
  slots: [
    slot("mod_charge", "Charge", ["charge-weak", "charge-strong"], true),
  ],
});
const chargeBuild = optimizeWeapon(
  catalogOf([chargeGun, chargeWeak, chargeStrong]),
  "charge-gun",
  { ...defaultConstraints(), objective: "recoil", flea: false },
);
assert(
  chargeBuild.parts.some((part) => part.itemId === "charge-strong"),
  "levier: meilleur ergo à recul égal attendu",
);

const capPad = item({
  id: "cap-pad",
  name: "Cap pad",
  recoilModifier: 0,
  ergonomicsModifier: 20,
});
const capBrake = item({
  id: "cap-brake",
  name: "Cap brake",
  recoilModifier: -12,
  ergonomicsModifier: 5,
});
const capGun = item({
  id: "cap-gun",
  name: "Cap gun",
  isWeapon: true,
  baseRecoilVertical: 100,
  baseRecoilHorizontal: 200,
  baseErgonomics: 96,
  slots: [slot("muzzle", "Muzzle", ["cap-pad", "cap-brake"], true)],
});
const capCatalog = catalogOf([capGun, capPad, capBrake]);
const capErgo = optimizeWeapon(capCatalog, "cap-gun", {
  ...defaultConstraints(),
  objective: "ergonomics",
  flea: false,
});
assert(
  capErgo.parts.some((part) => part.itemId === "cap-brake"),
  "ergo max: au plafond 100, le recul doit gagner sur l'ergo inutile",
);
assert(capErgo.ergonomics <= 100, "ergo max: affichage plafonné à 100");

const capBalanced = optimizeWeapon(capCatalog, "cap-gun", {
  ...defaultConstraints(),
  objective: "balanced",
  flea: false,
});
assert(
  capBalanced.parts.some((part) => part.itemId === "cap-brake"),
  "équilibré: l'ergo au-delà de 100 ne doit pas battre un meilleur recul",
);

const lowCapGun = item({
  id: "low-cap-gun",
  name: "Low cap gun",
  isWeapon: true,
  baseRecoilVertical: 100,
  baseRecoilHorizontal: 200,
  baseErgonomics: 40,
  slots: [slot("muzzle", "Muzzle", ["cap-pad", "cap-brake"], true)],
});
const lowCapErgo = optimizeWeapon(
  catalogOf([lowCapGun, capPad, capBrake]),
  "low-cap-gun",
  { ...defaultConstraints(), objective: "ergonomics", flea: false },
);
assert(
  lowCapErgo.parts.some((part) => part.itemId === "cap-pad"),
  "ergo max: sous 100, l'ergo reste prioritaire",
);

const weightLight = item({
  id: "weight-light",
  name: "Weight light",
  recoilModifier: -8,
  weight: 0.2,
});
const weightHeavy = item({
  id: "weight-heavy",
  name: "Weight heavy",
  recoilModifier: -8,
  weight: 2.4,
});
const weightGun = item({
  id: "weight-gun",
  name: "Weight gun",
  isWeapon: true,
  baseRecoilVertical: 100,
  baseRecoilHorizontal: 200,
  baseErgonomics: 50,
  weight: 1,
  slots: [slot("muzzle", "Muzzle", ["weight-light", "weight-heavy"], true)],
});
const weightBalanced = optimizeWeapon(
  catalogOf([weightGun, weightLight, weightHeavy]),
  "weight-gun",
  { ...defaultConstraints(), objective: "balanced", flea: false },
);
assert(
  weightBalanced.parts.some((part) => part.itemId === "weight-light"),
  "équilibré: à recul/ergo égaux, la pièce légère gagne",
);
assert(weightBalanced.weightKg < 2, "équilibré: poids total trop élevé");

const nestedPrs = item({
  id: "nested-prs",
  name: "Nested PRS",
  recoilModifier: -24,
  conflictingItemIds: ["nested-cheek"],
});
const nestedCheek = item({
  id: "nested-cheek",
  name: "Nested cheek",
  recoilModifier: -19,
  conflictingItemIds: ["nested-prs"],
});
const tubeFat = item({
  id: "tube-fat",
  name: "Tube fat",
  recoilModifier: -0.5,
  slots: [
    slot("mod_stock_000", "Stock", ["nested-prs"]),
    slot("mod_stock_003", "Cheek", ["nested-cheek"]),
  ],
});
const tubeLean = item({
  id: "tube-lean",
  name: "Tube lean",
  recoilModifier: -1,
  slots: [slot("mod_stock", "Stock", ["nested-prs"])],
});
const tubeGun = item({
  id: "tube-gun",
  name: "Tube gun",
  isWeapon: true,
  baseRecoilVertical: 100,
  baseRecoilHorizontal: 200,
  baseErgonomics: 40,
  slots: [slot("mod_stock", "Tube", ["tube-fat", "tube-lean"], true)],
});
const tubeBuild = optimizeWeapon(
  catalogOf([tubeGun, tubeFat, tubeLean, nestedPrs, nestedCheek]),
  "tube-gun",
  { ...defaultConstraints(), objective: "recoil", flea: false },
);
assert(
  tubeBuild.parts.some((part) => part.itemId === "tube-lean"),
  "tube: Magpul ERE analog attendu (pas le tube au potentiel fantôme)",
);

const muzzleBrake = item({
  id: "muzzle-brake",
  name: "Muzzle brake",
  recoilModifier: -15,
});
const muzzleSilencer = item({
  id: "muzzle-silencer",
  name: "Muzzle silencer",
  recoilModifier: -5,
  isSuppressor: true,
});
const silencedGun = item({
  id: "silenced-gun",
  name: "Silenced gun",
  isWeapon: true,
  baseRecoilVertical: 100,
  baseRecoilHorizontal: 200,
  baseErgonomics: 40,
  slots: [
    slot("mod_muzzle", "Muzzle", ["muzzle-brake", "muzzle-silencer"], true),
  ],
});
const openMuzzle = optimizeWeapon(
  catalogOf([silencedGun, muzzleBrake, muzzleSilencer]),
  "silenced-gun",
  { ...defaultConstraints(), objective: "recoil", flea: false },
);
assert(
  openMuzzle.parts.some((part) => part.itemId === "muzzle-brake"),
  "sans bouton: frein de bouche attendu",
);
assert(!openMuzzle.hasSuppressor, "sans bouton: pas de silencieux");

const forcedSilencer = optimizeWeapon(
  catalogOf([silencedGun, muzzleBrake, muzzleSilencer]),
  "silenced-gun",
  {
    ...defaultConstraints(),
    objective: "recoil",
    flea: false,
    requireSuppressor: true,
  },
);
assert(
  forcedSilencer.parts.some((part) => part.itemId === "muzzle-silencer"),
  "bouton silencieux: silencieux attendu malgré un recul moins bon",
);
assert(forcedSilencer.hasSuppressor, "bouton silencieux: hasSuppressor");

const muzzleAdapter = item({
  id: "muzzle-adapter",
  name: "Muzzle adapter",
  recoilModifier: 0,
  slots: [slot("mod_muzzle_001", "Can", ["nested-silencer"])],
});
const nestedSilencer = item({
  id: "nested-silencer",
  name: "Nested silencer",
  recoilModifier: -5,
  isSuppressor: true,
});
const adapterGun = item({
  id: "adapter-gun",
  name: "Adapter gun",
  isWeapon: true,
  baseRecoilVertical: 100,
  baseRecoilHorizontal: 200,
  baseErgonomics: 40,
  slots: [
    slot("mod_muzzle", "Muzzle", ["muzzle-brake", "muzzle-adapter"], true),
  ],
});
const nestedForced = optimizeWeapon(
  catalogOf([adapterGun, muzzleBrake, muzzleAdapter, nestedSilencer]),
  "adapter-gun",
  {
    ...defaultConstraints(),
    objective: "recoil",
    flea: false,
    requireSuppressor: true,
  },
);
assert(
  nestedForced.parts.some((part) => part.itemId === "muzzle-adapter") &&
    nestedForced.parts.some((part) => part.itemId === "nested-silencer"),
  "bouton silencieux: adaptateur + silencieux imbriqué attendus",
);
assert(nestedForced.hasSuppressor, "bouton silencieux imbriqué: hasSuppressor");

const mag30 = item({
  id: "mag-30",
  name: "Mag 30",
  magazineCapacity: 30,
  weight: 0.8,
  ergonomicsModifier: -3,
  magazineLoadModifier: 0,
  magazineCheckModifier: 0,
  excludeFromAutoBuild: true,
});
const mag30Light = item({
  id: "mag-30-light",
  name: "Mag 30 light",
  magazineCapacity: 30,
  weight: 0.1,
  ergonomicsModifier: -8,
  magazineLoadModifier: 0,
  magazineCheckModifier: 0,
  excludeFromAutoBuild: true,
});
const mag30Slow = item({
  id: "mag-30-slow",
  name: "Mag 30 slow",
  magazineCapacity: 30,
  weight: 0.1,
  ergonomicsModifier: -3,
  magazineLoadModifier: 0.25,
  magazineCheckModifier: 0,
  excludeFromAutoBuild: true,
});
const mag20 = item({
  id: "mag-20",
  name: "Mag 20",
  magazineCapacity: 20,
  weight: 0.35,
  ergonomicsModifier: 4,
  magazineLoadModifier: -0.2,
  magazineCheckModifier: -0.15,
  excludeFromAutoBuild: true,
});
const mag60 = item({
  id: "mag-60",
  name: "Mag 60",
  magazineCapacity: 60,
  weight: 0.9,
  ergonomicsModifier: -18,
  magazineLoadModifier: 0.1,
  magazineCheckModifier: 0.1,
  excludeFromAutoBuild: true,
});
const mag100 = item({
  id: "mag-100",
  name: "Mag 100",
  magazineCapacity: 100,
  weight: 1.6,
  ergonomicsModifier: -25,
  excludeFromAutoBuild: true,
});
const magGun = item({
  id: "mag-gun",
  name: "Mag gun",
  isWeapon: true,
  baseRecoilVertical: 100,
  baseRecoilHorizontal: 200,
  baseErgonomics: 50,
  weight: 2,
  slots: [
    slot("muzzle", "Muzzle", ["muzzle-recoil"], true),
    slot(
      "mod_magazine",
      "Chargeur",
      ["mag-30", "mag-30-light", "mag-30-slow", "mag-20", "mag-60", "mag-100"],
      true,
    ),
  ],
});
const magCatalog = catalogOf([
  magGun,
  muzzleRecoil,
  mag30,
  mag30Light,
  mag30Slow,
  mag20,
  mag60,
  mag100,
]);
const magStd = optimizeWeapon(magCatalog, "mag-gun", {
  ...defaultConstraints(),
  objective: "balanced",
  flea: false,
  magazineClass: "std",
});
assert(
  magStd.parts.some((part) => part.itemId === "mag-30"),
  "chargeur: 30 mini, pas un 20 même avec une meilleure ergo",
);
assert(
  magStd.parts.every(
    (part) =>
      part.itemId !== "mag-20" &&
      part.itemId !== "mag-30-light" &&
      part.itemId !== "mag-30-slow" &&
      part.itemId !== "mag-60" &&
      part.itemId !== "mag-100",
  ),
  "chargeur std: 20/léger/lent/60/100 exclus",
);

const magStdTie = optimizeWeapon(
  catalogOf([magGun, muzzleRecoil, mag30, mag30Light, mag30Slow, mag60, mag100]),
  "mag-gun",
  {
    ...defaultConstraints(),
    objective: "balanced",
    flea: false,
    magazineClass: "std",
  },
);
assert(
  magStdTie.parts.some((part) => part.itemId === "mag-30"),
  "chargeur: à ergo égale, load plus rapide (0 vs +0.25) puis pas le plus léger",
);
assert(
  magStdTie.parts.every(
    (part) => part.itemId !== "mag-30-light" && part.itemId !== "mag-30-slow",
  ),
  "chargeur: ni le léger pire ergo, ni le lent",
);

const magDrum = optimizeWeapon(magCatalog, "mag-gun", {
  ...defaultConstraints(),
  objective: "balanced",
  flea: false,
  magazineClass: "drum",
});
assert(
  magDrum.parts.some((part) => part.itemId === "mag-60"),
  "chargeur: drum 60 attendu",
);
assert(
  magDrum.parts.every((part) => part.itemId !== "mag-100"),
  "chargeur drum: 100 exclu",
);
assert(magDrum.weightKg > magStd.weightKg, "chargeur drum: plus lourd que le 30");

const share = serializeShareQuery({
  weaponId: "abc",
  objective: "recoil",
  requireSuppressor: true,
  magazineClass: "drum",
  flea: true,
  includeQuestLocked: false,
  includeLoot: false,
  budget: "",
  traders: defaultConstraints().traders,
  parts: [{ slotId: "muzzle", itemId: "muzzle-recoil" }],
});
const parsedShare = parseShareQuery(new URLSearchParams(share));
assert(parsedShare.weaponId === "abc", "lien: arme");
assert(parsedShare.objective === "recoil", "lien: objectif");
assert(parsedShare.requireSuppressor === true, "lien: silencieux");
assert(parsedShare.magazineClass === "drum", "lien: mag 60");
assert(parsedShare.includeLoot === false, "lien: loot off");
assert(parsedShare.parts?.[0]?.itemId === "muzzle-recoil", "lien: pièce figée");
const shareFr = serializeShareQuery(
  {
    weaponId: "abc",
    objective: "recoil",
    requireSuppressor: true,
    magazineClass: "drum",
    flea: true,
    includeQuestLocked: false,
    includeLoot: false,
    budget: "",
    traders: defaultConstraints().traders,
    parts: [{ slotId: "muzzle", itemId: "muzzle-recoil" }],
  },
  "fr",
);
assert(shareFr.includes("lang=fr"), "lien: lang fr");
const embedEn = buildEmbed(new URLSearchParams("obj=recoil&sil=1"), {
  name: "Colt M4A1",
  shortName: "M4A1",
  iconLink: null,
});
assert(embedEn.title.includes("M4A1"), "embed: titre");
assert(embedEn.locale === "en", "embed: en par défaut");
assert(
  embedEn.tags.some((tag) => tag.toLowerCase().includes("recoil")),
  "embed: objectif",
);
const embedFr = buildEmbed(new URLSearchParams("lang=fr&frozen=1"), null);
assert(embedFr.locale === "fr", "embed: fr");
assert(embedFr.title === "Tarkov Optibuild", "embed: site sans arme");

const hydrated = hydrateBuild(
  catalog,
  "gun",
  [
    { slotId: "grip", itemId: "grip-recoil" },
    { slotId: "muzzle", itemId: "muzzle-recoil" },
  ],
  { ...defaultConstraints(), objective: "recoil", flea: false },
);
assert(hydrated.snapshot === true, "hydrate: snapshot");
assert(hydrated.truncated === false, "hydrate: pas truncated");
assert(
  hydrated.parts.map((part) => part.itemId).join() === "grip-recoil,muzzle-recoil",
  "hydrate: pièces dans l’ordre",
);
assert(hydrated.recoilVertical < 100, "hydrate: recul calculé");
assert(hydrated.weaponShortName === "Test Rifle", "hydrate: shortName");
assert(
  hydrated.modding.some((slot) => slot.slotId === "mod_scope" && !slot.part),
  "modding: optique vide",
);
assert(
  hydrated.modding.some((slot) => slot.slotId === "mod_launcher" && !slot.part),
  "modding: lanceur vide",
);
assert(
  hydrated.modding.some(
    (slot) => slot.slotId === "grip" && slot.part?.itemId === "grip-recoil",
  ),
  "modding: poignée remplie",
);

const nestedFlat = flattenModdingSlots(nestedForced.modding);
assert(
  nestedFlat.some(
    (slot) =>
      slot.slotId === "mod_muzzle" && slot.part?.itemId === "muzzle-adapter",
  ),
  "modding nested: adaptateur",
);
assert(
  nestedFlat.some(
    (slot) =>
      slot.slotId === "mod_muzzle_001" && slot.part?.itemId === "nested-silencer",
  ),
  "modding nested: silencieux enfant",
);
assert(
  nestedFlat.findIndex((slot) => slot.slotId === "mod_muzzle") <
    nestedFlat.findIndex((slot) => slot.slotId === "mod_muzzle_001"),
  "modding nested: parent avant enfant",
);
assert(slotBoardLabel("mod_barrel", "x", "fr") === "CANON", "modding: label canon");
assert(slotBoardLabel("mod_muzzle_001", "x", "fr") === "MUSE", "modding: label muse");

const shop = shoppingList(hydrated.parts);
assert(shop.length >= 1, "liste d’achat: groupe");
const shopText = shoppingListText(
  hydrated.weaponName,
  hydrated.parts,
  hydrated.costRub,
  {
    heading: "Liste d’achat — {name}",
    total: "Total : {cost}",
    locale: "fr-FR",
    unavailable: "Indispo",
  },
);
assert(shopText.includes("Liste d’achat"), "liste d’achat: titre");
assert(shopText.includes("Total"), "liste d’achat: total");

const carryScopes = ["ch-s1", "ch-s2", "ch-s3"].map((id) =>
  item({ id, name: id }),
);
const railScopes = Array.from({ length: MIN_PROPER_OPTIC_OPTIONS }, (_, index) =>
  item({ id: `rail-s${index}`, name: `rail-s${index}` }),
);
const carryUpper = item({
  id: "carry-upper",
  name: "Carry upper",
  recoilModifier: -10,
  slots: [slot("mod_scope", "Scope", carryScopes.map((entry) => entry.id))],
});
const railUpper = item({
  id: "rail-upper",
  name: "Rail upper",
  recoilModifier: -1,
  slots: [slot("mod_scope", "Scope", railScopes.map((entry) => entry.id))],
});
const receiverGun = item({
  id: "receiver-gun",
  name: "Receiver gun",
  isWeapon: true,
  baseRecoilVertical: 100,
  baseRecoilHorizontal: 200,
  baseErgonomics: 40,
  slots: [
    slot("mod_reciever", "Upper", ["carry-upper", "rail-upper"], true),
  ],
});
const receiverCatalog = catalogOf([
  receiverGun,
  carryUpper,
  railUpper,
  ...carryScopes,
  ...railScopes,
]);
const receiverSlot = receiverGun.slots[0];
assert(
  preferOpticReadyReceivers(receiverSlot, [carryUpper, railUpper], receiverCatalog)
    .map((entry) => entry.id)
    .join() === "rail-upper",
  "optic-rail: carry handle écarté si picatinny dispo",
);
assert(
  preferOpticReadyReceivers(receiverSlot, [carryUpper], receiverCatalog)[0]?.id ===
    "carry-upper",
  "optic-rail: carry handle gardé s’il est seul",
);
const receiverBuild = optimizeWeapon(receiverCatalog, "receiver-gun", {
  ...defaultConstraints(),
  objective: "recoil",
  flea: false,
});
assert(
  receiverBuild.parts.some((part) => part.itemId === "rail-upper"),
  "optic-rail: l’opti prend le picatinny malgré un recul carry handle meilleur",
);
assert(
  !receiverBuild.parts.some((part) => part.itemId === "carry-upper"),
  "optic-rail: carry handle absent du build",
);

const carryOnlyGun = item({
  id: "carry-only-gun",
  name: "Carry only gun",
  isWeapon: true,
  baseRecoilVertical: 100,
  baseRecoilHorizontal: 200,
  baseErgonomics: 40,
  slots: [slot("mod_reciever", "Upper", ["carry-upper"], true)],
});
const carryOnlyBuild = optimizeWeapon(
  catalogOf([carryOnlyGun, carryUpper, ...carryScopes]),
  "carry-only-gun",
  { ...defaultConstraints(), objective: "recoil", flea: false },
);
assert(
  carryOnlyBuild.parts.some((part) => part.itemId === "carry-upper"),
  "optic-rail: slot requis toujours rempli s’il n’y a que le carry handle",
);
assert(
  snapshotUsesBlockedReceiver(
    receiverCatalog,
    "receiver-gun",
    [{ slotId: "mod_reciever", itemId: "carry-upper" }],
    defaultConstraints(),
  ),
  "optic-rail: snapshot carry handle rejeté si picatinny achetable",
);
assert(
  !snapshotUsesBlockedReceiver(
    receiverCatalog,
    "receiver-gun",
    [{ slotId: "mod_reciever", itemId: "rail-upper" }],
    defaultConstraints(),
  ),
  "optic-rail: snapshot picatinny conservé",
);
assert(
  !snapshotUsesBlockedReceiver(
    catalogOf([carryOnlyGun, carryUpper, ...carryScopes]),
    "carry-only-gun",
    [{ slotId: "mod_reciever", itemId: "carry-upper" }],
    defaultConstraints(),
  ),
  "optic-rail: snapshot carry handle conservé s’il n’y a pas d’alternative",
);

console.log("self-test ok", {
  recoil: recoilBuild.parts.map((part) => part.itemId),
  ergo: ergoBuild.parts.map((part) => part.itemId),
  conflict: conflictBuild.parts.map((part) => part.itemId),
  loot: lootBuild.parts.map((part) => part.itemId),
  thermo: thermoBuild.parts.map((part) => part.itemId),
  cool: coolBuild.parts.map((part) => part.itemId),
  charge: chargeBuild.parts.map((part) => part.itemId),
  tube: tubeBuild.parts.map((part) => part.itemId),
  capErgo: capErgo.parts.map((part) => part.itemId),
  capBalanced: capBalanced.parts.map((part) => part.itemId),
  lowCapErgo: lowCapErgo.parts.map((part) => part.itemId),
  weightBalanced: weightBalanced.parts.map((part) => part.itemId),
  silencerOff: openMuzzle.parts.map((part) => part.itemId),
  silencerOn: forcedSilencer.parts.map((part) => part.itemId),
  silencerNested: nestedForced.parts.map((part) => part.itemId),
  magStd: magStd.parts.map((part) => part.itemId),
  magDrum: magDrum.parts.map((part) => part.itemId),
  railUpper: receiverBuild.parts.map((part) => part.itemId),
  share,
  hydrated: hydrated.parts.map((part) => part.itemId),
});
