import { cheapestOffer } from "./availability";
import { pickMagazine } from "./magazine";
import { buildModdingTree, type ModdingSlot } from "./modding";
import { preferOpticReadyReceivers, isReceiverSlot } from "./optic-rail";
import {
  autoBuildSlots,
  isIronSightSlot,
  isPlayerChoiceItem,
} from "./player-choice";
import { resolveSlotItems } from "./slots";
import type {
  Catalog,
  CatalogItem,
  ItemSlot,
  Objective,
  OptimizeConstraints,
} from "../tarkov/types";

const MAX_CANDIDATES_PER_SLOT = 20;
export const DEFAULT_TIME_BUDGET_MS = 4000;
export const DEFAULT_MAX_NODES = 650_000;
const MIN_BRANCH_NODES = 10_000;
const RANK_POOL_FACTOR = 2;
const SUPPRESSOR_RANK = 1_000_000_000_000;
const ERGO_CAP = 100;
const RAW_WEIGHT_SHARE = 0.35;
const HANDLING_TO_RECOIL = 5;

export type BuildPart = {
  slotId: string;
  slotName: string;
  slotNameId: string;
  itemId: string;
  name: string;
  shortName: string;
  iconLink: string | null;
  recoilModifier: number;
  ergonomicsModifier: number;
  heatFactor: number;
  coolingFactor: number;
  weight: number;
  priceRub: number;
  vendor: string;
};

export type OptimizeResult = {
  weaponId: string;
  weaponName: string;
  weaponShortName: string;
  iconLink: string | null;
  objective: Objective;
  parts: BuildPart[];
  modding: ModdingSlot[];
  recoilModifierSum: number;
  ergonomicsModifierSum: number;
  recoilVertical: number;
  recoilHorizontal: number;
  ergonomics: number;
  heatPercent: number;
  coolingPercent: number;
  weightKg: number;
  hasSuppressor: boolean;
  costRub: number;
  truncated: boolean;
  snapshot?: boolean;
  nodesVisited: number;
  elapsedMs: number;
  profile?: OptimizeProfile;
};

export type OptimizeOptions = {
  timeBudgetMs?: number;
  maxNodes?: number;
  profile?: boolean;
};

export type SlotProfile = {
  calls: number;
  ms: number;
  itemsRanked: number;
  cap: number;
  branching: number;
};

export type OptimizeProfile = {
  searchCalls: number;
  slotCandidatesCalls: number;
  slotCandidatesMs: number;
  conflictAwareCalls: number;
  conflictAwareMs: number;
  resolveSlotItemsCalls: number;
  resolveSlotItemsMs: number;
  slotExplosionCalls: number;
  slotExplosionMs: number;
  slots: Record<string, SlotProfile>;
  barrelCandidates: string[];
  barrelsVisited: string[];
};

type Potential = {
  minRecoil: number;
  maxErgo: number;
  weight: number;
  heat: number;
  cool: number;
  hasSuppressor: boolean;
};

type Chosen = {
  slotId: string;
  slotName: string;
  slotNameId: string;
  item: CatalogItem;
  priceRub: number;
  vendor: string;
};

type RankContext = {
  recoilSum: number;
  ergoSum: number;
  heat: number;
  cool: number;
  weight: number;
};

type SearchState = {
  catalog: Catalog;
  constraints: OptimizeConstraints;
  available: Set<string>;
  prices: Map<string, { priceRub: number; label: string }>;
  potentials: Map<string, Potential>;
  deadline: number;
  nodeCeiling: number;
  maxNodes: number;
  timeBudgetMs: number;
  nodes: number;
  truncated: boolean;
  best: Chosen[] | null;
  bestRecoil: number;
  bestErgo: number;
  bestHeat: number;
  bestCool: number;
  bestWeight: number;
  bestCost: number;
  weapon: CatalogItem;
  slotItemCache: Map<ItemSlot, CatalogItem[]>;
  slotExplosionCache: Map<ItemSlot, number>;
  minFillCache: Map<ItemSlot, number>;
  profile: OptimizeProfile | null;
  barrelCandidates: Set<string>;
  barrelsVisited: Set<string>;
};

function emptyProfile(): OptimizeProfile {
  return {
    searchCalls: 0,
    slotCandidatesCalls: 0,
    slotCandidatesMs: 0,
    conflictAwareCalls: 0,
    conflictAwareMs: 0,
    resolveSlotItemsCalls: 0,
    resolveSlotItemsMs: 0,
    slotExplosionCalls: 0,
    slotExplosionMs: 0,
    slots: {},
    barrelCandidates: [],
    barrelsVisited: [],
  };
}

function itemsInSlot(slot: ItemSlot, state: SearchState): CatalogItem[] {
  const cached = state.slotItemCache.get(slot);
  if (cached) return cached;
  const start = state.profile ? performance.now() : 0;
  let items = resolveSlotItems(slot, state.catalog);
  if (isReceiverSlot(slot)) {
    const available = items.filter((item) => state.available.has(item.id));
    const ready = preferOpticReadyReceivers(slot, available, state.catalog);
    if (ready.length > 0 && ready.length < available.length) {
      items = ready;
    }
  }
  if (state.profile) {
    state.profile.resolveSlotItemsCalls += 1;
    state.profile.resolveSlotItemsMs += performance.now() - start;
  }
  state.slotItemCache.set(slot, items);
  return items;
}

function slotHasPricedItems(slot: ItemSlot, state: SearchState): boolean {
  for (const item of itemsInSlot(slot, state)) {
    if (!state.available.has(item.id) || isPlayerChoiceItem(item, slot)) continue;
    if (state.prices.has(item.id)) return true;
  }
  return false;
}

