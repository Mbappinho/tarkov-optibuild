"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { OptimizeResult } from "@/lib/optimizer/optimize";
import { parseShareQuery, serializeShareQuery, snapshotFromResult } from "@/lib/share/query";
import type { SnapshotPart } from "@/lib/optimizer/hydrate";
import { shoppingListText } from "@/lib/optimizer/shopping";
import { defaultTraderLevels } from "@/lib/tarkov/defaults";
import type {
  MagazineClass,
  Objective,
  TraderLevels,
  TraderName,
  WeaponSummary,
} from "@/lib/tarkov/types";
import { TopBar } from "./TopBar";
import { WeaponPicker } from "./WeaponPicker";
import { SettingsPanel } from "./SettingsPanel";
import { BuildSheet } from "./BuildSheet";
import { FeedbackDialog } from "./FeedbackDialog";

type BootState = {
  weaponId: string;
  objective: Objective;
  requireSuppressor: boolean;
  magazineClass: MagazineClass;
  flea: boolean;
  includeQuestLocked: boolean;
  includeLoot: boolean;
  budgetInput: string;
  traders: TraderLevels;
  snapshotParts: SnapshotPart[];
  hydrate: SnapshotPart[] | null;
  auto: boolean;
};

function bootFromSearch(searchParams: URLSearchParams): BootState {
  const parsed = parseShareQuery(searchParams);
  const snapshotParts = parsed.parts ?? [];
  return {
    weaponId: parsed.weaponId ?? "",
    objective: parsed.objective ?? "balanced",
    requireSuppressor: Boolean(parsed.requireSuppressor),
    magazineClass: parsed.magazineClass ?? "std",
    flea: parsed.flea !== false,
    includeQuestLocked: Boolean(parsed.includeQuestLocked),
    includeLoot: parsed.includeLoot !== false,
    budgetInput: parsed.budget ?? "",
    traders: parsed.traders ?? defaultTraderLevels(),
    snapshotParts,
    hydrate: snapshotParts.length ? snapshotParts : null,
    auto: Boolean(parsed.weaponId && !snapshotParts.length),
  };
}

