"use client";

import { TRADER_LABELS } from "@/lib/tarkov/defaults";
import { GUN_TRADERS } from "@/lib/tarkov/types";
import type {
  MagazineClass,
  Objective,
  TraderLevels,
  TraderName,
  WeaponSummary,
} from "@/lib/tarkov/types";
import { useI18n } from "./I18nProvider";
import { Panel, PipStepper, SegmentedControl, Toggle } from "./hud";

export function SettingsPanel({
  objective,
  onObjectiveChange,
  selected,
  magazineClass,
  onMagazineChange,
  requireSuppressor,
  onSuppressorChange,
  flea,
  onFleaChange,
  includeQuestLocked,
  onQuestLockedChange,
  includeLoot,
  onLootChange,
  budgetInput,
  onBudgetChange,
  traders,
  onTraderChange,
  busy,
  canOptimize,
  onOptimize,
  copyState,
  canCopy,
  onCopyLink,
  optError,
}: {
  objective: Objective;
  onObjectiveChange: (objective: Objective) => void;
  selected: WeaponSummary | null;
  magazineClass: MagazineClass;
  onMagazineChange: (magazine: MagazineClass) => void;
  requireSuppressor: boolean;
  onSuppressorChange: (next: boolean) => void;
  flea: boolean;
  onFleaChange: (next: boolean) => void;
  includeQuestLocked: boolean;
  onQuestLockedChange: (next: boolean) => void;
  includeLoot: boolean;
  onLootChange: (next: boolean) => void;
  budgetInput: string;
  onBudgetChange: (value: string) => void;
  traders: TraderLevels;
  onTraderChange: (trader: TraderName, level: number) => void;
  busy: boolean;
  canOptimize: boolean;
  onOptimize: () => void;
  copyState: "idle" | "ok" | "err";
  canCopy: boolean;
  onCopyLink: () => void;
  optError: string | null;
}) {
  const { t } = useI18n();
  const magazineSegments = [];
  if (selected?.hasStdMagazine) {
    magazineSegments.push({
      id: "std",
      label: "~30",
      hint: t("magStdHint"),
    });
  }
  if (selected?.hasDrumMagazine) {
    magazineSegments.push({
      id: "drum",
      label: "~60",
      hint: t("magDrumHint"),
    });
  }

  return (
    <Panel title={t("settings")} bodyClassName="gap-5">
      <div className="flex flex-col gap-2">
        <span className="hud-label">{t("objective")}</span>
        <SegmentedControl
          segments={[
            {
              id: "balanced",
              label: t("objectiveBalanced"),
              hint: t("objectiveBalancedHint"),
            },
            {
              id: "recoil",
              label: t("objectiveRecoil"),
              hint: t("objectiveRecoilHint"),
            },
            {
              id: "ergonomics",
              label: t("objectiveErgo"),
              hint: t("objectiveErgoHint"),
            },
          ]}
          value={objective}
          onChange={(id) => onObjectiveChange(id as Objective)}
        />
      </div>

      {magazineSegments.length ? (
        <div className="flex flex-col gap-2">
          <span className="hud-label">{t("magazine")}</span>
          <SegmentedControl
            segments={magazineSegments}
            value={magazineClass}
            onChange={(id) => onMagazineChange(id as MagazineClass)}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-3.5 border-t border-line pt-4">
        <Toggle
          checked={requireSuppressor}
          onChange={onSuppressorChange}
          label={t("suppressor")}
          hint={requireSuppressor ? t("suppressorOn") : t("suppressorOff")}
        />
        <Toggle checked={flea} onChange={onFleaChange} label={t("fleaMarket")} />
        <Toggle
          checked={includeQuestLocked}
          onChange={onQuestLockedChange}
          label={t("questParts")}
        />
        <Toggle
          checked={includeLoot}
          onChange={onLootChange}
          label={t("lootParts")}
          hint={t("lootHint")}
        />
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="hud-label">{t("budget")}</span>
        <input
          value={budgetInput}
          onChange={(event) => onBudgetChange(event.target.value)}
          inputMode="numeric"
          placeholder={t("budgetUnlimited")}
          className="chamfer-sm hud-panel-raised px-3 py-2 font-mono text-sm text-fog outline-none placeholder:text-muted/60 focus-visible:outline-signal"
        />
      </label>

      <div className="flex flex-col gap-3 border-t border-line pt-4">
        <span className="hud-label">{t("traderLevels")}</span>
        <div className="grid grid-cols-1 gap-2.5">
          {GUN_TRADERS.map((trader) => (
            <div
              key={trader}
              className="flex items-center justify-between gap-3"
            >
              <span className="text-sm font-semibold tracking-wide text-fog">
                {TRADER_LABELS[trader]}
              </span>
              <PipStepper
                value={traders[trader]}
                max={4}
                onChange={(level) => onTraderChange(trader, level)}
                levelAria={(level) => t("levelAria", { n: level })}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-4">
        <button
          type="button"
          onClick={onOptimize}
          disabled={busy || !canOptimize}
          className="chamfer bg-signal px-4 py-3 text-base font-bold tracking-[0.15em] text-ink uppercase transition-colors hover:bg-fog disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? t("searching") : t("searchCta")}
        </button>
        <button
          type="button"
          onClick={onCopyLink}
          disabled={!canCopy}
          className="chamfer hud-panel-raised px-4 py-2 text-sm font-semibold tracking-[0.12em] text-fog uppercase transition-colors hover:text-signal disabled:cursor-not-allowed disabled:opacity-40"
        >
          {copyState === "ok"
            ? t("linkCopied")
            : copyState === "err"
              ? t("copyFailed")
              : t("copyLink")}
        </button>
      </div>

      {optError ? (
        <p className="chamfer-sm bg-danger-deep/60 px-3 py-2 font-mono text-xs text-danger">
          {optError}
        </p>
      ) : null}
    </Panel>
  );
}
