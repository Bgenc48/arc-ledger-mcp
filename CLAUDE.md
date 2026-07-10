# Arc & Ledger Tax Tools - MCP server

Public, no-auth remote MCP server (Cloudflare Worker, Streamable HTTP) exposing
the firm's free tax calculators and intake tools. Endpoint:
`https://mcp.arcandledger.com/mcp`. Docs: `https://www.arcandledger.com/mcp`.

## Commands

```bash
npm ci                 # install (package-lock is authoritative)
npm test               # vitest: protocol, HTTP surface, tool correctness, resources, widget
npm run typecheck      # tsc --noEmit (strict)
npm run dev            # wrangler dev (local)
npm run bundle-check   # wrangler deploy --dry-run (proves the worker bundles)
npm run deploy         # wrangler deploy (needs the Cloudflare account)
npm run gen:products   # regenerate public/feeds/products.json from the catalog
node scripts/gen-examples.mjs   # regenerate docs/worked-examples.json
```

## This repo is PUBLIC and must build standalone

- Anyone can read this repository. Never commit secrets, internal strategy or
  planning notes, price history ("was $X"), unlaunched products, or anything
  referencing internal documents. Comments are part of the public surface -
  keep them factual and neutral.
- Every import must resolve inside this repo. Never add `../../` imports that
  reach outside the package; vendored data lives in `src/data/`.
- `npm run typecheck`, `npm test`, and `npm run bundle-check` must all pass on
  a fresh clone before any push.

## Architecture

- **Stateless** Streamable-HTTP JSON-RPC handler (no sessions, no Durable
  Objects). `src/index.ts` is the Worker entry (routes `/mcp`, `/healthz`,
  `/version`, `/.well-known/mcp-registry-auth`, CORS, rate limiting);
  `src/lib/mcp.ts` implements the protocol; `src/registry.ts` lists the tools
  and prompts.
- `src/tools/` - one file per tool. `src/resources.ts` - the four read-only
  `arcledger://` resources. `src/ui/` - optional Apps SDK widgets.
- `src/data/` - the vendored single sources of truth: `pricing.ts` (published
  fee schedule), `taxConstants2026.ts` (tax-year constants), `notices.ts` (IRS
  notice registry), `productCatalog.ts` (fixed-fee SKUs), `servicePages.ts`
  (service directory).

## Pricing and rates (single source of truth)

- **Never hardcode a dollar figure in a tool.** Prices come from
  `src/pricing.ts` (adapter over `src/data/pricing.ts`); tax rates and
  thresholds come from `src/rates.ts` (adapter over
  `src/data/taxConstants2026.ts` plus server-only constants documented with
  their statutory source). If a number is missing, add it to the data module
  first.
- `src/data/pricing.ts` carries ONLY published numbers - the same figures shown
  at arcandledger.com/pricing/ and served by the live endpoint. When the firm's
  price list changes, sync the values here (numbers only, never internal
  commentary), bump `SERVER_VERSION` in `wrangler.toml` and `version` in
  `package.json`, and re-run the checks. `GET /version` exposes `PRICE_SET` and
  the tax year so drift is visible in production.
- Formatters (`usd`, `usdRange`, `groupThousands`) format only - they never
  round, alter, or invent a value.
- Tax-LAW figures (penalty amounts, statutory thresholds) are not service
  prices; they live in the rates modules with a statutory citation.

## Compliance rules (Circular 230)

- Every tool response goes through the shared envelope (`src/lib/response.ts`):
  a general-information disclaimer, a first-party `source_url`, and exactly one
  first-party `next_step` handoff. Tests enforce this for every tool.
- Responses are general information, never tax advice; no guaranteed outcomes;
  "Enrolled Agent" phrasing only.
- Tool responses emit only first-party links (`www.arcandledger.com` /go/*
  handoffs and on-site source URLs) - never raw third-party booking or checkout
  URLs.
- Logging (`src/lib/logging.ts`) records tool name, timestamp, and coarse enum
  params only - never free text, dollar amounts, or anything identifying.

## Code style

- TypeScript strict with `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`: array indexing returns `T | undefined`,
  optional props need explicit `| undefined`.
- Never use an em dash in user-visible text (tool output, prompts, README);
  use a regular dash, colon, or period. Turkish content has Turkish prompts -
  keep them natural, not machine-translated.
- Tests assert prices by importing from `src/pricing.ts`, never as literals, so
  a price sync cannot silently diverge from the tools.
