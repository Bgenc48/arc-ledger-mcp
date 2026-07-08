/**
 * Privacy-preserving logging (Phase 1.5, load-bearing for the privacy policy).
 *
 * We log ONLY: tool name, an ISO timestamp, and coarse enum/boolean parameters
 * (e.g. notice code, entity type, filing status). We NEVER log free-text inputs
 * or computed dollar amounts. The `fields` argument is the whitelisted object a
 * tool returns from `logEnums`; callers cannot pass raw input here.
 *
 * Retention is a platform setting, not code: enable Workers Logs / Logpush with
 * a 30-day retention window (the privacy policy commits to 30 days). Numbers are
 * additionally clamped to a coarse bucket so an amount can never leak via a log.
 */

const DOLLARISH_KEY = /(usd|amount|balance|income|salary|profit|price|fee|withhold|estimate|dollar)/i;

/** Coarse numeric buckets so a logged number can never be a real dollar figure. */
function bucket(n: number): string {
  if (!Number.isFinite(n)) return 'na';
  if (n <= 0) return '0';
  if (n < 1_000) return '<1k';
  if (n < 10_000) return '1k-10k';
  if (n < 50_000) return '10k-50k';
  if (n < 100_000) return '50k-100k';
  if (n < 250_000) return '100k-250k';
  if (n < 1_000_000) return '250k-1m';
  return '1m+';
}

/**
 * Sanitize a whitelisted enum object: strings pass through (they are enums, not
 * free text), booleans pass through, and any number is bucketed - and if its key
 * even looks money-related it is dropped entirely as a belt-and-suspenders guard.
 */
function sanitize(fields: Record<string, string | number | boolean>): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === 'number') {
      if (DOLLARISH_KEY.test(k)) continue; // never log money, not even bucketed
      out[k] = bucket(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function logToolCall(
  toolName: string,
  fields: Record<string, string | number | boolean>,
): void {
  const entry = {
    evt: 'tool_call',
    tool: toolName,
    ts: new Date().toISOString(),
    params: sanitize(fields),
  };
  // Single structured line -> Workers Logs / Logpush.
  console.log(JSON.stringify(entry));
}

export function logEvent(evt: string, fields: Record<string, string | number | boolean> = {}): void {
  console.log(JSON.stringify({ evt, ts: new Date().toISOString(), ...sanitize(fields) }));
}
