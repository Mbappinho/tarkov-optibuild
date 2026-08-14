import { defaultTraderLevels } from "../tarkov/defaults";
import { GUN_TRADERS } from "../tarkov/types";
import type {
  MagazineClass,
  Objective,
  TraderLevels,
} from "../tarkov/types";
import type { SnapshotPart } from "../optimizer/hydrate";

export type ShareState = {
  weaponId: string;
  objective: Objective;
  requireSuppressor: boolean;
  magazineClass: MagazineClass;
  flea: boolean;
  includeQuestLocked: boolean;
  includeLoot: boolean;
  budget: string;
  traders: TraderLevels;
  parts: SnapshotPart[];
};

export function serializeShareQuery(state: ShareState): string {
  const params = new URLSearchParams();
  if (state.weaponId) params.set("w", state.weaponId);
  if (state.objective !== "balanced") params.set("obj", state.objective);
  if (state.requireSuppressor) params.set("sil", "1");
  if (state.magazineClass === "drum") params.set("mag", "60");
  if (!state.flea) params.set("flea", "0");
  if (state.includeQuestLocked) params.set("quest", "1");
  if (!state.includeLoot) params.set("loot", "0");
  const budget = state.budget.trim().replace(/\s/g, "");
  if (budget) params.set("budget", budget);
  const digits = GUN_TRADERS.map((name) => String(state.traders[name])).join("");
  if (digits !== "4".repeat(GUN_TRADERS.length)) params.set("t", digits);
  if (state.parts.length) {
    params.set(
      "p",
      state.parts.map((part) => `${part.slotId}~${part.itemId}`).join(","),
    );
  }
  return params.toString();
}

export function parseShareQuery(params: URLSearchParams): Partial<ShareState> {
  const parsed: Partial<ShareState> = {};
  const weaponId = params.get("w");
  if (weaponId) parsed.weaponId = weaponId;

  const objective = params.get("obj");
  if (
    objective === "recoil" ||
    objective === "ergonomics" ||
    objective === "balanced"
  ) {
    parsed.objective = objective;
  }

  if (params.get("sil") === "1") parsed.requireSuppressor = true;
  if (params.get("mag") === "60") parsed.magazineClass = "drum";
  if (params.get("mag") === "30") parsed.magazineClass = "std";
  if (params.get("flea") === "0") parsed.flea = false;
  if (params.get("quest") === "1") parsed.includeQuestLocked = true;
  if (params.get("loot") === "0") parsed.includeLoot = false;

  const budget = params.get("budget");
  if (budget) parsed.budget = budget;

  const traderDigits = params.get("t");
  if (
    traderDigits &&
    traderDigits.length === GUN_TRADERS.length &&
    /^[1-4]+$/.test(traderDigits)
  ) {
    const traders = defaultTraderLevels();
    GUN_TRADERS.forEach((name, index) => {
      traders[name] = Number(traderDigits[index]);
    });
    parsed.traders = traders;
  }

  const packed = params.get("p");
  if (packed) {
    const parts: SnapshotPart[] = [];
    for (const token of packed.split(",")) {
      const sep = token.indexOf("~");
      if (sep <= 0 || sep === token.length - 1) continue;
      parts.push({
        slotId: token.slice(0, sep),
        itemId: token.slice(sep + 1),
      });
    }
    if (parts.length) parsed.parts = parts;
  }

  return parsed;
}

export function snapshotFromResult(
  parts: { slotId: string; itemId: string }[],
): SnapshotPart[] {
  return parts.map((part) => ({ slotId: part.slotId, itemId: part.itemId }));
}
