import type { OptimizeConstraints } from "../tarkov/types";
import type { OptimizeResult } from "./optimize";

type Entry = {
  result: OptimizeResult;
};

let catalogStamp = "";
const memory = new Map<string, Entry>();

export function cachedOptimize(
  catalogFetchedAt: string,
  weaponId: string,
  constraints: OptimizeConstraints,
  compute: () => OptimizeResult,
): OptimizeResult {
  if (catalogStamp !== catalogFetchedAt) {
    memory.clear();
    catalogStamp = catalogFetchedAt;
  }

  const key = cacheKey(weaponId, constraints);
  const hit = memory.get(key);
  if (hit) return hit.result;

  const result = compute();
  memory.set(key, { result });
  return result;
}

function cacheKey(weaponId: string, constraints: OptimizeConstraints): string {
  return JSON.stringify({
    v: 4,
    weaponId,
    objective: constraints.objective,
    flea: constraints.flea,
    budget: constraints.budget,
    includeQuestLocked: constraints.includeQuestLocked,
    includeLoot: constraints.includeLoot,
    requireSuppressor: constraints.requireSuppressor,
    magazineClass: constraints.magazineClass,
    traders: constraints.traders,
  });
}
