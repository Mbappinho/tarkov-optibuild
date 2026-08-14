type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Compteur glissant en mémoire (par instance). Suffisant pour limiter l’abus évident. */
export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (current.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  current.count += 1;
  return { ok: true };
}

export function rateLimitResponse(retryAfterSec: number): Response {
  return Response.json(
    { error: `Trop de requêtes. Réessaie dans ${retryAfterSec} s.` },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
}
