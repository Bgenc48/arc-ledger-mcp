# Arc & Ledger Tax Tools - MCP server

A public, no-auth remote **MCP server** that exposes Arc & Ledger's free tax
calculators and intake funnel as tools inside AI assistants (Claude, ChatGPT).
Runs as a stateless Cloudflare Worker; nothing is filed, purchased, or stored.

- **Endpoint:** `https://mcp.arcandledger.com/mcp` (Streamable HTTP)
- **Docs:** https://www.arcandledger.com/mcp
- **Privacy:** https://www.arcandledger.com/mcp/privacy

## Tools

| Tool | Purpose |
|---|---|
| `decode_irs_notice` | Explain an IRS notice, its deadline, and what to do. |
| `check_fbar_fatca` | FBAR / Form 8938 obligations, thresholds, catch-up. |
| `compare_llc_scorp` | SE tax vs salary+distribution, CA franchise, break-even. |
| `estimate_quarterly_taxes` | Federal + CA quarterly estimates with safe harbor. |
| `estimate_rental_income` | Net rental income, depreciation, passive-loss allowance, 14-day rule. |
| `deadline_calendar` | US filing deadlines + penalties for founders (1120/5472, 1040-NR, FBAR, BOI). |
| `check_itin_eligibility` | ITIN eligibility, W-7 category, documents; Enrolled Agent prepares the W-7 and represents you. |
| `estimate_irs_penalty` | Failure-to-file / failure-to-pay penalties + interest on a balance; abatement. |
| `compare_formation_states` | Wyoming vs New Mexico vs Delaware vs California for a US LLC. |
| `check_sales_tax_nexus` | Economic + physical (FBA) sales-tax nexus by state. |
| `get_fee_quote` | Published fee range and line items for firm services. |
| `book_consultation` | First-party booking link + office identity. |

Plus five prompts (three English, two Turkish for founders):
`decode_my_irs_notice`, `am_i_required_to_file_fbar`, `should_i_be_an_scorp`,
`abd_sirket_vergi_takvimi`, `itin_almali_miyim`.

And four read-only **resources** (`arcledger://office`, `arcledger://services`,
`arcledger://fee-catalog`, `arcledger://tool-directory`) so an assistant can
cite the firm's identity, service directory, and fee catalog directly.

## Design

- **Stateless** Streamable-HTTP JSON-RPC handler (no sessions, no Durable
  Objects). Uses the official `@modelcontextprotocol/sdk` types + `zod`.
- **No hardcoded prices or rates.** `src/pricing.ts` re-exports the published
  fee schedule in `src/data/pricing.ts` (same numbers as arcandledger.com/pricing/);
  `src/rates.ts` re-exports the 2026 tax constants in `src/data/taxConstants2026.ts`
  and adds only genuinely-new pieces (safe harbor, CA S-corp rate, Form 8938
  matrix, CA 30/40/0/30). Both are the single sources of truth.
- **Shared response envelope:** every tool returns the same `disclaimer`, a
  first-party `source_url`, and one first-party `next_step` handoff.
- **Privacy:** inputs processed in memory; logs carry only tool name, timestamp,
  and coarse enums (never free text or dollar amounts). 30-day retention.
- **Rate limiting:** per-IP token bucket (60/min, burst 10) + the native
  `RATE_LIMITER` binding when bound.

## Commands

```bash
npm install
npm test              # 109 tests: protocol, HTTP surface, tool correctness, resources, widget
npm run typecheck
npm run dev           # wrangler dev (local)
npm run deploy        # wrangler deploy (needs the Cloudflare account)
npm run gen:products  # regenerate public/feeds/products.json from pricing.ts
node scripts/gen-examples.mjs      # regenerate docs/worked-examples.json
```

## Layout

```
src/
  index.ts            Worker entry: /mcp, /healthz, /version, CORS, rate limit
  registry.ts         The 15 tools + 5 prompts
  pricing.ts          Adapter -> data/pricing.ts (SSOT for prices)
  rates.ts            Adapter -> data/taxConstants2026.ts + server-only tax constants
  lib/                mcp (protocol), response, logging, rateLimit, tax, dates, schemas
  tools/              one file per tool
  data/               pricing, tax constants, product catalog, service pages, IRS notices
submissions/          Anthropic + OpenAI payloads + listing copy
assets/               logo, favicon, response screenshots + paired prompts
```