function minRequiredSlotsCost(
  slots: ItemSlot[],
  state: SearchState,
  visiting: Set<string>,
): number {
  let sum = 0;
  for (const slot of autoBuildSlots(slots)) {
    if (!slot.required) continue;
    sum += minSlotFillCost(slot, state, visiting);
  }
  return sum;
}

function minSlotFillCost(
  slot: ItemSlot,
  state: SearchState,
  visiting: Set<string>,
): number {
  if (visiting.size === 0) {
    const cached = state.minFillCache.get(slot);
    if (cached !== undefined) return cached;
  }
  let min = Number.POSITIVE_INFINITY;
  for (const item of itemsInSlot(slot, state)) {
    if (!state.available.has(item.id) || isPlayerChoiceItem(item, slot)) continue;
    if (visiting.has(item.id)) continue;
    const offer = state.prices.get(item.id);
    if (!offer) continue;
    visiting.add(item.id);
    const nested = minRequiredSlotsCost(item.slots, state, visiting);
    visiting.delete(item.id);
    min = Math.min(min, offer.priceRub + nested);
  }
  const value = Number.isFinite(min) ? min : 0;
  if (visiting.size === 0) state.minFillCache.set(slot, value);
  return value;
}

function slotProfile(state: SearchState, nameId: string): SlotProfile | null {
  if (!state.profile) return null;
  const current = state.profile.slots[nameId];
  if (current) return current;
  const created: SlotProfile = {
    calls: 0,
    ms: 0,
    itemsRanked: 0,
    cap: 0,
    branching: 0,
  };
  state.profile.slots[nameId] = created;
  return created;
}

function isBarrelSlot(slot: ItemSlot): boolean {
  return slot.nameId.toLowerCase().includes("barrel");
}

function finalRecoil(weapon: CatalogItem, recoilSum: number): number {
  return Math.max(1, weapon.baseRecoilVertical * (1 + recoilSum / 100));
}

function finalErgo(weapon: CatalogItem, ergoSum: number): number {
  return weapon.baseErgonomics + ergoSum;
}

function effectiveErgo(weapon: CatalogItem, ergoSum: number): number {
  return Math.min(ERGO_CAP, finalErgo(weapon, ergoSum));
}

function handlingMass(weightKg: number, ergo: number): number {
  const clamped = Math.min(ERGO_CAP, Math.max(0, ergo));
  return weightKg * (1 - clamped / ERGO_CAP + RAW_WEIGHT_SHARE);
}

function balancedScore(
  weapon: CatalogItem,
  recoilSum: number,
  ergoSum: number,
  weightKg: number,
  heat: number,
  cool: number,
): number {
  return (
    -finalRecoil(weapon, recoilSum) -
    HANDLING_TO_RECOIL *
      handlingMass(weightKg, effectiveErgo(weapon, ergoSum)) +
    thermoTiebreak(heat, cool) * 0.01
  );
}

function factorToPercent(factor: number): number {
  return Math.round((factor - 1) * 1000) / 10;
}

function thermoTiebreak(heat: number, cool: number): number {
  return -heat * 10 + cool;
}

function suppressorRank(
  rank: number,
  hasSuppressor: boolean,
  requireSuppressor: boolean,
): number {
  return requireSuppressor && hasSuppressor ? rank + SUPPRESSOR_RANK : rank;
}

function objectiveRank(
  recoilSum: number,
  ergoSum: number,
  heat: number,
  cool: number,
  objective: Objective,
  weapon: CatalogItem,
  weightKg: number,
): number {
  const recoil = finalRecoil(weapon, recoilSum);
  const ergo = effectiveErgo(weapon, ergoSum);
  const thermo = thermoTiebreak(heat, cool);
  if (objective === "ergonomics") {
    return ergo * 1_000_000 - recoil * 1_000 + thermo;
  }
  if (objective === "recoil") {
    return -recoil * 1_000_000 + ergo * 1_000 + thermo;
  }
  return balancedScore(weapon, recoilSum, ergoSum, weightKg, heat, cool);
}

function rankWith(state: SearchState, ctx: RankContext): number {
  return objectiveRank(
    ctx.recoilSum,
    ctx.ergoSum,
    ctx.heat,
    ctx.cool,
    state.constraints.objective,
    state.weapon,
    ctx.weight,
  );
}

function isBetter(
  state: SearchState,
  recoilSum: number,
  ergoSum: number,
  heat: number,
  cool: number,
  cost: number,
  weightKg: number,
): boolean {
  const objective = state.constraints.objective;
  if (!state.best) return true;

  const candidateErgo = effectiveErgo(state.weapon, ergoSum);
  const bestErgo = effectiveErgo(state.weapon, state.bestErgo);

  if (objective === "recoil") {
    if (recoilSum !== state.bestRecoil) return recoilSum < state.bestRecoil;
    if (candidateErgo !== bestErgo) return candidateErgo > bestErgo;
    if (Math.abs(heat - state.bestHeat) > 1e-6) return heat < state.bestHeat;
    if (Math.abs(cool - state.bestCool) > 1e-6) return cool > state.bestCool;
    return cost < state.bestCost;
  }

  if (objective === "ergonomics") {
    if (candidateErgo !== bestErgo) return candidateErgo > bestErgo;
    if (recoilSum !== state.bestRecoil) return recoilSum < state.bestRecoil;
    if (Math.abs(heat - state.bestHeat) > 1e-6) return heat < state.bestHeat;
    if (Math.abs(cool - state.bestCool) > 1e-6) return cool > state.bestCool;
    return cost < state.bestCost;
  }

  const candidate = balancedScore(
    state.weapon,
    recoilSum,
    ergoSum,
    weightKg,
    heat,
    cool,
  );
  const current = balancedScore(
    state.weapon,
    state.bestRecoil,
    state.bestErgo,
    state.bestWeight,
    state.bestHeat,
    state.bestCool,
  );
  if (Math.abs(candidate - current) > 0.01) return candidate > current;
  if (Math.abs(heat - state.bestHeat) > 1e-6) return heat < state.bestHeat;
  if (Math.abs(cool - state.bestCool) > 1e-6) return cool > state.bestCool;
  if (Math.abs(weightKg - state.bestWeight) > 1e-6) return weightKg < state.bestWeight;
  return cost < state.bestCost;
}

