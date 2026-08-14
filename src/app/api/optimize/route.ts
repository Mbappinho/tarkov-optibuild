import { cachedOptimize } from "@/lib/optimizer/cache";
import { hydrateBuild, type SnapshotPart } from "@/lib/optimizer/hydrate";
import { snapshotUsesBlockedReceiver } from "@/lib/optimizer/optic-rail";
import { optimizeWeapon } from "@/lib/optimizer/optimize";
import {
  clientIp,
  consumeRateLimit,
  rateLimitResponse,
} from "@/lib/http/rate-limit";
import { parseLocale } from "@/lib/i18n/locale";
import { getCatalog } from "@/lib/tarkov/catalog";
import { defaultTraderLevels } from "@/lib/tarkov/defaults";
import type {
  MagazineClass,
  Objective,
  OptimizeConstraints,
  TraderName,
} from "@/lib/tarkov/types";
import { GUN_TRADERS } from "@/lib/tarkov/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Body = {
  weaponId?: string;
  objective?: Objective;
  flea?: boolean;
  budget?: number | null;
  includeQuestLocked?: boolean;
  includeLoot?: boolean;
  traders?: Partial<Record<TraderName, number>>;
  requireSuppressor?: boolean;
  magazineClass?: MagazineClass;
  parts?: SnapshotPart[];
  lang?: string;
};

function parseConstraints(body: Body): OptimizeConstraints {
  const traders = defaultTraderLevels();
  for (const name of GUN_TRADERS) {
    const value = body.traders?.[name];
    if (typeof value === "number" && value >= 1 && value <= 4) {
      traders[name] = Math.round(value);
    }
  }

  const budget =
    typeof body.budget === "number" && body.budget > 0 ? body.budget : null;

  const objective: Objective =
    body.objective === "recoil" ||
    body.objective === "ergonomics" ||
    body.objective === "balanced"
      ? body.objective
      : "balanced";

  return {
    traders,
    flea: body.flea !== false,
    budget,
    includeQuestLocked: Boolean(body.includeQuestLocked),
    includeLoot: body.includeLoot !== false,
    objective,
    requireSuppressor: Boolean(body.requireSuppressor),
    magazineClass: body.magazineClass === "drum" ? "drum" : "std",
  };
}

function parseSnapshot(raw: Body["parts"]): SnapshotPart[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const parts: SnapshotPart[] = [];
  for (const entry of raw) {
    if (
      typeof entry?.slotId !== "string" ||
      typeof entry?.itemId !== "string" ||
      !entry.slotId ||
      !entry.itemId
    ) {
      continue;
    }
    parts.push({ slotId: entry.slotId, itemId: entry.itemId });
  }
  return parts.length ? parts : null;
}

export async function POST(request: Request) {
  const limited = consumeRateLimit(
    `optimize:${clientIp(request)}`,
    12,
    60_000,
  );
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  try {
    const body = (await request.json()) as Body;
    if (!body.weaponId) {
      return Response.json({ error: "weapon_required" }, { status: 400 });
    }

    const lang = parseLocale(body.lang);
    const catalog = await getCatalog(lang);
    const constraints = parseConstraints(body);
    let snapshot = parseSnapshot(body.parts);
    if (
      snapshot &&
      snapshotUsesBlockedReceiver(
        catalog,
        body.weaponId,
        snapshot,
        constraints,
      )
    ) {
      snapshot = null;
    }
    const result = snapshot
      ? hydrateBuild(catalog, body.weaponId, snapshot, constraints)
      : cachedOptimize(
          catalog.fetchedAt,
          body.weaponId,
          constraints,
          () => optimizeWeapon(catalog, body.weaponId as string, constraints),
          lang,
        );
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code = message.includes("Arme introuvable")
      ? "weapon_not_found"
      : message.includes("Aucune pièce")
        ? "no_parts"
        : message.includes("Pièce introuvable")
          ? "part_not_found"
          : "optimize_failed";
    return Response.json({ error: code }, { status: 500 });
  }
}
