import type { WeaponSummary } from "@/lib/tarkov/types";
import { Panel } from "./hud";

export function WeaponPicker({
  query,
  onQueryChange,
  weapons,
  selectedId,
  onSelect,
  loading,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  weapons: WeaponSummary[];
  selectedId: string;
  onSelect: (weapon: WeaponSummary) => void;
  loading: boolean;
}) {
  return (
    <Panel
      title="Armurerie"
      className="max-h-[70vh] min-h-0 flex-1 lg:max-h-none"
      bodyClassName="min-h-0 flex-1 gap-3"
    >
      <label className="flex flex-col gap-1.5">
        <span className="hud-label">Recherche</span>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="M4A1, AK-74N, MP-153…"
          className="chamfer-sm hud-panel-raised px-3 py-2 font-mono text-sm text-fog outline-none placeholder:text-muted/60 focus-visible:outline-signal"
        />
      </label>

      <div className="hud-scroll min-h-0 flex-1 overflow-y-auto">
        <ul className="flex flex-col gap-1">
          {weapons.map((weapon) => {
            const active = weapon.id === selectedId;
            return (
              <li key={weapon.id}>
                <button
                  type="button"
                  onClick={() => onSelect(weapon)}
                  aria-pressed={active}
                  className={`chamfer-sm flex w-full items-center gap-3 px-2.5 py-1.5 text-left transition-colors ${
                    active
                      ? "corner-brackets bg-signal-deep/40"
                      : "hover:bg-panel-raised"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-8 w-1 shrink-0 skew-x-[-12deg] ${
                      active ? "bg-signal" : "bg-line"
                    }`}
                  />
                  {weapon.iconLink ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={weapon.iconLink}
                      alt=""
                      className="h-9 w-9 shrink-0 object-contain"
                    />
                  ) : (
                    <span className="h-9 w-9 shrink-0 bg-panel-raised" />
                  )}
                  <span className="flex min-w-0 flex-col">
                    <span
                      className={`truncate text-base leading-5 font-bold tracking-wide uppercase ${
                        active ? "text-signal" : "text-fog"
                      }`}
                    >
                      {weapon.shortName}
                    </span>
                    <span className="truncate font-mono text-[10px] text-muted">
                      {weapon.name}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {loading ? (
          <p className="px-3 py-4 font-mono text-xs text-muted">
            CHARGEMENT DU CATALOGUE…
          </p>
        ) : null}
        {!loading && !weapons.length ? (
          <p className="px-3 py-4 font-mono text-xs text-muted">
            AUCUNE ARME NE CORRESPOND
          </p>
        ) : null}
      </div>
    </Panel>
  );
}