function computePotential(
  item: CatalogItem,
  state: SearchState,
  visiting: Set<string>,
): Potential {
  const cached = state.potentials.get(item.id);
  if (cached) return cached;
  if (visiting.has(item.id)) {
    return {
      minRecoil: item.recoilModifier,
      maxErgo: item.ergonomicsModifier,
      weight: item.weight,
      heat: 1,
      cool: 1,
      hasSuppressor: false,
    };
  }

  visiting.add(item.id);
  let minRecoil = item.recoilModifier;
  let maxErgo = item.ergonomicsModifier;
  let weight = item.weight;

  for (const slot of autoBuildSlots(item.slots)) {
    const slotPotential = slotPotentialValues(slot, state, visiting);
    minRecoil += slotPotential.minRecoil;
    maxErgo += slotPotential.maxErgo;
    weight += slotPotential.weight;
  }

  visiting.delete(item.id);
  const result = {
    minRecoil,
    maxErgo,
    weight,
    heat: 1,
    cool: 1,
    hasSuppressor: false,
  };
  state.potentials.set(item.id, result);
  return result;
}

function slotPotentialValues(
  slot: ItemSlot,
  state: SearchState,
  visiting: Set<string>,
): Potential {
  let minRecoil = slot.required ? Number.POSITIVE_INFINITY : 0;
  let maxErgo = slot.required ? Number.NEGATIVE_INFINITY : 0;
  let minWeight = slot.required ? Number.POSITIVE_INFINITY : 0;
  let found = false;

  for (const item of itemsInSlot(slot, state)) {
    if (!state.available.has(item.id) || isPlayerChoiceItem(item, slot)) continue;
    found = true;
    const potential = computePotential(item, state, visiting);
    minRecoil = Math.min(minRecoil, potential.minRecoil);
    maxErgo = Math.max(maxErgo, potential.maxErgo);
    minWeight = Math.min(minWeight, potential.weight);
  }

  if (!found) {
    return {
      minRecoil: 0,
      maxErgo: 0,
      weight: 0,
      heat: 1,
      cool: 1,
      hasSuppressor: false,
    };
  }
  if (!slot.required) {
    minRecoil = Math.min(0, minRecoil);
    maxErgo = Math.max(0, maxErgo);
    minWeight = Math.min(0, minWeight);
  }
  return {
    minRecoil,
    maxErgo,
    weight: minWeight,
    heat: 1,
    cool: 1,
    hasSuppressor: false,
  };
}

function remainingBound(
  slots: ItemSlot[],
  state: SearchState,
): Potential {
  let minRecoil = 0;
  let maxErgo = 0;
  let weight = 0;
  for (const slot of autoBuildSlots(slots)) {
    const values = slotPotentialValues(slot, state, new Set());
    minRecoil += values.minRecoil;
    maxErgo += values.maxErgo;
    weight += values.weight;
  }
  return {
    minRecoil,
    maxErgo,
    weight,
    heat: 1,
    cool: 1,
    hasSuppressor: false,
  };
}

function canBeat(
  state: SearchState,
  recoilSum: number,
  ergoSum: number,
  remaining: ItemSlot[],
  weightKg: number,
): boolean {
  if (!state.best) return true;
  const bound = remainingBound(remaining, state);
  const objective = state.constraints.objective;
  const optimisticRecoil = recoilSum + bound.minRecoil;
  const optimisticErgo = ergoSum + bound.maxErgo;
  const optimisticEffective = effectiveErgo(state.weapon, optimisticErgo);
  const bestEffective = effectiveErgo(state.weapon, state.bestErgo);

  if (objective === "recoil") {
    if (optimisticRecoil !== state.bestRecoil) {
      return optimisticRecoil < state.bestRecoil;
    }
    return optimisticEffective >= bestEffective;
  }
  if (objective === "ergonomics") {
    if (optimisticEffective !== bestEffective) {
      return optimisticEffective > bestEffective;
    }
    return optimisticRecoil <= state.bestRecoil;
  }
  return isBetter(
    state,
    optimisticRecoil,
    optimisticErgo,
    1,
    1,
    0,
    weightKg + bound.weight,
  );
}

type Candidate = {
  item: CatalogItem | null;
  priceRub: number;
  vendor: string;
  rank: number;
  hasSuppressor: boolean;
};

function isShallowSlot(slot: ItemSlot): boolean {
  const id = slot.nameId.toLowerCase();
  return (
    id.startsWith("mod_tactical") ||
    id.startsWith("mod_mount") ||
    id.startsWith("mod_flashlight")
  );
}

function isBranchingSlot(slot: ItemSlot, state: SearchState): boolean {
  const id = slot.nameId.toLowerCase();
  return (
    slotExplosion(slot, state) >= 1.5 ||
    id.includes("barrel") ||
    id.includes("reciever") ||
    id.includes("receiver")
  );
}

