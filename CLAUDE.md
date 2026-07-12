# Arc & Ledger Tax Tools - MCP server

Public, no-auth remote MCP server (Cloudflare Worker, Streamable HTTP) exposing
the firm's free tax calculators and intake tools. Endpoint:
`https://mcp.arcandledger.com/mcp`. Docs: `https://www.arcandledger.com/mcp`.

## This repository is a GENERATED artifact

Every file here except the git history is produced by an export script from a
private source tree. Do not develop features in this repository: changes will
be overwritten on the next export. Pull requests are used to sync releases;
issues and review comments are welcome and get folded into the source.

## Commands

```bash
npm ci                 # install (package-lock is authoritative)
npm test               # vitest: protocol, HTTP surface, tool correctness, determinism, schema snapshot, governance
npm run typecheck      # tsc --noEmit (strict)
npm run dev            # wrangler dev (local)
npm run bundle-check   # wrangler deploy --dry-run (proves the worker bundles)
npm run gen:products   # regenerate public/feeds/products.json from the catalog
node scripts/gen-examples.mjs   # regenerate docs/worked-examples.json
```

## This repo is PUBLIC and must build standalone

- Anyone can read this repository. It never contains secrets, internal
  strategy or planning notes, price history ("was $X"), unlaunched products,
  or anything referencing internal documents. Comments are part of the public
  surface - factual and neutral.
- Every import resolves inside this repo. No import reaches outside the
  package (the export pipeline enforces this); vendored data lives in
  `src/data/`.
- `npm run typecheck`, `npm test`, and `npm run bundle-check` must all pass on
  a fresh clone (CI enforces this on every push and pull request).

## Architecture

- **Stateless** Streamable-HTTP JSON-RPC handler (no sessions, no Durable
  Objects). `src/index.ts` is the Worker entry (routes `/mcp`, `/healthz`,
  `/version`, `/.well-known/mcp-registry-auth`, CORS, rate limiting);
  `src/lib/mcp.ts` implements the protocol; `src/registry.ts` lists the tools
  and prompts.
- `src/tools/` - one file per tool. `src/resources.ts` - the four read-only
  `arcledger://` resources. `src/ui/` - Apps SDK widgets (IRS notice card,
  formation-state comparison).
- `src/data/` - the vendored single sources of truth: `pricing.ts` (published
  fee schedule), `taxConstants2026.ts` (tax-year constants), `notices.ts` (IRS
  notice registry), `productCatalog.ts` (fixed-fee SKUs), `servicePages.ts`
  (service directory).
- `server.json` - the Official MCP Registry manifest; its `version` matches
  `package.json` and `wrangler.toml` `SERVER_VERSION`.
- `.github/workflows/ci.yml` - typecheck + tests + bundle check on every push
  and pull request.

## Pricing and rates (single source of truth)

- **Never hardcode a dollar figure in a tool.** Prices come from
  `src/pricing.ts` (adapter over `src/data/pricing.ts`); tax rates and
  thresholds come from `src/rates.ts` (adapter over
  `src/data/taxConstants2026.ts` plus server-only constants documented with
  their statutory source).
- `src/data/pricing.ts` carries ONLY published numbers - the same figures shown
  at arcandledger.com/pricing/ and served by the live endpoint. It is synced
  from the source tree on each release; `GET /version` exposes `PRICE_SET` and
  the tax year so drift is visible in production.
- Formatters (`usd`, `usdRange`, `groupThousands`) format only - they never
  round, alter, or invent a value.
- Tax-LAW figures (penalty amounts, statutory thresholds) are not service
  prices; they live in the rates modules with a statutory citation.

## Release discipline

- Every tool response carries `server_version` (matches `GET /version`), so any
  output is attributable to a release. `SERVER_VERSION` in `wrangler.toml`,
  `version` in `package.json`, and `server.json` `version` move together.
- `test/schema.test.ts` snapshots every tool's inputSchema. Any schema change
  fails the build until the snapshot is updated (`vitest -u`) - the cue for a
  version bump and a changelog line. This keeps an enum/schema change from
  shipping unnoticed.
- `test/golden.test.ts` requires every tool to be deterministic (identical
  inputs, byte-identical output) and pins boundary fixtures. Keep tool output
  deterministic: no `Date.now()`/`Math.random()` leaking into a response.
- `test/governance.test.ts` sweeps rendered output for banned strings (em dash,
  non-compliant credential phrasing, a "$0 - $0" salary) and required strings
  (the disclaimer; the approved credential line). Keep it green.

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

## License

Source-available; see `LICENSE`. The live service is free to use through any
MCP-capable client.
