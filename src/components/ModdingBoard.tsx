"use client";

import { Panel } from "./hud";
import type { ModdingSlot } from "@/lib/optimizer/modding";
import { flattenModdingSlots, slotBoardLabel } from "@/lib/optimizer/modding";
import { useI18n } from "./I18nProvider";

export function ModdingBoard({
  weaponName,
  weaponShortName,
  iconLink,
  tree,
  highlightedSlotId,
  onSelectSlot,
}: {
  weaponName: string;
  weaponShortName: string;
  iconLink: string | null;
  tree: ModdingSlot[];
  highlightedSlotId: string | null;
  onSelectSlot: (slotId: string | null) => void;
}) {
  const { t, locale } = useI18n();
  const cells = flattenModdingSlots(tree);
  if (!cells.length) return null;

  return (
    <Panel title={t("modding")} bodyClassName="gap-3">
        <div className="flex items-center gap-3">
          {iconLink ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={iconLink}
              alt=""
              className="h-12 w-12 shrink-0 object-contain"
            />
          ) : (
            <span className="h-12 w-12 shrink-0 bg-panel-raised" />
          )}
          <div className="min-w-0">
            <p className="truncate text-lg font-bold tracking-wide text-fog uppercase">
              {weaponShortName}
            </p>
            <p className="truncate font-mono text-[10px] text-muted">
              {weaponName}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {cells.map((cell) => {
            const filled = Boolean(cell.part);
            const active = highlightedSlotId === cell.slotId;
            const emptyRequired = cell.required && !filled;
            const label = slotBoardLabel(cell.slotNameId, cell.slotName, locale);
            return (
              <button
                key={cell.slotId}
                type="button"
                title={
                  cell.part
                    ? `${cell.part.shortName} — ${cell.slotName}`
                    : cell.slotName
                }
                aria-pressed={active}
                onClick={() =>
                  onSelectSlot(active ? null : cell.slotId)
                }
                className={`chamfer-sm relative h-16 w-16 shrink-0 overflow-hidden transition-colors ${
                  active
                    ? "corner-brackets bg-signal-deep/50"
                    : emptyRequired
                      ? "bg-danger-deep/50"
                      : "hud-panel-raised hover:bg-panel"
                }`}
              >
                {cell.part?.iconLink ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cell.part.iconLink}
                    alt=""
                    className="h-full w-full object-contain p-0.5"
                  />
                ) : (
                  <span
                    className={`flex h-full w-full items-center justify-center px-0.5 text-center font-mono text-[8px] leading-3 font-semibold tracking-wide ${
                      emptyRequired
                        ? "text-danger"
                        : cell.part
                          ? "text-fog"
                          : "text-muted"
                    }`}
                  >
                    {cell.part ? cell.part.shortName : label}
                  </span>
                )}
                {cell.part?.iconLink ? (
                  <span className="pointer-events-none absolute top-0.5 right-0.5 max-w-[60px] truncate font-mono text-[8px] font-bold text-fog [text-shadow:0_0_4px_#0d0f0d]">
                    {cell.part.shortName}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
    </Panel>
  );
}