function candidateCap(slot: ItemSlot, state: SearchState): number {
  if (isShallowSlot(slot)) return 2;
  const id = slot.nameId.toLowerCase();
  if (
    id.includes("reciever") ||
    id.includes("receiver") ||
    slotExplosion(slot, state) >= 2
  ) {
    return 8;
  }
  return MAX_CANDIDATES_PER_SLOT;
}

function lookaheadSlots(slots: ItemSlot[], state: SearchState): ItemSlot[] {
  return slots.filter(
    (slot) => !isShallowSlot(slot) && slotExplosion(slot, state) < 1.5,
  );
}

function childBlocked(
  child: CatalogItem,
  chosen: CatalogItem[],
  extraExcluded: Set<string>,
): boolean {
  if (extraExcluded.has(child.id)) return true;
  for (const prev of chosen) {
    if (prev.conflictingItemIds.includes(child.id)) return true;
    if (child.conflictingItemIds.includes(prev.id)) return true;
  }
  return false;
}

function conflictAwarePotential(
  item: CatalogItem,
  state: SearchState,
  excludedItems: Set<string>,
  visiting: Set<string>,
  ctx: RankContext,
): Potential {
  if (state.profile) state.profile.conflictAwareCalls += 1;
  if (visiting.has(item.id)) {
    return {
      minRecoil: item.recoilModifier,
      maxErgo: item.ergonomicsModifier,
      weight: item.weight,
      heat: item.heatFactor,
      cool: item.coolingFactor,
      hasSuppressor: item.isSuppressor,
    };
  }
  visiting.add(item.id);

  type NestedOption = {
    child: CatalogItem;
    nested: Potential;
    rank: number;
  };

  const needSuppressor = state.constraints.requireSuppressor;
  const childCtx: RankContext = {
    recoilSum: ctx.recoilSum + item.recoilModifier,
    ergoSum: ctx.ergoSum + item.ergonomicsModifier,
    heat: ctx.heat * item.heatFactor,
    cool: ctx.cool * item.coolingFactor,
    weight: ctx.weight + item.weight,
  };
  const slotOptions: { slot: ItemSlot; options: NestedOption[] }[] = [];
  let hasSuppressor = item.isSuppressor;
  for (const slot of autoBuildSlots(item.slots)) {
    const options: NestedOption[] = [];
    for (const child of itemsInSlot(slot, state)) {
      if (!state.available.has(child.id) || isPlayerChoiceItem(child, slot)) continue;
      if (excludedItems.has(child.id)) continue;
      if (item.conflictingItemIds.includes(child.id)) continue;
      const nested = conflictAwarePotential(
        child,
        state,
        excludedItems,
        visiting,
        childCtx,
      );
      options.push({
        child,
        nested,
        rank: suppressorRank(
          rankWith(state, {
            recoilSum: childCtx.recoilSum + nested.minRecoil,
            ergoSum: childCtx.ergoSum + nested.maxErgo,
            heat: childCtx.heat * nested.heat,
            cool: childCtx.cool * nested.cool,
            weight: childCtx.weight + nested.weight,
          }),
          nested.hasSuppressor,
          needSuppressor,
        ),
      });
    }
    options.sort((left, right) => right.rank - left.rank);
    slotOptions.push({ slot, options });
  }

  slotOptions.sort((left, right) => {
    const leftBest = left.options[0]?.rank ?? Number.NEGATIVE_INFINITY;
    const rightBest = right.options[0]?.rank ?? Number.NEGATIVE_INFINITY;
    return rightBest - leftBest;
  });

  let minRecoil = item.recoilModifier;
  let maxErgo = item.ergonomicsModifier;
  let heat = item.heatFactor;
  let cool = item.coolingFactor;
  let weight = item.weight;
  const chosen: CatalogItem[] = [];
  const extraExcluded = new Set(excludedItems);

  for (const { slot, options } of slotOptions) {
    const feasible = options.filter(
      (option) => !childBlocked(option.child, chosen, extraExcluded),
    );
    const pick =
      needSuppressor && !item.isSuppressor
        ? (feasible.find((option) => option.nested.hasSuppressor) ?? feasible[0])
        : feasible[0];
    if (!pick) continue;
    const emptyRank = rankWith(state, {
      recoilSum: ctx.recoilSum + minRecoil,
      ergoSum: ctx.ergoSum + maxErgo,
      heat: ctx.heat * heat,
      cool: ctx.cool * cool,
      weight: ctx.weight + weight,
    });
    const pickRank = suppressorRank(
      rankWith(state, {
        recoilSum: ctx.recoilSum + minRecoil + pick.nested.minRecoil,
        ergoSum: ctx.ergoSum + maxErgo + pick.nested.maxErgo,
        heat: ctx.heat * heat * pick.nested.heat,
        cool: ctx.cool * cool * pick.nested.cool,
        weight: ctx.weight + weight + pick.nested.weight,
      }),
      pick.nested.hasSuppressor,
      needSuppressor,
    );
    if (!slot.required && pickRank <= emptyRank) continue;
    minRecoil += pick.nested.minRecoil;
    maxErgo += pick.nested.maxErgo;
    heat *= pick.nested.heat;
    cool *= pick.nested.cool;
    weight += pick.nested.weight;
    if (pick.nested.hasSuppressor) hasSuppressor = true;
    chosen.push(pick.child);
    extraExcluded.add(pick.child.id);
    for (const id of pick.child.conflictingItemIds) extraExcluded.add(id);
  }

  visiting.delete(item.id);
  return { minRecoil, maxErgo, weight, heat, cool, hasSuppressor };
}

