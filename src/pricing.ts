/**
 * Pricing adapter - the ONLY bridge between the Worker and the published fee
 * schedule (the same numbers shown at arcandledger.com/pricing/).
 *
 * We re-export the pricing data module verbatim. In the source monorepo that
 * module is the website's `src/data/pricing.ts` (the site-wide single source
 * of truth); in the public mirror it is the vendored snapshot at
 * `src/data/pricing.ts`, synced on each release. The module is pure TypeScript
 * with a self-contained body (no React/DOM/vite imports), so Wrangler's
 * esbuild bundles it directly and Vitest imports it in tests. NOTHING in this
 * package may hardcode a dollar figure - read it from here. If a number is
 * missing, it must be added to the pricing module first, never invented in
 * the Worker.
 */
export * from './data/pricing';

// A couple of format helpers are re-exported by name for convenience so tools
// never re-implement money formatting (format-only; they never alter a value).
export { usd, usdRange, groupThousands } from './data/pricing';
