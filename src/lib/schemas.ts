import { z } from 'zod';

/** Clamp a number into [lo, hi]. */
export const clamp = (n: number, lo: number, hi: number): number => Math.min(Math.max(n, lo), hi);

/**
 * A non-negative dollar input, clamped to a sane ceiling. Rejects
 * non-numbers (so free text where a number is expected fails validation) but
 * forgivingly clamps an out-of-range magnitude instead of erroring.
 */
export const dollars = (max = 1_000_000_000) =>
  z
    .number({ invalid_type_error: 'must be a number' })
    .finite()
    .transform((n) => clamp(n, 0, max));

/** A non-negative integer count, clamped. */
export const count = (max = 100_000) =>
  z
    .number({ invalid_type_error: 'must be a number' })
    .finite()
    .transform((n) => clamp(Math.round(n), 0, max));

/** A calendar-year integer, clamped to a plausible range. */
export const yearCount = (max = 30) =>
  z
    .number({ invalid_type_error: 'must be a number' })
    .finite()
    .transform((n) => clamp(Math.round(n), 0, max));
