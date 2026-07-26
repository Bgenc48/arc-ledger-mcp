# Arc & Ledger Tax Help MCP server

A public remote Model Context Protocol server for general US tax information,
screening tools, estimates, and firm-specific service tools. It runs as a
stateless Cloudflare Worker and requires no Arc & Ledger account or
authentication.

The project exposes two surfaces:

| Edition | Endpoint | Scope |
|---|---|---|
| Complete server | `https://mcp.arcandledger.com/mcp` | 21 tools, 12 prompts, 4 read-only resources, and 4 optional ChatGPT cards. Some results include first-party firm or service links. |
| Directory edition | `https://mcp.arcandledger.com/directory/mcp` | 13 reviewed educational tools. No prompts, resources, cards, firm pricing, service matching, booking, payment, upload, purchase, or promotional handoff. |

- Complete docs: https://www.arcandledger.com/mcp/
- Directory docs: https://www.arcandledger.com/mcp/directory/
- MCP privacy policy: https://www.arcandledger.com/mcp/privacy/
- Support: https://www.arcandledger.com/contact/

Every result is general information, not tax advice, and creates no
practitioner-client relationship. The tools do not file, transmit, sign,
certify, authorize payment, or access a taxpayer account.

## Connect

No API key, OAuth flow, or Arc & Ledger account is required. For the reviewed
educational surface, use:

```text
https://mcp.arcandledger.com/directory/mcp
```

For local Claude Code testing:

```bash
claude mcp add --transport http arc-ledger-tax-reference https://mcp.arcandledger.com/directory/mcp
```

The complete endpoint remains available to users who intentionally want the
firm-specific public tools documented on the main MCP page.

## Directory tool set

The directory edition is the surface proposed for the OpenAI Plugins Directory
and Anthropic Software Directory.

| Tool | General purpose |
|---|---|
| `decode_irs_notice` | Explain a supported IRS notice code and usual response path. |
| `check_resolution_options` | Screen general IRS payment and collection alternatives. |
| `estimate_irs_penalty` | Estimate selected federal late-filing, late-payment, and underpayment amounts. |
| `explain_tax_document` | Explain the purpose and common fields of a named US tax document. |
| `deadline_calendar` | Return common federal filing and payment dates. |
| `check_fbar_fatca` | Screen general FBAR and Form 8938 thresholds. |
| `check_treaty_withholding` | Explain general withholding rules and supported US-Turkey treaty rates. |
| `check_itin_eligibility` | Screen general ITIN reason categories without treating entity ownership as automatic eligibility. |
| `check_5472_obligation` | Screen common Form 5472 triggers. |
| `estimate_quarterly_taxes` | Estimate federal quarterly payments and show assumptions. |
| `estimate_accountable_plan` | Estimate potentially reimbursable expenses, including split 2026 mileage rates. |
| `estimate_augusta_rule` | Screen the fewer-than-15-days home-rental rule and calculate conditional amounts. |
| `estimate_rental_income` | Estimate a basic rental-income result and modeled limitations. |

Each directory result:

- cites an official IRS or FinCEN page;
- includes a shared general-information limitation;
- tells the calling model to preserve exact returned figures and dates;
- contains no Arc & Ledger service, contact, booking, payment, or upload link.

The directory edition intentionally excludes firm quotations, consultations,
document collection, service matching, formation-state comparisons, sales-tax
nexus screens, and reasonable-compensation ranges. Those tools either have a
commercial purpose, rely on changing state data, or need more professional
judgment than a short deterministic screen should imply.

## Privacy and safety

- Tool inputs are processed in memory to answer the request.
- The Worker writes no tool-call inputs, outputs, tool names, or per-call
  analytics to application logs.
- Cloudflare Worker observability is disabled.
- The server uses the request's network address temporarily as a rate-limit
  key. It is not written to application storage or paired with the tool body.
- There is no MCP request database, user history, tax-return store, or document
  upload surface.
- Users are instructed not to send SSNs, ITINs, EINs, tax account numbers,
  bank details, passwords, or documents.
- All tools carry `readOnlyHint: true`, `destructiveHint: false`, and an
  explicit `openWorldHint`.

Cloudflare still processes ordinary request metadata as the infrastructure
provider. The public privacy policy describes that boundary.

## Claude plugin

`plugin/` is a Claude plugin bundle that points to the directory endpoint and
adds two procedural Skills:

- `respond-to-your-irs-notice`
- `resolve-back-taxes`

The Skills use only tools available on the directory edition. They lead with
deadlines and filing-compliance gates, label estimates, retain official source
links, request no sensitive identifiers or documents, and do not promote or
sell a firm service.

The repository marketplace manifest lives at
`.claude-plugin/marketplace.json`.

```text
/plugin marketplace add Bgenc48/arc-ledger-mcp
/plugin install arc-ledger-irs@arc-ledger
```

## Architecture

- Stateless Streamable HTTP JSON-RPC handler, with no sessions or Durable
  Objects.
- Official `@modelcontextprotocol/sdk` protocol types and `zod` input schemas.
- Two registries: the complete server in `src/registry.ts` and the restricted
  directory surface in `src/directory.ts`.
- A 65,536-byte request-body cap, JSON content-type enforcement, batch limits,
  CORS handling, and per-network-address rate limiting.
- Per-tool kill switch through `DISABLED_TOOLS`.
- Version, tax-year, and active-tool counts exposed by `GET /version`.
- Apps SDK widgets are bound only on the complete server. The directory
  edition exposes standard MCP results with no UI resource.

## Routes

| Route | Purpose |
|---|---|
| `POST /mcp` | Complete MCP surface. |
| `POST /directory/mcp` | Restricted directory MCP surface. |
| `GET /healthz` | Liveness. |
| `GET /version` | Version, tax year, tool counts, and directory endpoint. |
| `GET /.well-known/mcp-registry-auth` | MCP Registry domain proof. |
| `GET /.well-known/openai-apps-challenge` | Exact OpenAI domain challenge when configured. |

## Commands

```bash
npm ci
npm run typecheck
npm test
npm run dev
npm run bundle-check
npm run gen:products
node scripts/gen-examples.mjs
```

`npm run bundle-check` runs a Cloudflare Worker dry deployment. The bundled
`workerd` binary does not support every local Windows ARM64 environment, so
the hosted CI result is the release gate when that platform limitation occurs.

## Layout

```text
src/
  index.ts            Worker routes, request limits, and registry selection
  registry.ts         Complete 21-tool and 12-prompt registry
  directory.ts        Restricted 13-tool directory registry and output scrubber
  pricing.ts          Adapter over the published pricing data source
  rates.ts            Adapter over reviewed tax-year constants
  resources.ts        Complete-server read-only resources
  lib/                MCP, response, rate-limit, tax, date, and schema helpers
  tools/              One module per tool
  ui/                 Complete-server Apps SDK widgets
plugin/               Claude plugin bundle
test/                 Protocol, HTTP, tax, directory, privacy, and governance tests
```

## License

Source-available for transparency and directory review. All rights reserved;
see `LICENSE`.
