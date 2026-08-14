export const GITHUB_REPO =
  process.env.NEXT_PUBLIC_GITHUB_REPO ?? "Mbappinho/tarkov-optibuild";

export const KOFI_URL =
  process.env.NEXT_PUBLIC_KOFI_URL ?? "https://ko-fi.com/T1P023QR7T";

export const GITHUB_ISSUES_URL = `https://github.com/${GITHUB_REPO}/issues`;

export const JSON_TARKOV_DEV = "https://json.tarkov.dev";
export const TARKOV_DEV = "https://tarkov.dev";

export const USER_AGENT = `tarkov-optibuild/0.1 (+https://github.com/${GITHUB_REPO})`;

export type FeedbackKind = "bug" | "suggestion";

export function githubNewIssueUrl(
  kind: FeedbackKind,
  title: string,
  body: string,
): string {
  const labels = kind === "bug" ? "bug" : "enhancement";
  const params = new URLSearchParams({
    title: title.trim() || (kind === "bug" ? "Bug" : "Suggestion"),
    labels,
    body,
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
  const lines = [
    `## ${input.kind === "bug" ? "Bug" : "Suggestion"}`,
    "",
    input.details.trim() || "_Pas de détail._",
    "",
    "## Contexte",
    "",
    `- Page : ${input.pageUrl || "inconnue"}`,
    `- Arme : ${input.weaponName || "aucune"}`,
    `- Navigateur : ${input.userAgent || "inconnu"}`,
  ];
  return lines.join("\n");
}
