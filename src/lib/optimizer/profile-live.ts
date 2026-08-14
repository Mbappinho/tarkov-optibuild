import { getCatalog } from "../tarkov/catalog";
import { defaultConstraints } from "../tarkov/defaults";
import type { Objective } from "../tarkov/types";
import {
  DEFAULT_MAX_NODES,
  DEFAULT_TIME_BUDGET_MS,
  optimizeWeapon,
  type OptimizeResult,
} from "./optimize";

const ORACLE_MS = 30_000;
const ORACLE_NODES = 10_000_000;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function findWeapon(
  catalog: Awaited<ReturnType<typeof getCatalog>>,
  test: (shortName: string, name: string) => boolean,
  label: string,
) {
  const weapon = catalog.weapons.find((entry) =>
    test(entry.shortName, entry.name),
  );
  assert(weapon, `${label} introuvable`);
  return weapon;
}

function keyParts(result: OptimizeResult) {
  const pick = (needle: string) =>
    result.parts
      .filter((part) => part.slotNameId.toLowerCase().includes(needle))
      .map((part) => part.shortName);
  return {
    barrel: pick("barrel"),
    receiver: [...pick("reciever"), ...pick("receiver")],
    muzzle: pick("muzzle"),
    stock: pick("stock"),
  };
}

function hansonIn(names: string[]): boolean {
  return names.some((name) => /hanson/i.test(name));
}

function summarize(label: string, result: OptimizeResult) {
  const profile = result.profile;
  const topSlots = Object.entries(profile?.slots ?? {})
    .sort((left, right) => right[1].ms - left[1].ms)
    .slice(0, 8)
    .map(([name, stats]) => ({
      name,
      ms: Math.round(stats.ms),
      calls: stats.calls,
      ranked: stats.itemsRanked,
      cap: stats.cap,
      branching: stats.branching,
    }));

  console.log(label, {
    recoil: result.recoilVertical,
    ergo: result.ergonomics,
    weightKg: result.weightKg,
    truncated: result.truncated,
    nodes: result.nodesVisited,
    elapsedMs: result.elapsedMs,
    nodesPerSec: Math.round(
      (result.nodesVisited / Math.max(1, result.elapsedMs)) * 1000,
    ),
    parts: keyParts(result),
    hansonCandidate: hansonIn(profile?.barrelCandidates ?? []),
    hansonVisited: hansonIn(profile?.barrelsVisited ?? []),
    barrelsVisited: profile?.barrelsVisited,
    timings: profile
      ? {
          slotCandidatesMs: Math.round(profile.slotCandidatesMs),
          conflictAwareMs: Math.round(profile.conflictAwareMs),
          conflictAwareCalls: profile.conflictAwareCalls,
          resolveSlotItemsMs: Math.round(profile.resolveSlotItemsMs),
          resolveSlotItemsCalls: profile.resolveSlotItemsCalls,
          slotExplosionMs: Math.round(profile.slotExplosionMs),
          slotExplosionCalls: profile.slotExplosionCalls,
          searchCalls: profile.searchCalls,
        }
      : null,
    topSlots,
  });
}

async function main() {
  const catalog = await getCatalog();
  const m4 = findWeapon(
    catalog,
    (shortName, name) =>
      shortName === "M4A1" || name.toLowerCase().includes("m4a1"),
    "M4A1",
  );
  const model1 = findWeapon(
    catalog,
    (shortName, name) =>
      (name.toLowerCase().includes("model 1") &&
        name.toLowerCase().includes("fa")) ||
      shortName.toLowerCase().includes("model 1"),
    "Model 1 FA",
  );

  const jobs: { label: string; weaponId: string; objective: Objective }[] = [
    { label: "model1 recoil", weaponId: model1.id, objective: "recoil" },
    { label: "model1 balanced", weaponId: model1.id, objective: "balanced" },
    { label: "m4 recoil", weaponId: m4.id, objective: "recoil" },
    { label: "m4 balanced", weaponId: m4.id, objective: "balanced" },
  ];

  for (const job of jobs) {
    const short = optimizeWeapon(
      catalog,
      job.weaponId,
      { ...defaultConstraints(), objective: job.objective },
      {
        timeBudgetMs: DEFAULT_TIME_BUDGET_MS,
        maxNodes: DEFAULT_MAX_NODES,
        profile: true,
      },
    );
    summarize(`${job.label} 4s`, short);

    const skipOracle = process.env.SKIP_ORACLE === "1";
    if (skipOracle) continue;

    const oracle = optimizeWeapon(
      catalog,
      job.weaponId,
      { ...defaultConstraints(), objective: job.objective },
      {
        timeBudgetMs: ORACLE_MS,
        maxNodes: ORACLE_NODES,
        profile: true,
      },
    );
    summarize(`${job.label} oracle 30s`, oracle);
    if (
      job.label === "model1 recoil" &&
      oracle.recoilVertical + 0.05 < short.recoilVertical
    ) {
      console.log("oracle-gap", {
        short: short.recoilVertical,
        oracle: oracle.recoilVertical,
        delta: Math.round((short.recoilVertical - oracle.recoilVertical) * 10) / 10,
      });
    }
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