function slotExplosion(slot: ItemSlot, state: SearchState): number {
  if (isIronSightSlot(slot)) return -1;
  const cached = state.slotExplosionCache.get(slot);
  if (cached !== undefined) {
    if (state.profile) state.profile.slotExplosionCalls += 1;
    return cached;
  }
  const start = state.profile ? performance.now() : 0;
  const items = itemsInSlot(slot, state).slice(0, 12);
  let value = 0;
  if (items.length) {
    let nested = 0;
    for (const item of items) nested += autoBuildSlots(item.slots).length;
    value = nested / items.length;
  }
  if (state.profile) {
    state.profile.slotExplosionCalls += 1;
    state.profile.slotExplosionMs += performance.now() - start;
  }
  state.slotExplosionCache.set(slot, value);
  return value;
}

function timedConflictAware(
  item: CatalogItem,
  state: SearchState,
  excludedItems: Set<string>,
  ctx: RankContext,
): Potential {
  if (!state.profile) {
    return conflictAwarePotential(item, state, excludedItems, new Set(), ctx);
  }
  const start = performance.now();
  const result = conflictAwarePotential(item, state, excludedItems, new Set(), ctx);
  state.profile.conflictAwareMs += performance.now() - start;
  return result;
}

function rankItemWithLookahead(
  item: CatalogItem,
  state: SearchState,
  excludedItems: Set<string>,
  siblings: ItemSlot[],
  ctx: RankContext,
  offer: { priceRub: number; label: string },
): Candidate {
  const extraExcluded = new Set(excludedItems);
  for (const id of item.conflictingItemIds) extraExcluded.add(id);
  const potential = timedConflictAware(item, state, extraExcluded, ctx);
  let lookRecoil = 0;
  let lookErgo = 0;
  let lookHeat = 1;
  let lookCool = 1;
  let lookWeight = 0;
  let lookSuppressor = false;
  const installed: RankContext = {
    recoilSum: ctx.recoilSum + potential.minRecoil,
    ergoSum: ctx.ergoSum + potential.maxErgo,
    heat: ctx.heat * potential.heat,
    cool: ctx.cool * potential.cool,
    weight: ctx.weight + potential.weight,
  };
  for (const sibling of siblings) {
    let bestNested: Potential | null = null;
    let bestRank = Number.NEGATIVE_INFINITY;
    for (const child of itemsInSlot(sibling, state)) {
      if (!state.available.has(child.id) || isPlayerChoiceItem(child, sibling)) {
        continue;
      }
      if (extraExcluded.has(child.id)) continue;
      const nested = timedConflictAware(child, state, extraExcluded, installed);
      const rank = suppressorRank(
        rankWith(state, {
          recoilSum: installed.recoilSum + nested.minRecoil,
          ergoSum: installed.ergoSum + nested.maxErgo,
          heat: installed.heat * nested.heat,
          cool: installed.cool * nested.cool,
          weight: installed.weight + nested.weight,
        }),
        nested.hasSuppressor,
        state.constraints.requireSuppressor,
      );
      if (rank > bestRank) {
        bestRank = rank;
        bestNested = nested;
      }
    }
    if (!bestNested) continue;
    const siblingEmpty = rankWith(state, installed);
    if (!sibling.required && bestRank <= siblingEmpty) continue;
    lookRecoil += bestNested.minRecoil;
    lookErgo += bestNested.maxErgo;
    lookHeat *= bestNested.heat;
    lookCool *= bestNested.cool;
    lookWeight += bestNested.weight;
    if (bestNested.hasSuppressor) lookSuppressor = true;
  }
  return {
    item,
    priceRub: offer.priceRub,
    vendor: offer.label,
    hasSuppressor: potential.hasSuppressor,
    rank: suppressorRank(
      rankWith(state, {
        recoilSum: installed.recoilSum + lookRecoil,
        ergoSum: installed.ergoSum + lookErgo,
        heat: installed.heat * lookHeat,
        cool: installed.cool * lookCool,
        weight: installed.weight + lookWeight,
      }),
      potential.hasSuppressor || lookSuppressor,
      state.constraints.requireSuppressor,
    ),
  };
}

