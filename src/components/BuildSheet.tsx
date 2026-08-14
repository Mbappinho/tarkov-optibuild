"use client";

import { useEffect, useState } from "react";
import type { OptimizeResult } from "@/lib/optimizer/optimize";
import { shoppingList } from "@/lib/optimizer/shopping";
import type { WeaponSummary } from "@/lib/tarkov/types";
import { ModdingBoard } from "./ModdingBoard";
import { Panel, StatBar, Tag } from "./hud";

function formatRub(value: number): string {
  return `${Math.round(value).toLocaleString("fr-FR")} ₽`;
}

function signed(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}

function vendorTone(vendor: string): "signal" | "olive" | "muted" {
  const lower = vendor.toLowerCase();
  if (lower.includes("flea")) return "olive";
  if (lower.includes("loot")) return "muted";
  return "signal";
}

export function BuildSheet({
  result,
  selected,
  busy,
  copyListState,
  onCopyList,
}: {
  result: OptimizeResult | null;
  selected: WeaponSummary | null;
  busy: boolean;
  copyListState: "idle" | "ok" | "err";
  onCopyList: () => void;
}) {
  const [highlightedSlotId, setHighlightedSlotId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!highlightedSlotId) return;
    const row = document.getElementById(`part-${highlightedSlotId}`);
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [highlightedSlotId]);

  if (!result) {
    return (
      <Panel
        title="Fiche technique"
        className="min-h-80"
        bodyClassName="flex-1 items-center justify-center gap-4 text-center"
      >
        <span
          aria-hidden="true"
          className="corner-brackets relative flex h-16 w-16 items-center justify-center"
        >
          <span className="h-8 w-8 rounded-full border border-line" />
          <span className="absolute top-1/2 left-1/2 h-px w-16 -translate-x-1/2 -translate-y-1/2 bg-line" />
          <span className="absolute top-1/2 left-1/2 h-16 w-px -translate-x-1/2 -translate-y-1/2 bg-line" />
        </span>
        <p className="text-lg font-bold tracking-[0.15em] text-fog uppercase">
          {busy
            ? "Calcul du build…"
            : selected
              ? `Prêt — ${selected.shortName}`
              : "En attente de cible"}
        </p>
        <p className="max-w-md font-mono text-[11px] leading-5 text-muted">
          Choisis une arme, règle tes traders, le flea et le budget, puis lance
          la recherche. L’algo respecte la compatibilité des slots et les
          conflits. Après un build, le lien fige les pièces. Optiques et
          lance-grenades restent à ta charge.
        </p>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ModdingBoard
        weaponName={result.weaponName}
        weaponShortName={result.weaponShortName}
        iconLink={result.iconLink}
        tree={result.modding}
        highlightedSlotId={highlightedSlotId}
        onSelectSlot={setHighlightedSlotId}
      />
      <Panel title="Fiche technique" bodyClassName="gap-5">
      <div className="flex items-start gap-4">
        {result.iconLink ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.iconLink}
            alt=""
            className="h-16 w-16 shrink-0 object-contain"
          />
        ) : null}
        <div className="flex min-w-0 flex-col gap-1.5">
          <h3 className="truncate text-2xl leading-7 font-bold tracking-wide text-fog uppercase">
            {result.weaponName}
          </h3>
          <p className="font-mono text-[11px] text-muted">
            {result.parts.length} PIÈCES · {formatRub(result.costRub)}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {result.hasSuppressor ? <Tag tone="signal">Silencieux</Tag> : null}
            {result.snapshot ? (
              <Tag tone="olive">Build figé</Tag>
            ) : result.truncated ? (
              <Tag tone="muted">Recherche limitée</Tag>
            ) : null}
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <StatBar
          label="Recul V"
          value={String(result.recoilVertical)}
          fraction={result.recoilVertical / 150}
          tone="danger"
        />
        <StatBar
          label="Recul H"
          value={String(result.recoilHorizontal)}
          fraction={result.recoilHorizontal / 150}
          tone="danger"
        />
        <StatBar
          label="Ergo"
          value={String(result.ergonomics)}
          fraction={result.ergonomics / 100}
          tone="olive"
        />
        <StatBar
          label="Poids"
          value={`${result.weightKg.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} kg`}
          fraction={result.weightKg / 8}
        />
        <StatBar
          label="Chauffe"
          value={`${result.heatPercent > 0 ? "+" : ""}${result.heatPercent}%`}
          tone={result.heatPercent > 0 ? "danger" : "olive"}
        />
        <StatBar
          label="Refroid."
          value={`${result.coolingPercent > 0 ? "+" : ""}${result.coolingPercent}%`}
          tone={result.coolingPercent > 0 ? "olive" : "muted"}
        />
      </dl>

      <div className="flex flex-col gap-2">
        <span className="hud-label">Pièces</span>
        <ul className="flex flex-col gap-1">
          {result.parts.map((part) => (
            <li
              id={`part-${part.slotId}`}
              key={`${part.slotId}-${part.itemId}`}
              className={`chamfer-sm flex items-center gap-3 px-3 py-2 ${
                highlightedSlotId === part.slotId
                  ? "corner-brackets bg-signal-deep/40"
                  : "hud-panel-raised"
              }`}
            >
              {part.iconLink ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={part.iconLink}
                  alt=""
                  className="h-8 w-8 shrink-0 object-contain"
                />
              ) : (
                <span className="h-8 w-8 shrink-0 bg-panel" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold tracking-wide text-fog">
                  {part.shortName}
                </p>
                <p className="truncate font-mono text-[10px] text-muted">
                  {part.slotName}
                </p>
              </div>
              <div className="hidden shrink-0 text-right font-mono text-[10px] leading-4 text-muted sm:block">
                <p>
                  R <span className="text-fog">{signed(part.recoilModifier)}</span>
                  {" · "}E{" "}
                  <span className="text-fog">
                    {signed(part.ergonomicsModifier)}
                  </span>
                </p>
                <p>
                  {part.weight.toLocaleString("fr-FR", {
                    maximumFractionDigits: 2,
                  })}{" "}
                  kg
                  {part.heatFactor !== 1
                    ? ` · CH ${signed(Math.round((part.heatFactor - 1) * 1000) / 10)}%`
                    : ""}
                  {part.coolingFactor !== 1
                    ? ` · RF ${signed(Math.round((part.coolingFactor - 1) * 1000) / 10)}%`
                    : ""}
                </p>
              </div>
              <div className="flex w-24 shrink-0 flex-col items-end gap-1">
                <Tag tone={vendorTone(part.vendor)}>{part.vendor || "—"}</Tag>
                <span className="font-mono text-[10px] text-fog">
                  {formatRub(part.priceRub)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-4">
        <div className="flex items-center justify-between gap-3">
          <span className="hud-label">Liste d’achat</span>
          <button
            type="button"
            onClick={onCopyList}
            className="chamfer-sm hud-panel-raised px-3 py-1.5 font-mono text-[11px] tracking-wider text-fog uppercase transition-colors hover:text-signal"
          >
            {copyListState === "ok"
              ? "Liste copiée"
              : copyListState === "err"
                ? "Copie impossible"
                : "Copier la liste"}
          </button>
        </div>
        {shoppingList(result.parts).map((group) => (
          <div key={group.vendor} className="flex flex-col gap-1">
            <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-signal uppercase">
              {group.vendor} · {formatRub(group.totalRub)}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.lines.map((line) => (
                <li
                  key={`${group.vendor}-${line.slotName}-${line.shortName}`}
                  className="flex items-baseline gap-2 text-sm"
                >
                  <span className="min-w-0 truncate font-semibold tracking-wide text-fog">
                    {line.shortName}{" "}
                    <span className="font-mono text-[10px] font-normal text-muted">
                      ({line.slotName})
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="flex-1 border-b border-dotted border-line-strong"
                  />
                  <span className="shrink-0 font-mono text-xs text-muted">
                    {formatRub(line.priceRub)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="flex items-baseline justify-between gap-2 border-t border-line pt-3">
          <span className="hud-label">Total</span>
          <span className="font-mono text-lg font-semibold text-fog">
            {formatRub(result.costRub)}
          </span>
        </p>
      </div>
      </Panel>
    </div>
  );
}
