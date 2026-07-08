/** Cloudflare native rate-limit binding (see wrangler.toml [[unsafe.bindings]]). */
export interface RateLimiterBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  /** Surfaced by GET /version; bumped in wrangler.toml alongside package.json. */
  SERVER_VERSION?: string;
  /** Native per-colo rate limiter; optional (in-memory bucket is the fallback). */
  RATE_LIMITER?: RateLimiterBinding;
}
