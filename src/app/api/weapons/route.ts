import {
  clientIp,
  consumeRateLimit,
  rateLimitResponse,
} from "@/lib/http/rate-limit";
import { parseLocale } from "@/lib/i18n/locale";
import { catalogStats, getCatalog } from "@/lib/tarkov/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limited = consumeRateLimit(`weapons:${clientIp(request)}`, 30, 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  try {
    const lang = parseLocale(new URL(request.url).searchParams.get("lang"));
    const catalog = await getCatalog(lang);
    return Response.json({
      weapons: catalog.weapons,
      meta: catalogStats(catalog),
    });
  } catch {
    return Response.json({ error: "catalog_unavailable" }, { status: 502 });
  }
}
