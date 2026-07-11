# Arc & Ledger Tax Tools - MCP server

A public, no-auth remote **MCP server** that exposes Arc & Ledger's free tax
calculators and intake tools inside AI assistants (Claude, ChatGPT, and any
MCP-capable client). Runs as a stateless Cloudflare Worker; nothing is filed,
purchased, or stored. Every answer is general information (not tax advice)
with an optional handoff to an Enrolled Agent enrolled to practice before the
IRS.

- **Endpoint:** `https://mcp.arcandledger.com/mcp` (Streamable HTTP)
- **Docs:** https://www.arcandledger.com/mcp
- **Privacy:** https://www.arcandledger.com/mcp/privacy

## Connect it

No API key, no account, no OAuth: paste the endpoint URL and go.

- **Claude (web and desktop):** Settings -> Connectors -> Add custom
  connector -> `https://mcp.arcandledger.com/mcp` (no authentication).
- **Claude Code:**
  `claude mcp add --transport http arc-ledger https://mcp.arcandledger.com/mcp`
- **ChatGPT (developer mode):** Settings -> Apps & Connectors -> enable
  developer mode -> create a connector with the same URL, authentication
  "None". Two tools additionally render in-chat cards (IRS notice decoder and
  formation-state comparison) on surfaces that support the Apps SDK.

Menu names change between releases; the constant part is the endpoint URL and
"no auth".

## Tools

All 16 tools are read-only and deterministic: the same inputs always produce
the same answer.

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
| `check_resolution_options` | Screens IRS back-tax paths: payment plan, OIC (fit-check only), CNC, penalty abatement + forms. |
| `compare_formation_states` | Wyoming vs New Mexico vs Delaware vs California for a US LLC. |
| `check_sales_tax_nexus` | Economic + physical (FBA) sales-tax nexus by state. |
| `estimate_reasonable_comp` | S-corp reasonable-compensation starting range (facts-and-circumstances caveats included). |
| `estimate_augusta_rule` | Renting your home to your business under IRC 280A(g): the 14-day exclusion, documentation, limits. |
| `estimate_accountable_plan` | Accountable-plan reimbursement estimate: home office, mileage, cell/internet. |
| `get_fee_quote` | Published fee range and line items for firm services. |
| `book_consultation` | First-party booking link + office identity. |

Plus eight prompts (four English, three Turkish, one Spanish):
`decode_my_irs_notice`, `am_i_required_to_file_fbar`, `should_i_be_an_scorp`,
`settle_my_irs_debt`, `abd_sirket_vergi_takvimi`, `itin_almali_miyim`,
`irs_borc_cozumu`, `decodificar_mi_aviso_irs`.

And four read-only **resources** (`arcledger://office`, `arcledger://services`,
`arcledger://fee-catalog`, `arcledger://tool-directory`) so an assistant can
cite the firm's identity, service directory, and fee catalog directly.

## Design

- **Stateless** Streamable-HTTP JSON-RPC handler (no sessions, no Durable
  Objects). Uses the official `@modelcontextprotocol/sdk` types + `zod`.
- **No hardcoded prices or rates.** `src/pricing.ts` is an adapter over the
  pricing data module: the single source of truth carrying the same numbers
  published at arcandledger.com/pricing/. `src/rates.ts` adapts the 2026 tax
  constants and adds only server-only pieces documented with their statutory
  source (safe harbor, CA S-corp rate, Form 8938 matrix, CA 30/40/0/30).
- **Shared response envelope:** every tool returns the same `disclaimer`, a
  first-party `source_url`, and one first-party `next_step` handoff. A
  content-governance test sweeps every rendered output for banned and
  required strings.
- **Privacy:** inputs processed in memory; logs carry only tool name,
  timestamp, and coarse enums (never free text or dollar amounts), retained
  30 days.
- **Rate limiting:** per-IP token bucket (60/min, burst 10) + the native
  `RATE_LIMITER` binding when bound.

## Endpoints

| Route | Purpose |
|---|---|
| `POST /mcp` | The MCP endpoint (Streamable HTTP, JSON-RPC). |
| `GET /healthz` | Liveness. |
| `GET /version` | Server version, price set, tax year, tool/prompt counts. |
| `GET /.well-known/mcp-registry-auth` | MCP Registry domain-ownership proof. |

## Commands

```bash
npm ci                 # install (package-lock is authoritative)
npm test               # vitest: protocol, HTTP surface, tool correctness, determinism, schema snapshot, governance
npm run typecheck      # tsc --noEmit (strict)
npm run dev            # wrangler dev (local)
npm run bundle-check   # wrangler deploy --dry-run (proves the worker bundles)
npm run gen:products   # regenerate the products.json feed from the catalog
node scripts/gen-examples.mjs   # regenerate docs/worked-examples.json
```

## Layout

```
src/
  index.ts            Worker entry: /mcp, /healthz, /version, /.well-known/mcp-registry-auth, CORS, rate limit
  registry.ts         The 16 tools + 8 prompts
  pricing.ts          Adapter over the pricing data module (SSOT for prices)
  rates.ts            Adapter over the 2026 tax constants + server-only tax constants
  resources.ts        The four arcledger:// resources
  lib/                mcp (protocol), response, logging, rateLimit, tax, dates, schemas
  tools/              one file per tool
  ui/                 Apps SDK widgets (IRS notice card, formation-state comparison)
  data/               data modules: IRS notices (and, in the public mirror, the
                      vendored pricing / tax-constant / catalog / service-page snapshots)
test/                 vitest suites + the tool input-schema snapshot
```

## License

Source-available: the code is published for transparency and registry review.
All rights reserved; see `LICENSE`.
