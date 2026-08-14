import { USER_AGENT } from "../site";

const BASE_URL = "https://json.tarkov.dev";
const REVALIDATE_SEC = 60 * 60;

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchTarkovJson<T>(path: string): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}${path}`, {
        headers: {
          accept: "application/json",
          "user-agent": USER_AGENT,
        },
        next: { revalidate: REVALIDATE_SEC, tags: ["tarkov-json"] },
      });
      if (!response.ok) {
        throw new Error(`json.tarkov.dev HTTP ${response.status} (${path})`);
      }
      return (await response.json()) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < 4) await sleep(400 * attempt);
    }
  }

  throw lastError ?? new Error("json.tarkov.dev indisponible");
}

export const JSON_PATHS = {
  items: "/regular/items",
  traders: "/regular/traders",
  localeFr: "/regular/items_fr",
  localeEn: "/regular/items_en",
} as const;
