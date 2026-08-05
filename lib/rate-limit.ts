import "server-only";

/**
 * Tiny in-memory rate limiter (per isolate). Soft protection only on serverless.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(opts: {
  key: string;
  limit: number;
  windowMs: number;
}): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const hit = buckets.get(opts.key);

  if (!hit || now >= hit.resetAt) {
    buckets.set(opts.key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true };
  }

  if (hit.count >= opts.limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((hit.resetAt - now) / 1000)) };
  }

  hit.count += 1;
  return { ok: true };
}

/** Best-effort client key from request headers. */
export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (fwd) return `ip:${fwd}`;
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return `ip:${real}`;
  return "ip:unknown";
}
