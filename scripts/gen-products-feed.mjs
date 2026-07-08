/**
 * Generates ../../public/feeds/products.json from the website's
 * src/data/productCatalog.ts (which reads prices from pricing.ts - the single
 * source of truth). This is the agentic-commerce staging feed: id, name,
 * description, price, currency, url, category per productized SKU and bundle.
 *
 * Run from the arc-ledger-mcp package (it has esbuild):
 *   npm run gen:products     (or: node scripts/gen-products-feed.mjs)
 * Re-run after any price change.
 */
import { build } from 'esbuild';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, '..'); // arc-ledger-mcp
const repoRoot = join(pkgRoot, '..'); // website repo
const BASE_URL = 'https://www.arcandledger.com';
const outFile = join(repoRoot, 'public', 'feeds', 'products.json');
const tmp = join(pkgRoot, '.wrangler', 'products-catalog.bundle.mjs');

mkdirSync(dirname(tmp), { recursive: true });
await build({
  entryPoints: [join(repoRoot, 'src', 'data', 'productCatalog.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: tmp,
  logLevel: 'error',
});

const { PRODUCT_CATALOG } = await import(pathToFileURL(tmp).href);

const products = PRODUCT_CATALOG.map((p) => ({
  id: p.id,
  name: p.name,
  description: p.description,
  price: p.price,
  currency: p.currency,
  url: `${BASE_URL}${p.url}`,
  category: p.category,
  ...(p.recurrence ? { recurrence: p.recurrence } : {}),
}));

const feed = {
  version: '1.0',
  merchant: 'Arc & Ledger Accounting',
  merchant_url: BASE_URL,
  currency: 'USD',
  note: 'Fixed-fee productized SKUs. Prices are authoritative from the firm; scoped services (returns, bookkeeping, resolution) are quoted separately.',
  products,
};

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(feed, null, 2) + '\n');
console.log(`Wrote ${products.length} products to ${outFile}`);
