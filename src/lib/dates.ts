/** UTC date helpers for deadline math. All inputs/outputs are ISO YYYY-MM-DD. */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse a strict YYYY-MM-DD string to a UTC Date, or null if malformed/invalid. */
export function parseIsoDate(s: string): Date | null {
  if (!ISO_DATE.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  // Guard against rollover (e.g. 2026-02-31 -> Mar 3).
  if (d.toISOString().slice(0, 10) !== s) return null;
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (can be negative). */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/** A readable US date: 2026-07-15 -> "July 15, 2026". */
export function humanDate(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

/** Today at UTC midnight (deterministic within a request). */
export function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
