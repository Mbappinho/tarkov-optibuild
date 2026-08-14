export const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/^https?:\/\//, "")}`
    : "https://tarkov-optibuild.vercel.app");

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
  fallbackTitle: string,
): string {
  const labels = kind === "bug" ? "bug" : "enhancement";
  const template = kind === "bug" ? "bug.md" : "suggestion.md";
  const params = new URLSearchParams({
    template,
    title: title.trim() || fallbackTitle,
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
  copy: {
    heading: string;
    empty: string;
    context: string;
    page: string;
    weapon: string;
    browser: string;
    unknown: string;
    none: string;
  };
}): string {
  const ua = (input.userAgent ?? "").slice(0, 180);
  const lines = [
    `## ${input.copy.heading}`,
    "",
    input.details.trim() || `_${input.copy.empty}_`,
    "",
    `## ${input.copy.context}`,
    "",
    `- ${input.copy.page} : ${input.pageUrl || input.copy.unknown}`,
    `- ${input.copy.weapon} : ${input.weaponName || input.copy.none}`,
    `- ${input.copy.browser} : ${ua || input.copy.unknown}`,
  ];
  return lines.join("\n");
}
