import type { ReactNode } from "react";

type Tone = "signal" | "olive" | "danger" | "muted";

const TAG_TONES: Record<Tone, string> = {
  signal: "bg-signal-deep/60 text-signal",
  olive: "bg-olive-deep/60 text-olive",
  danger: "bg-danger-deep/60 text-danger",
  muted: "bg-panel-raised text-muted",
};

export function Tag({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`chamfer-sm inline-flex items-center px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.14em] uppercase ${TAG_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function Panel({
  title,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`chamfer hud-panel flex flex-col ${className}`}>
      {title ? (
        <header className="flex items-center gap-3 border-b border-line px-4 py-2.5">
          <h2 className="hud-label">{title}</h2>
          <span className="h-px flex-1 bg-line" aria-hidden="true" />
        </header>
      ) : null}
      <div className={`flex flex-col gap-4 p-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex w-full items-center justify-between gap-3 text-left"
    >
      <span className="flex flex-col">
        <span className="text-sm font-semibold tracking-wide text-fog">
          {label}
        </span>
        {hint ? <span className="text-[11px] text-muted">{hint}</span> : null}
      </span>
      <span
        aria-hidden="true"
        className={`chamfer-sm relative h-5 w-10 shrink-0 transition-colors ${
          checked ? "bg-signal-deep" : "bg-panel-raised"
        }`}
        style={{ boxShadow: "inset 0 0 0 1px var(--color-line)" }}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 transition-all ${
            checked ? "left-[22px] bg-signal" : "left-0.5 bg-muted"
          }`}
        />
      </span>
    </button>
  );
}

export type Segment = {
  id: string;
  label: string;
  hint?: string;
};

export function SegmentedControl({
  segments,
  value,
  onChange,
}: {
  segments: Segment[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      role="radiogroup"
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${segments.length}, minmax(0, 1fr))` }}
    >
      {segments.map((segment) => {
        const active = segment.id === value;
        return (
          <button
            key={segment.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(segment.id)}
            className={`chamfer-sm px-2 py-2 text-left transition-colors ${
              active
                ? "corner-brackets bg-signal-deep/50 text-signal"
                : "hud-panel-raised text-muted hover:text-fog"
            }`}
          >
            <span className="block text-sm font-bold tracking-wide uppercase">
              {segment.label}
            </span>
            {segment.hint ? (
              <span className="block text-[10px] leading-4 text-muted">
                {segment.hint}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function PipStepper({
  value,
  max,
  onChange,
  format = (level: number) => `LL${level}`,
  levelAria,
}: {
  value: number;
  max: number;
  onChange: (level: number) => void;
  format?: (level: number) => string;
  levelAria?: (level: number) => string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: max }, (_, index) => {
        const level = index + 1;
        const active = level <= value;
        return (
          <button
            key={level}
            type="button"
            aria-label={levelAria ? levelAria(level) : `LL${level}`}
            aria-pressed={level === value}
            onClick={() => onChange(level)}
            className={`h-3.5 w-6 skew-x-[-12deg] transition-colors ${
              active ? "bg-signal" : "bg-panel-raised"
            }`}
            style={
              active
                ? undefined
                : { boxShadow: "inset 0 0 0 1px var(--color-line)" }
            }
          />
        );
      })}
      <span className="ml-1 font-mono text-xs font-semibold text-fog">
        {format(value)}
      </span>
    </div>
  );
}

export function StatBar({
  label,
  value,
  fraction,
  tone = "signal",
}: {
  label: string;
  value: string;
  /** 0–1, largeur de la barre. Absent = pas de barre. */
  fraction?: number;
  tone?: Tone;
}) {
  const barColor =
    tone === "olive"
      ? "bg-olive"
      : tone === "danger"
        ? "bg-danger"
        : "bg-signal";
  return (
    <div className="hud-panel-raised chamfer-sm flex flex-col gap-1.5 px-3 py-2.5">
      <dt className="hud-label">{label}</dt>
      <dd className="font-mono text-xl leading-6 font-semibold text-fog">
        {value}
      </dd>
      {fraction !== undefined ? (
        <span
          aria-hidden="true"
          className="h-1 w-full bg-ink"
          style={{ boxShadow: "inset 0 0 0 1px var(--color-line)" }}
        >
          <span
            className={`block h-full ${barColor}`}
            style={{ width: `${Math.min(100, Math.max(0, fraction * 100))}%` }}
          />
        </span>
      ) : null}
    </div>
  );
}
