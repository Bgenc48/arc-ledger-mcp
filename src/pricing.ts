/**
 * Pricing adapter - the ONLY bridge between the Worker and the published fee
 * schedule.
 *
 * We re-export `src/data/pricing.ts` verbatim. That file is the snapshot of the
 * firm's published price list (the same numbers as arcandledger.com/pricing/),
 * kept in sync with the site on each release. NOTHING in this package may
 * hardcode a dollar figure - read it from here. If a number is missing from
 * pricing.ts, it must be added THERE first, never invented in the Worker.
 */
export * from './data/pricing';

// A couple of format helpers are re-exported by name for convenience so tools
// never re-implement money formatting (format-only; they never alter a value).
export { usd, usdRange, groupThousands } from './data/pricing';
