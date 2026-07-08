/**
 * Pricing adapter - the ONLY bridge between this Worker and the website's
 * single source of truth for every published price.
 *
 * We re-export `src/data/pricing.ts` verbatim. That file is pure TypeScript with
 * a self-contained body (no React/DOM/vite imports), so Wrangler's esbuild
 * bundles it directly and Vitest imports it in tests. NOTHING in this package
 * may hardcode a dollar figure - read it from here. If a number is missing from
 * pricing.ts, it must be added THERE first (see the website CLAUDE.md pricing
 * rule), never invented in the Worker.
 */
export * from '../../src/data/pricing';

// A couple of format helpers are re-exported by name for convenience so tools
// never re-implement money formatting (format-only; they never alter a value).
export { usd, usdRange, groupThousands } from '../../src/data/pricing';
