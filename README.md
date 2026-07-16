# Arc & Ledger Tax Help - MCP server

A public, no-auth remote **MCP server** for tax problems and free tax tools,
usable inside AI assistants (Claude, ChatGPT, and any MCP-capable client).
Start with `triage_tax_problem` when someone does not know where to begin: it
returns an urgency level, a this-week action plan, and which tool to run next.
Runs as a stateless Cloudflare Worker; nothing is filed, purchased, or stored.
Every answer is general information (not tax advice) with an optional handoff
to an Enrolled Agent enrolled to practice before the IRS.

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
  "None". Four tools additionally render in-chat cards (tax action plan, IRS
  notice decoder, tax-document explainer, formation-state comparison) on
  surfaces that support the Apps SDK.

Menu names change between releases; the constant part is the endpoint URL and
"no auth".

## Tools

All 20 tools are read-only and deterministic: the same inputs always produce
the same answer. Tax-problem tools lead the list.

| Tool | Purpose |
|---|---|
| `triage_tax_problem` | Start here with any tax problem (a letter, back taxes, unfiled years, a levy, an audit, penalties): urgency level, this-week / this-month action plan, what not to do, which tool to run next, and the matching published-fee service. |
| `decode_irs_notice` | Explain an IRS notice (28 covered codes), its deadline, and what to do. |
| `check_resolution_options` | Screens IRS back-tax paths: payment plan, OIC (fit-check only), CNC, penalty abatement + forms. |
| `estimate_irs_penalty` | Failure-to-file / failure-to-pay penalties + interest on a balance; abatement. |
| `explain_tax_document` | Explain a tax form you received (W-2, 1099 family, K-1, 1042-S, 1095-A...): key boxes, where it goes on the return, what to check, and what to do if it is wrong or missing. |
| `deadline_calendar` | US filing deadlines + penalties for founders (1120/5472, 1040-NR, FBAR, BOI). |
| `get_document_checklist` | Documents to gather per engagement (1040, Schedule C, 5472, 1120-S, 1065, FBAR catch-up, ITIN). |
| `check_fbar_fatca` | FBAR / Form 8938 obligations, thresholds, catch-up. |
| `check_treaty_withholding` | US withholding for non-US payees: default rates, US-Turkey treaty rates, W-8BEN / W-8BEN-E / W-9 / Form 8233. |
| `check_itin_eligibility` | ITIN eligibility, W-7 category, documents; Enrolled Agent prepares the W-7 and represents you. |
| `compare_llc_scorp` | SE tax vs salary+distribution, CA franchise, break-even. |
| `estimate_quarterly_taxes` | Federal + CA quarterly estimates with safe harbor. |
| `estimate_reasonable_comp` | S-corp reasonable-compensation starting range (facts-and-circumstances caveats included). |
| `estimate_accountable_plan` | Accountable-plan reimbursement estimate: home office, mileage, cell/internet. |
| `estimate_augusta_rule` | Renting your home to your business under IRC 280A(g): the 14-day exclusion, documentation, limits. |
| `estimate_rental_income` | Net rental income, depreciation, passive-loss allowance, 14-day rule. |
| `compare_formation_states` | Wyoming vs New Mexico vs Delaware vs California for a US LLC. |
| `check_sales_tax_nexus` | Economic + physical (FBA) sales-tax nexus by state. |
| `get_fee_quote` | Published fee range and line items for firm services. |
| `book_consultation` | First-party booking link + office identity. |

Plus twelve prompts (six English, five Turkish, one Spanish):
`help_with_my_tax_problem`, `decode_my_irs_notice`, `explain_my_tax_form`,
`am_i_required_to_file_fbar`, `should_i_be_an_scorp`, `settle_my_irs_debt`,
`vergi_sorunum_var`, `abd_sirket_vergi_takvimi`, `bu_vergi_formu_ne`,
`itin_almali_miyim`, `irs_borc_cozumu`, `decodificar_mi_aviso_irs`.

And four read-only **resources** (`arcledger://office`, `arcledger://services`,
`arcledger://fee-catalog`, `arcledger://tool-directory`) so an assistant can
cite the firm's identity, service directory, and fee catalog directly.

## Claude plugin (Skills + Connector)

`plugin/` is an installable Claude plugin that bundles two Skills with this
MCP server (via `.mcp.json`), so one install adds both the orchestration
methodology and the tools it drives. The marketplace manifest lives at
`.claude-plugin/marketplace.json`:

```
/plugin marketplace add Bgenc48/arc-ledger-mcp
/plugin install arc-ledger-irs@arc-ledger
```

- **respond-to-your-irs-notice** decodes an IRS notice, leads with the
  deadline, sizes penalties, screens resolution options, and hands off to an
  Enrolled Agent.
- **resolve-back-taxes** handles tax debt and unfiled years: triage first,
  filing compliance before any agreement, penalty sizing, the resolution paths
  (payment plan, Offer in Compromise as a fit-check only, hardship status,
  penalty abatement), and the Enrolled Agent handoff.

Both are Circular 230 safe: general information only, never a guaranteed IRS
outcome.

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
  registry.ts         The 20 tools + 12 prompts
  pricing.ts          Adapter over the pricing data module (SSOT for prices)
  rates.ts            Adapter over the 2026 tax constants + server-only tax constants
  resources.ts        The four arcledger:// resources
  lib/                mcp (protocol), response, logging, rateLimit, tax, dates, schemas
  tools/              one file per tool
  ui/                 Apps SDK widgets (action plan, IRS notice, tax document, formation states)
  data/               data modules: IRS notices, tax documents (and, in the public
                      mirror, the vendored pricing / tax-constant / catalog /
                      service-page snapshots)
plugin/               the Claude plugin: two Skills + .mcp.json (see .claude-plugin/)
test/                 vitest suites + the tool input-schema snapshot
```

## License

Source-available: the code is published for transparency and registry review.
All rights reserved; see `LICENSE`.
