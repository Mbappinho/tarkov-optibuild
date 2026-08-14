export const GITHUB_REPO =
  process.env.NEXT_PUBLIC_GITHUB_REPO ?? "Mbappinho/tarkov-optibuild";

export const KOFI_URL =
  process.env.NEXT_PUBLIC_KOFI_URL ?? "https://ko-fi.com/T1P023QR7T";

export const GITHUB_ISSUES_URL = `https://github.com/${GITHUB_REPO}/issues`;

export const JSON_TARKOV_DEV = "https://json.tarkov.dev";
export const TARKOV_DEV = "https://tarkov.dev";

export const USER_AGENT = `tarkov-optibuild/0.1 (+https://github.com/${GITHUB_REPO})`;

export type FeedbackKind = "bug" | "suggestion";

const BODY_MAX = 1500;

export function githubNewIssueUrl(
  kind: FeedbackKind,
  title: string,
  body: string,
): string {
  const labels = kind === "bug" ? "bug" : "enhancement";
  const template = kind === "bug" ? "bug.md" : "suggestion.md";
  const params = new URLSearchParams({
    template,
    title: title.trim() || (kind === "bug" ? "[bug] " : "[idée] "),
    labels,
    body: body.slice(0, BODY_MAX),
  });
  return `https://github.com/${GITHUB_REPO}/issues/new?${params.toString()}`;
}

export function feedbackIssueBody(input: {
  kind: FeedbackKind;
  details: string;
  pageUrl?: string;
  weaponName?: string;
  userAgent?: string;
}): string {
  const ua = (input.userAgent ?? "").slice(0, 180);
  const lines = [
    `## ${input.kind === "bug" ? "Bug" : "Suggestion"}`,
    "",
    input.details.trim() || "_Pas de détail._",
    "",
    "## Contexte",
    "",
    `- Page : ${input.pageUrl || "inconnue"}`,
    `- Arme : ${input.weaponName || "aucune"}`,
    `- Navigateur : ${ua || "inconnu"}`,
  ];
  return lines.join("\n");
}
