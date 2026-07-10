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

/* ─── Federal-holiday-aware due dates (IRC 7503) ──────────────────────────────
 * A statutory filing deadline that lands on a Saturday, Sunday, or legal holiday
 * moves to the next day that is none of those (IRC 7503). "Legal holiday"
 * includes District of Columbia holidays, which is why DC Emancipation Day
 * (April 16, observed) can push the April filing deadline - so it is included
 * in the set below alongside the federal holidays. All math is in UTC.
 */

const utc = (year: number, month1: number, day: number): Date =>
  new Date(Date.UTC(year, month1 - 1, day));

/** A fixed-date holiday's OBSERVED date: Saturday -> Friday, Sunday -> Monday. */
function observed(year: number, month1: number, day: number): Date {
  const d = utc(year, month1, day);
  const wd = d.getUTCDay();
  if (wd === 6) return addDays(d, -1);
  if (wd === 0) return addDays(d, 1);
  return d;
}

/** The nth given weekday of a month (weekday: 0=Sun..6=Sat). */
function nthWeekday(year: number, month1: number, weekday: number, n: number): Date {
  let d = utc(year, month1, 1);
  let count = 0;
  for (;;) {
    if (d.getUTCDay() === weekday && ++count === n) return d;
    d = addDays(d, 1);
  }
}

/** The last given weekday of a month. */
function lastWeekday(year: number, month1: number, weekday: number): Date {
  let d = utc(year, month1 + 1, 1); // first of next month
  d = addDays(d, -1); // last day of target month
  while (d.getUTCDay() !== weekday) d = addDays(d, -1);
  return d;
}

/** Federal legal holidays (observed) for a year, plus DC Emancipation Day. */
function legalHolidays(year: number): Set<string> {
  return new Set(
    [
      observed(year, 1, 1), // New Year's Day
      nthWeekday(year, 1, 1, 3), // Birthday of MLK Jr. (3rd Monday of Jan)
      nthWeekday(year, 2, 1, 3), // Washington's Birthday (3rd Monday of Feb)
      observed(year, 4, 16), // DC Emancipation Day (observed) - shifts the April deadline
      lastWeekday(year, 5, 1), // Memorial Day (last Monday of May)
      observed(year, 6, 19), // Juneteenth National Independence Day
      observed(year, 7, 4), // Independence Day
      nthWeekday(year, 9, 1, 1), // Labor Day (1st Monday of Sep)
      nthWeekday(year, 10, 1, 2), // Columbus Day (2nd Monday of Oct)
      observed(year, 11, 11), // Veterans Day
      nthWeekday(year, 11, 4, 4), // Thanksgiving (4th Thursday of Nov)
      observed(year, 12, 25), // Christmas Day
    ].map(toIso),
  );
}

/** True when a date is a Saturday, Sunday, or legal holiday. */
export function isBusinessDay(date: Date): boolean {
  const wd = date.getUTCDay();
  if (wd === 0 || wd === 6) return false;
  return !legalHolidays(date.getUTCFullYear()).has(toIso(date));
}

/**
 * Roll a statutory date forward to the next business day per IRC 7503: skip
 * Saturdays, Sundays, and legal holidays (including observed DC Emancipation
 * Day). Returns the date unchanged when it is already a business day.
 */
export function rollToBusinessDay(date: Date): Date {
  let d = date;
  while (!isBusinessDay(d)) d = addDays(d, 1);
  return d;
}