export function OptimizerApp() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [boot] = useState(() =>
    bootFromSearch(new URLSearchParams(searchParams.toString())),
  );
  const [weapons, setWeapons] = useState<WeaponSummary[]>([]);
  const [meta, setMeta] = useState<{ items: number; fetchedAt: string } | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [queryEdited, setQueryEdited] = useState(false);
  const [weaponId, setWeaponId] = useState(boot.weaponId);
  const [objective, setObjective] = useState<Objective>(boot.objective);
  const [traders, setTraders] = useState<TraderLevels>(boot.traders);
  const [flea, setFlea] = useState(boot.flea);
  const [budgetInput, setBudgetInput] = useState(boot.budgetInput);
  const [includeQuestLocked, setIncludeQuestLocked] = useState(
    boot.includeQuestLocked,
  );
  const [includeLoot, setIncludeLoot] = useState(boot.includeLoot);
  const [requireSuppressor, setRequireSuppressor] = useState(
    boot.requireSuppressor,
  );
  const [magazineClass, setMagazineClass] = useState<MagazineClass>(
    boot.magazineClass,
  );
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [optError, setOptError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "ok" | "err">("idle");
  const [copyListState, setCopyListState] = useState<"idle" | "ok" | "err">(
    "idle",
  );
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [snapshotParts, setSnapshotParts] = useState<SnapshotPart[]>(
    boot.snapshotParts,
  );
  const pendingAutoRef = useRef(boot.auto);
  const pendingHydrateRef = useRef<SnapshotPart[] | null>(boot.hydrate);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/weapons")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Catalogue indisponible");
        if (cancelled) return;
        setWeapons(payload.weapons);
        setMeta(payload.meta);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Erreur réseau");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = weapons.find((weapon) => weapon.id === weaponId) ?? null;
  const magazineClassForBuild: MagazineClass =
    selected && !selected.hasDrumMagazine && magazineClass === "drum"
      ? "std"
      : magazineClass;
  const searchValue = queryEdited ? query : (selected?.shortName ?? query);

  useEffect(() => {
    const serialized = serializeShareQuery({
      weaponId,
      objective,
      requireSuppressor,
      magazineClass: magazineClassForBuild,
      flea,
      includeQuestLocked,
      includeLoot,
      budget: budgetInput,
      traders,
      parts: snapshotParts,
    });
    const next = serialized ? `${pathname}?${serialized}` : pathname;
    router.replace(next, { scroll: false });
  }, [
    budgetInput,
    flea,
    includeLoot,
    includeQuestLocked,
    magazineClassForBuild,
    objective,
    pathname,
    requireSuppressor,
    router,
    snapshotParts,
    traders,
    weaponId,
  ]);

  const filtered = useMemo(() => {
    const needle = searchValue.trim().toLowerCase();
    if (!needle) return weapons.slice(0, 80);
    return weapons
      .filter(
        (weapon) =>
          weapon.name.toLowerCase().includes(needle) ||
          weapon.shortName.toLowerCase().includes(needle),
      )
      .slice(0, 80);
  }, [weapons, searchValue]);

  const requestBuild = useCallback(
    async (placed?: SnapshotPart[]) => {
      if (!weaponId) {
        setOptError("Choisis une arme.");
        return;
      }
      setBusy(true);
      setOptError(null);
      try {
        const budget = budgetInput.trim()
          ? Number(budgetInput.replace(/\s/g, ""))
          : null;
        const response = await fetch("/api/optimize", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            weaponId,
            objective,
            flea,
            budget: Number.isFinite(budget) ? budget : null,
            includeQuestLocked,
            includeLoot,
            requireSuppressor,
            magazineClass: magazineClassForBuild,
            traders,
            parts: placed?.length ? placed : undefined,
          }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Optimisation échouée");
        const optimized = payload as OptimizeResult;
        setResult(optimized);
        setSnapshotParts(snapshotFromResult(optimized.parts));
        if (requireSuppressor && !optimized.hasSuppressor) {
          setOptError(
            "Aucun silencieux compatible avec cette arme et tes déblocages.",
          );
        }
      } catch (error: unknown) {
        setResult(null);
        setOptError(error instanceof Error ? error.message : "Erreur");
      } finally {
        setBusy(false);
      }
    },
    [
      budgetInput,
      flea,
      includeLoot,
      includeQuestLocked,
      magazineClassForBuild,
      objective,
      requireSuppressor,
      traders,
      weaponId,
    ],
  );

  useEffect(() => {
    if (!weaponId || !weapons.length) return;
    if (pendingHydrateRef.current?.length) {
      const placed = pendingHydrateRef.current;
      pendingHydrateRef.current = null;
      void requestBuild(placed);
      return;
    }
    if (!pendingAutoRef.current) return;
    pendingAutoRef.current = false;
    void requestBuild();
  }, [requestBuild, weaponId, weapons.length]);

  async function copyShareLink() {
    try {
      const serialized = serializeShareQuery({
        weaponId,
        objective,
        requireSuppressor,
        magazineClass: magazineClassForBuild,
        flea,
        includeQuestLocked,
        includeLoot,
        budget: budgetInput,
        traders,
        parts: snapshotParts,
      });
      const url = `${window.location.origin}${pathname}${serialized ? `?${serialized}` : ""}`;
      await navigator.clipboard.writeText(url);
      setCopyState("ok");
      window.setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      setCopyState("err");
      window.setTimeout(() => setCopyState("idle"), 1600);
    }
  }

  async function copyShoppingList() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(
        shoppingListText(result.weaponName, result.parts, result.costRub),
      );
      setCopyListState("ok");
      window.setTimeout(() => setCopyListState("idle"), 1600);
    } catch {
      setCopyListState("err");
      window.setTimeout(() => setCopyListState("idle"), 1600);
    }
  }

  function handleTraderChange(trader: TraderName, level: number) {
    setTraders((current) => ({ ...current, [trader]: level }));
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <TopBar
        weaponsCount={weapons.length}
        itemsCount={meta?.items ?? null}
        fetchedAt={meta?.fetchedAt ?? null}
        onFeedback={() => setFeedbackOpen(true)}
      />

      {loadError ? (
        <p className="chamfer-sm mx-4 mt-4 bg-danger-deep/60 px-4 py-3 font-mono text-xs text-danger sm:mx-6">
          Impossible de charger le catalogue : {loadError}
        </p>
      ) : null}

      <main className="mx-auto grid w-full max-w-[1600px] flex-1 items-start gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[320px_minmax(0,1fr)_300px]">
        <div className="lg:sticky lg:top-4 lg:order-1 lg:flex lg:max-h-[calc(100vh-6rem)] lg:flex-col">
          <WeaponPicker
            query={searchValue}
            onQueryChange={(value) => {
              setQuery(value);
              setQueryEdited(true);
            }}
            weapons={filtered}
            selectedId={weaponId}
            onSelect={(weapon) => {
              setWeaponId(weapon.id);
              setQuery(weapon.shortName);
              setQueryEdited(false);
              setSnapshotParts([]);
              setResult(null);
              if (!weapon.hasDrumMagazine) setMagazineClass("std");
            }}
            loading={!weapons.length && !loadError}
          />
        </div>

        <div className="lg:order-3">
          <SettingsPanel
            objective={objective}
            onObjectiveChange={setObjective}
            selected={selected}
            magazineClass={magazineClassForBuild}
            onMagazineChange={setMagazineClass}
            requireSuppressor={requireSuppressor}
            onSuppressorChange={setRequireSuppressor}
            flea={flea}
            onFleaChange={setFlea}
            includeQuestLocked={includeQuestLocked}
            onQuestLockedChange={setIncludeQuestLocked}
            includeLoot={includeLoot}
            onLootChange={setIncludeLoot}
            budgetInput={budgetInput}
            onBudgetChange={setBudgetInput}
            traders={traders}
            onTraderChange={handleTraderChange}
            busy={busy}
            canOptimize={Boolean(weaponId)}
            onOptimize={() => void requestBuild()}
            copyState={copyState}
            canCopy={Boolean(weaponId)}
            onCopyLink={() => void copyShareLink()}
            optError={optError}
          />
        </div>

        <div className="min-w-0 lg:order-2">
          <BuildSheet
            result={result}
            selected={selected}
            busy={busy}
            copyListState={copyListState}
            onCopyList={() => void copyShoppingList()}
          />
        </div>
      </main>
      <FeedbackDialog
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        pageUrl={typeof window === "undefined" ? undefined : window.location.href}
        weaponName={selected?.name}
      />
    </div>
  );
}
