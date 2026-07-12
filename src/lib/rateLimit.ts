import type { Env } from './env';

/**
 * Per-IP rate limiting: 60 requests/minute, burst 10.
 *
 * Two layers:
 *   1. An in-memory token bucket (capacity 10 = burst, refill 1 token/sec =
 *      60/min). Per-isolate and best-effort, but adequate for a boutique public
 *      endpoint and works locally / in tests with no bindings.
 *   2. Cloudflare's native RATE_LIMITER binding when present, for steady-rate
 *      enforcement across requests within a colo.
 *
 * Stateless by design: nothing here is user data - only an ephemeral count keyed
 * by a coarse IP, never persisted, never logged with the request body.
 */

const CAPACITY = 10; // burst
const REFILL_PER_SEC = 1; // 60 per minute
const PRUNE_AT = 10_000;

interface Bucket {
  tokens: number;
  last: number;
}

const buckets = new Map<string, Bucket>();

function takeToken(ip: string, now: number): { allowed: boolean; retryAfter: number } {
  let b = buckets.get(ip);
  if (!b) {
    b = { tokens: CAPACITY, last: now };
    buckets.set(ip, b);
  }
  const elapsedSec = Math.max(0, (now - b.last) / 1000);
  b.tokens = Math.min(CAPACITY, b.tokens + elapsedSec * REFILL_PER_SEC);
  b.last = now;

  if (b.tokens >= 1) {
    b.tokens -= 1;
    return { allowed: true, retryAfter: 0 };
  }
  // Seconds until the next whole token refills.
  const retryAfter = Math.ceil((1 - b.tokens) / REFILL_PER_SEC);
  return { allowed: false, retryAfter };
}

function prune(now: number): void {
  if (buckets.size < PRUNE_AT) return;
  for (const [ip, b] of buckets) {
    // A bucket idle long enough to be fully refilled carries no state worth keeping.
    if (now - b.last > 60_000 && b.tokens >= CAPACITY) buckets.delete(ip);
  }
}

export interface RateResult {
  allowed: boolean;
  retryAfter: number;
}

export async function checkRateLimit(ip: string, env: Env): Promise<RateResult> {
  const now = Date.now();
  prune(now);

  const local = takeToken(ip, now);
  if (!local.allowed) return local;

  if (env.RATE_LIMITER) {
    try {
      const { success } = await env.RATE_LIMITER.limit({ key: ip });
      if (!success) return { allowed: false, retryAfter: 30 };
    } catch {
      // Binding hiccup should never take the tool offline; the in-memory bucket
      // already gated this request.
    }
  }
  return { allowed: true, retryAfter: 0 };
}

/** Best-effort client IP from Cloudflare headers. Coarse; used only as a key. */
export function clientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/** Test-only: reset the in-memory buckets between cases. */
export function _resetBuckets(): void {
  buckets.clear();
}