function slotCandidates(
  slot: ItemSlot,
  state: SearchState,
  leftover: number,
  excludedItems: Set<string>,
  rest: ItemSlot[],
  ctx: RankContext,
): Candidate[] {
  const started = state.profile ? performance.now() : 0;
  const siblings = lookaheadSlots(rest, state);
  const emptyRank = rankWith(state, ctx);
  const cap = candidateCap(slot, state);
  const reserved =
    leftover === Number.POSITIVE_INFINITY
      ? 0
      : minRequiredSlotsCost(rest, state, new Set());
  const spendable = leftover - reserved;
  let eligible: { item: CatalogItem; offer: { priceRub: number; label: string }; cheap: number }[] =
    [];

  for (const item of itemsInSlot(slot, state)) {
    if (!state.available.has(item.id) || isPlayerChoiceItem(item, slot)) continue;
    if (excludedItems.has(item.id)) continue;
    const offer = state.prices.get(item.id);
    if (!offer) continue;
    if (offer.priceRub > leftover) continue;
    if (leftover !== Number.POSITIVE_INFINITY) {
      const nested = minRequiredSlotsCost(item.slots, state, new Set());
      if (offer.priceRub + nested > spendable) continue;
    }
    const potential = computePotential(item, state, new Set());
    eligible.push({
      item,
      offer,
      cheap: suppressorRank(
        rankWith(state, {
          recoilSum: ctx.recoilSum + potential.minRecoil,
          ergoSum: ctx.ergoSum + potential.maxErgo,
          heat: ctx.heat * potential.heat,
          cool: ctx.cool * potential.cool,
          weight: ctx.weight + potential.weight,
        }),
        item.isSuppressor || potential.hasSuppressor,
        state.constraints.requireSuppressor,
      ),
    });
  }

  eligible = preferOpticReadyReceivers(
    slot,
    eligible,
    state.catalog,
    (entry) => entry.item,
  );

  eligible.sort((left, right) => right.cheap - left.cheap);
  const poolSize = Math.max(cap * RANK_POOL_FACTOR, cap);
  const seen = new Set<string>();
  const pool: typeof eligible = [];
  for (const entry of eligible) {
    if (pool.length >= poolSize) break;
    seen.add(entry.item.id);
    pool.push(entry);
  }
  if (state.constraints.requireSuppressor) {
    for (const entry of eligible) {
      if (seen.has(entry.item.id)) continue;
      if (!entry.item.isSuppressor) continue;
      pool.push(entry);
    }
  }
  if (state.constraints.budget != null) {
    const cheapest = [...eligible].sort(
      (left, right) => left.offer.priceRub - right.offer.priceRub,
    );
    for (const entry of cheapest.slice(0, cap)) {
      if (seen.has(entry.item.id)) continue;
      seen.add(entry.item.id);
      pool.push(entry);
    }
  }

  const ranked: Candidate[] = [];
  for (const entry of pool) {
    if (isBarrelSlot(slot)) state.barrelCandidates.add(entry.item.shortName);
    ranked.push(
      rankItemWithLookahead(
        entry.item,
        state,
        excludedItems,
        siblings,
        ctx,
        entry.offer,
      ),
    );
  }

  ranked.sort((a, b) => b.rank - a.rank);
  const suppressorCapable = ranked.filter((candidate) => candidate.hasSuppressor);
  const selected =
    state.constraints.requireSuppressor && suppressorCapable.length > 0
      ? suppressorCapable
      : ranked;
  const cheapKeep =
    state.constraints.budget != null ? Math.min(3, cap) : 0;
  const limited: Candidate[] = [];
  if (cheapKeep === 0) {
    limited.push(...selected.slice(0, cap));
  } else {
    const topCount = Math.max(1, cap - cheapKeep);
    const top = selected.slice(0, topCount);
    const seen = new Set(
      top.map((candidate) => candidate.item?.id).filter(Boolean),
    );
    limited.push(...top);
    const byPrice = selected
      .filter((candidate) => candidate.item)
      .sort((left, right) => left.priceRub - right.priceRub);
    for (const candidate of byPrice) {
      if (limited.length >= cap) break;
      const id = candidate.item?.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      limited.push(candidate);
    }
  }

  const best = limited[0];
  const skipEmpty =
    Boolean(isIronSightSlot(slot) && best?.item && best.rank > emptyRank) ||
    (state.constraints.requireSuppressor && Boolean(best?.hasSuppressor));
  const allowEmpty =
    !skipEmpty &&
    (!slot.required ||
      (limited.length === 0 && !slotHasPricedItems(slot, state)));

  if (allowEmpty) {
    limited.push({
      item: null,
      priceRub: 0,
      vendor: "",
      rank: emptyRank,
      hasSuppressor: false,
    });
  }

  if (state.profile) {
    state.profile.slotCandidatesCalls += 1;
    state.profile.slotCandidatesMs += performance.now() - started;
    const slotStats = slotProfile(state, slot.nameId);
    if (slotStats) {
      slotStats.calls += 1;
      slotStats.ms += performance.now() - started;
      slotStats.itemsRanked += eligible.length;
      slotStats.cap = cap;
    }
  }

  return limited;
}

function search(
  state: SearchState,
  slots: ItemSlot[],
  chosen: Chosen[],
  excludedItems: Set<string>,
  excludedSlots: Set<string>,
  recoilSum: number,
  ergoSum: number,
  heat: number,
  cool: number,
  spent: number,
  weightKg: number,
): void {
  if (Date.now() > state.deadline || state.nodes > state.maxNodes) {
    state.truncated = true;
    return;
  }
  if (state.nodes > state.nodeCeiling) return;
  state.nodes += 1;
  if (state.profile) state.profile.searchCalls += 1;

  const pending = autoBuildSlots(
    slots.filter((slot) => !excludedSlots.has(slot.id)),
  ).sort((left, right) => {
    const explosion = slotExplosion(left, state) - slotExplosion(right, state);
    if (explosion !== 0) return explosion;
    return left.nameId.localeCompare(right.nameId);
  });
  if (pending.length === 0) {
    if (
      state.constraints.requireSuppressor &&
      !chosen.some((entry) => entry.item.isSuppressor)
    ) {
      return;
    }
    if (isBetter(state, recoilSum, ergoSum, heat, cool, spent, weightKg)) {
      state.best = chosen.slice();
      state.bestRecoil = recoilSum;
      state.bestErgo = ergoSum;
      state.bestHeat = heat;
      state.bestCool = cool;
      state.bestWeight = weightKg;
      state.bestCost = spent;
    }
    return;
  }

  if (!canBeat(state, recoilSum, ergoSum, pending, weightKg)) return;

  const moneyLeft =
    state.constraints.budget == null
      ? Number.POSITIVE_INFINITY
      : Math.max(0, state.constraints.budget - spent);

  const slot = pending[0];
  const rest = pending.slice(1);
  const candidates = slotCandidates(
    slot,
    state,
    moneyLeft,
    excludedItems,
    rest,
    { recoilSum, ergoSum, heat, cool, weight: weightKg },
  );

  const remainingNodes = Math.min(state.maxNodes, state.nodeCeiling) - state.nodes;
  const splitBudget =
    isBranchingSlot(slot, state) &&
    candidates.some((candidate) => candidate.item) &&
    candidates.length > 1;
  if (splitBudget) {
    const slotStats = slotProfile(state, slot.nameId);
    if (slotStats) slotStats.branching += 1;
  }
  let leftover = 0;
  const share = splitBudget
    ? Math.max(MIN_BRANCH_NODES, Math.floor(remainingNodes / candidates.length))
    : remainingNodes;

  for (const candidate of candidates) {
    const savedCeiling = state.nodeCeiling;
    if (splitBudget) {
      const budget = share + leftover;
      state.nodeCeiling = Math.min(savedCeiling, state.nodes + budget);
    }

    if (!candidate.item) {
      search(
        state,
        rest,
        chosen,
        excludedItems,
        excludedSlots,
        recoilSum,
        ergoSum,
        heat,
        cool,
        spent,
        weightKg,
      );
    } else {
      const item = candidate.item;
      if (
        !excludedItems.has(item.id) &&
        !chosen.some((entry) => entry.item.conflictingItemIds.includes(item.id))
      ) {
        const nextExcludedItems = new Set(excludedItems);
        for (const id of item.conflictingItemIds) nextExcludedItems.add(id);

        const nextExcludedSlots = new Set(excludedSlots);
        for (const slotId of item.conflictingSlotIds) nextExcludedSlots.add(slotId);

        const nextChosen = chosen.concat({
          slotId: slot.id,
          slotName: slot.name,
          slotNameId: slot.nameId,
          item,
          priceRub: candidate.priceRub,
          vendor: candidate.vendor,
        });
        if (isBarrelSlot(slot)) state.barrelsVisited.add(item.shortName);

        search(
          state,
          item.slots.concat(rest),
          nextChosen,
          nextExcludedItems,
          nextExcludedSlots,
          recoilSum + item.recoilModifier,
          ergoSum + item.ergonomicsModifier,
          heat * item.heatFactor,
          cool * item.coolingFactor,
          spent + candidate.priceRub,
          weightKg + item.weight,
        );
      }
    }

    if (splitBudget) {
      leftover = Math.max(0, state.nodeCeiling - state.nodes);
      state.nodeCeiling = savedCeiling;
    }
  }
}

