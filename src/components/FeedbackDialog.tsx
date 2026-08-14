"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  feedbackIssueBody,
  githubNewIssueUrl,
  type FeedbackKind,
} from "@/lib/site";
import { SegmentedControl } from "./hud";

export function FeedbackDialog({
  open,
  onClose,
  pageUrl,
  weaponName,
}: {
  open: boolean;
  onClose: () => void;
  pageUrl?: string;
  weaponName?: string;
}) {
  const titleId = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [liveUrl, setLiveUrl] = useState(pageUrl);

  useEffect(() => {
    if (!open) return;
    setLiveUrl(window.location.href);
    titleRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const href = githubNewIssueUrl(
    kind,
    title,
    feedbackIssueBody({
      kind,
      details,
      pageUrl: liveUrl ?? pageUrl,
      weaponName,
      userAgent: typeof navigator === "undefined" ? undefined : navigator.userAgent,
    }),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/80 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="chamfer hud-panel w-full max-w-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <h2 id={titleId} className="hud-label">
            Bug / suggestion
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[11px] tracking-wider text-muted uppercase hover:text-fog"
          >
            Fermer
          </button>
        </header>
        <div className="flex flex-col gap-4 p-4">
          <SegmentedControl
            segments={[
              { id: "bug", label: "Bug", hint: "Quelque chose cloche" },
              { id: "suggestion", label: "Idée", hint: "Amélioration" },
            ]}
            value={kind}
            onChange={(id) => setKind(id as FeedbackKind)}
          />
          <label className="flex flex-col gap-1.5">
            <span className="hud-label">Titre</span>
            <input
              ref={titleRef}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              placeholder={
                kind === "bug" ? "Ex. M4 recul min trop élevé" : "Ex. Filtrer par calibre"
              }
              className="chamfer-sm hud-panel-raised px-3 py-2 font-mono text-sm text-fog outline-none placeholder:text-muted/60 focus-visible:outline-signal"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="hud-label">Détail</span>
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={6}
              maxLength={4000}
              placeholder="Ce que tu attendais, ce qui s’est passé, arme / traders si utile."
              className="chamfer-sm hud-panel-raised resize-y px-3 py-2 font-mono text-sm text-fog outline-none placeholder:text-muted/60 focus-visible:outline-signal"
            />
          </label>
          <p className="text-[11px] leading-4 text-muted">
            Ça ouvre GitHub dans un nouvel onglet (connexion requise). L’URL
            actuelle et l’arme sélectionnée sont jointes pour le review.
          </p>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="chamfer bg-signal px-4 py-3 text-center text-base font-bold tracking-[0.15em] text-ink uppercase transition-colors hover:bg-fog"
            onClick={() => {
              window.setTimeout(onClose, 200);
            }}
          >
            Ouvrir sur GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
