import {
  clientIp,
  consumeRateLimit,
  rateLimitResponse,
} from "@/lib/http/rate-limit";
import { catalogStats, getCatalog } from "@/lib/tarkov/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limited = consumeRateLimit(`weapons:${clientIp(request)}`, 30, 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  try {
    const catalog = await getCatalog();
    return Response.json({
      weapons: catalog.weapons,
      meta: catalogStats(catalog),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Catalogue tarkov.dev indisponible";
    return Response.json(
      {
        error: `Impossible de charger les armes depuis json.tarkov.dev (${message}). Réessaie dans quelques minutes.`,
      },
      { status: 502 },
    );
  }
}