function greedyFillLeftovers(state: SearchState): void {
  if (!state.best) return;
  const chosen = state.best.slice();
  const filled = new Set(chosen.map((entry) => entry.slotId));
  const excludedItems = new Set<string>();
  const excludedSlots = new Set<string>();
  for (const entry of chosen) {
    excludedItems.add(entry.item.id);
    for (const id of entry.item.conflictingItemIds) excludedItems.add(id);
    for (const slotId of entry.item.conflictingSlotIds) {
      excludedSlots.add(slotId);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    const pending: ItemSlot[] = autoBuildSlots(state.weapon.slots);
    for (const entry of chosen) {
      pending.push(...autoBuildSlots(entry.item.slots));
    }
    for (const slot of pending) {
      if (filled.has(slot.id) || excludedSlots.has(slot.id)) continue;
      if (!isIronSightSlot(slot)) continue;
      const leftover =
        state.constraints.budget == null
          ? Number.POSITIVE_INFINITY
          : Math.max(0, state.constraints.budget - state.bestCost);
      const candidates = slotCandidates(
        slot,
        state,
        leftover,
        excludedItems,
        [],
        {
          recoilSum: state.bestRecoil,
          ergoSum: state.bestErgo,
          heat: state.bestHeat,
          cool: state.bestCool,
          weight: state.bestWeight,
        },
      );
      const best = candidates.find((candidate) => candidate.item);
      if (!best?.item) continue;
      if (best.priceRub > leftover) continue;
      if (
        best.rank <=
        rankWith(state, {
          recoilSum: state.bestRecoil,
          ergoSum: state.bestErgo,
          heat: state.bestHeat,
          cool: state.bestCool,
          weight: state.bestWeight,
        })
      ) {
        continue;
      }
      chosen.push({
        slotId: slot.id,
        slotName: slot.name,
        slotNameId: slot.nameId,
        item: best.item,
        priceRub: best.priceRub,
        vendor: best.vendor,
      });
      filled.add(slot.id);
      excludedItems.add(best.item.id);
      for (const id of best.item.conflictingItemIds) excludedItems.add(id);
      for (const slotId of best.item.conflictingSlotIds) {
        excludedSlots.add(slotId);
      }
      state.bestRecoil += best.item.recoilModifier;
      state.bestErgo += best.item.ergonomicsModifier;
      state.bestHeat *= best.item.heatFactor;
      state.bestCool *= best.item.coolingFactor;
      state.bestWeight += best.item.weight;
      state.bestCost += best.priceRub;
      changed = true;
    }
  }
  state.best = chosen;
}

function toBuildPart(entry: Chosen): BuildPart {
  return {
    slotId: entry.slotId,
    slotName: entry.slotName,
    slotNameId: entry.slotNameId,
    itemId: entry.item.id,
    name: entry.item.name,
    shortName: entry.item.shortName,
    iconLink: entry.item.iconLink,
    recoilModifier: entry.item.recoilModifier,
    ergonomicsModifier: entry.item.ergonomicsModifier,
    heatFactor: entry.item.heatFactor,
    coolingFactor: entry.item.coolingFactor,
    weight: entry.item.weight,
    priceRub: entry.priceRub,
    vendor: entry.vendor,
  };
}

function attachMagazine(
  state: SearchState,
  initial: ReturnType<typeof pickMagazine>,
): void {
  const chosenItems = (state.best ?? []).map((entry) => entry.item);
  const picked = pickMagazine(
    state.catalog,
    state.weapon,
    state.constraints,
    chosenItems,
  );
  const initialWeight = initial?.item.weight ?? 0;
  const initialErgo = initial?.item.ergonomicsModifier ?? 0;
  const initialRecoil = initial?.item.recoilModifier ?? 0;
  const initialHeat = initial?.item.heatFactor ?? 1;
  const initialCool = initial?.item.coolingFactor ?? 1;
  const nextWeight = picked?.item.weight ?? 0;
  const nextErgo = picked?.item.ergonomicsModifier ?? 0;
  const nextRecoil = picked?.item.recoilModifier ?? 0;
  const nextHeat = picked?.item.heatFactor ?? 1;
  const nextCool = picked?.item.coolingFactor ?? 1;
  const nextCost = picked?.priceRub ?? 0;

  if (state.best) {
    state.bestWeight += nextWeight - initialWeight;
    state.bestErgo += nextErgo - initialErgo;
    state.bestRecoil += nextRecoil - initialRecoil;
    state.bestHeat = (state.bestHeat / initialHeat) * nextHeat;
    state.bestCool = (state.bestCool / initialCool) * nextCool;
    state.bestCost += nextCost;
  }

  if (!picked || !state.best) return;
  state.best.push({
    slotId: picked.slot.id,
    slotName: picked.slot.name,
    slotNameId: picked.slot.nameId,
    item: picked.item,
    priceRub: picked.priceRub,
    vendor: picked.vendor,
  });
}

export function optimizeWeapon(
  catalog: Catalog,
  weaponId: string,
  constraints: OptimizeConstraints,
  options?: OptimizeOptions,
): OptimizeResult {
  const weapon = catalog.items.get(weaponId);
  if (!weapon || !weapon.isWeapon) {
    throw new Error("Arme introuvable dans le catalogue");
  }

  const timeBudgetMs = options?.timeBudgetMs ?? DEFAULT_TIME_BUDGET_MS;
  const maxNodes = options?.maxNodes ?? DEFAULT_MAX_NODES;
  const profileOn =
    options?.profile === true || process.env.OPTIMIZE_PROFILE === "1";

  const prices = new Map<string, { priceRub: number; label: string }>();
  const available = new Set<string>();
  for (const item of catalog.items.values()) {
    if (item.isWeapon) continue;
    const offer = cheapestOffer(item, constraints);
    if (!offer) continue;
    prices.set(item.id, offer);
    available.add(item.id);
  }

  const initialMag = pickMagazine(catalog, weapon, constraints, []);
  const magWeight = initialMag?.item.weight ?? 0;
  const magErgo = initialMag?.item.ergonomicsModifier ?? 0;
  const magRecoil = initialMag?.item.recoilModifier ?? 0;
  const magHeat = initialMag?.item.heatFactor ?? 1;
  const magCool = initialMag?.item.coolingFactor ?? 1;
  const magCost = initialMag?.priceRub ?? 0;
  const searchConstraints: OptimizeConstraints = {
    ...constraints,
    budget:
      constraints.budget == null ? null : Math.max(0, constraints.budget - magCost),
  };

  const state: SearchState = {
    catalog,
    constraints: searchConstraints,
    available,
    prices,
    potentials: new Map(),
    deadline: Date.now() + timeBudgetMs,
    nodeCeiling: maxNodes,
    maxNodes,
    timeBudgetMs,
    nodes: 0,
    truncated: false,
    best: null,
    bestRecoil: magRecoil,
    bestErgo: magErgo,
    bestHeat: magHeat,
    bestCool: magCool,
    bestWeight: weapon.weight + magWeight,
    bestCost: 0,
    weapon,
    slotItemCache: new Map(),
    slotExplosionCache: new Map(),
    minFillCache: new Map(),
    profile: profileOn ? emptyProfile() : null,
    barrelCandidates: new Set(),
    barrelsVisited: new Set(),
  };

  search(
    state,
    weapon.slots,
    [],
    new Set(),
    new Set(),
    magRecoil,
    magErgo,
    magHeat,
    magCool,
    0,
    weapon.weight + magWeight,
  );
  greedyFillLeftovers(state);
  attachMagazine(state, initialMag);

  const parts: BuildPart[] = (state.best ?? []).map(toBuildPart);

  const recoilModifierSum = state.best ? state.bestRecoil : 0;
  const ergonomicsModifierSum = state.best ? state.bestErgo : 0;
  const elapsedMs = timeBudgetMs - Math.max(0, state.deadline - Date.now());

  if (state.profile) {
    state.profile.barrelCandidates = [...state.barrelCandidates].sort();
    state.profile.barrelsVisited = [...state.barrelsVisited].sort();
  }

  return {
    weaponId: weapon.id,
    weaponName: weapon.name,
    weaponShortName: weapon.shortName,
    iconLink: weapon.iconLink,
    objective: constraints.objective,
    parts,
    modding: buildModdingTree(weapon, parts, catalog),
    recoilModifierSum,
    ergonomicsModifierSum,
    recoilVertical: Math.round(finalRecoil(weapon, recoilModifierSum) * 10) / 10,
    recoilHorizontal:
      Math.round(
        weapon.baseRecoilHorizontal * (1 + recoilModifierSum / 100) * 10,
      ) / 10,
    ergonomics: Math.round(effectiveErgo(weapon, ergonomicsModifierSum) * 10) / 10,
    heatPercent: factorToPercent(state.best ? state.bestHeat : 1),
    coolingPercent: factorToPercent(state.best ? state.bestCool : 1),
    weightKg: Math.round((state.best ? state.bestWeight : weapon.weight) * 1000) / 1000,
    hasSuppressor: Boolean(
      state.best?.some((entry) => entry.item.isSuppressor),
    ),
    costRub: state.best ? state.bestCost : 0,
    truncated: state.truncated,
    nodesVisited: state.nodes,
    elapsedMs,
    profile: state.profile ?? undefined,
  };
}
