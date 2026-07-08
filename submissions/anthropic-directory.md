# Anthropic Connectors Directory - submission payload

Submit at the MCP directory submission form (clau.de/mcp-directory-submission).
Requirements page: https://claude.com/docs/connectors/building/submission
Review criteria: https://claude.com/docs/connectors/building/review-criteria

Keep this file in sync with the live server so a resubmission is a copy-paste job.

---

## Server basics
- **Server name:** Arc & Ledger Tax Tools
- **Developer / company:** Arc & Ledger Accounting (Enrolled Agent firm, est. 2016), Culver City, CA
- **Category:** Finance / Tax (informational)
- **Short description / tagline:** IRS notice decoding, FBAR checks, and fixed-fee tax quotes from an Enrolled Agent firm. (Full copy: `listing-copy.md`.)

## Connection details
- **Endpoint URL:** `https://mcp.arcandledger.com/mcp`
- **Transport:** Streamable HTTP
- **Authentication:** None (public, read-only). No OAuth, no API keys, no test credentials required.
- **Session model:** Stateless. No sessions, cookies, or user records.
- **Health check:** `GET https://mcp.arcandledger.com/healthz`
- **Version endpoint:** `GET https://mcp.arcandledger.com/version` (returns server version + price-set + tax-year)

## Data & compliance answers
- **Stores user data?** No. Tool inputs are processed in memory and discarded. Only coarse, anonymous operational logs (tool name, timestamp, enum params) are kept for 30 days. Never logs free text or dollar amounts.
- **Collects PII?** No.
- **Health data?** No.
- **Financial data handling?** Users may type figures (e.g. income) as tool inputs; these are used only to compute the response and are not stored or logged (numbers are dropped/bucketed in logs).
- **Payments in chat?** No. The server never processes payments. Handoff links point to the firm's own booking/checkout pages.
- **Regulated advice?** No. Every response is general information, not tax advice, and states that no practitioner-client relationship is created (Circular 230 compliant).

## Tools (15) - all readOnlyHint: true, each with a human-readable title
| Tool name | Title | One-line purpose |
|---|---|---|
| `decode_irs_notice` | Decode an IRS notice | Explain an IRS/state notice, deadline, and what to do. |
| `check_fbar_fatca` | Check FBAR and FATCA obligations | Determine FBAR / Form 8938 filing requirements and catch-up options. |
| `compare_llc_scorp` | Compare LLC vs S-Corp | Side-by-side SE tax vs salary+distribution with break-even. |
| `estimate_quarterly_taxes` | Estimate quarterly taxes | Federal + CA quarterly estimates with safe harbor. |
| `estimate_rental_income` | Estimate rental property taxes | Net rental income, depreciation, passive-loss allowance, 14-day rule. |
| `deadline_calendar` | US filing deadlines for founders | Required forms, due dates, extensions, and penalties (1120/5472, 1040-NR, FBAR, BOI). |
| `check_itin_eligibility` | Check ITIN eligibility | ITIN eligibility, W-7 reason category, and documents; Enrolled Agent prepares the W-7 and represents the applicant. |
| `estimate_irs_penalty` | Estimate IRS penalties and interest | Failure-to-file / failure-to-pay penalties + interest on a balance; first-time abatement. |
| `compare_formation_states` | Compare US formation states | Wyoming vs New Mexico vs Delaware vs California: fees, franchise tax, privacy, timing. |
| `check_sales_tax_nexus` | Check sales-tax nexus | Economic + physical (Amazon FBA) sales-tax nexus by state for online sellers. |
| `estimate_reasonable_comp` | Estimate S-corp reasonable compensation | Starting salary range by profit driver, distribution math, and the facts-and-circumstances test. |
| `estimate_augusta_rule` | Estimate the Augusta rule | Tax-free home rental to your own business (IRC 280A(g)); 14-day limit and documentation. |
| `estimate_accountable_plan` | Estimate accountable-plan reimbursements | Tax-free owner-employee reimbursements (home office, mileage, phone) and the three requirements. |
| `get_fee_quote` | Get a fixed-fee quote | Published price range and line items for firm services. |
| `book_consultation` | Book a consultation | First-party booking link + office identity. |

**Tool annotation confirmation:** every tool sets `annotations.readOnlyHint = true` and `annotations.title`; every tool advertises a valid JSON Schema `inputSchema` (type: object). Verified by `test/tools.test.ts`.

## Resources (4) - read-only, first-party JSON
| URI | Title | Contents |
|---|---|---|
| `arcledger://office` | Arc & Ledger office identity | Practitioner, credentials, address, languages, contact. |
| `arcledger://services` | Service directory | Every service, grouped by category, with page URLs. |
| `arcledger://fee-catalog` | Published fee catalog | Fixed-fee products/bundles with published prices. |
| `arcledger://tool-directory` | Available tools and prompts | What this server can do. |

All resource contents are static per deploy and emit only first-party URLs. Verified by `test/resources.test.ts`.

## Prompts (5) - directory-listable (2 Turkish for founders)
| Prompt name | Title |
|---|---|
| `decode_my_irs_notice` | Decode my IRS notice |
| `am_i_required_to_file_fbar` | Am I required to file FBAR? |
| `should_i_be_an_scorp` | Should I be an S-Corp? |
| `abd_sirket_vergi_takvimi` | ABD sirketimin vergi takvimi (Turkish: my US company's tax calendar) |
| `itin_almali_miyim` | ITIN almali miyim? (Turkish: do I need an ITIN?) |

## Links
- **Documentation:** https://www.arcandledger.com/mcp (public; lists tools + worked examples)
- **Privacy policy:** https://www.arcandledger.com/mcp/privacy (covers collection, use, sharing, sale, 30-day retention, contact)
- **Support channel:** info@arcandledger.com
- **Allowed link URIs (origins we own, used in tool responses):**
  - `https://www.arcandledger.com`
  - `https://mcp.arcandledger.com`
  (Tool responses only emit first-party `/go/*` handoff links and on-site `source_url`s. No raw cal.com / buy.stripe.com URLs.)

## Branding assets
- Logo: `assets/logo-monogram-ink.png` (512x512) + `assets/logo-monogram-white.png`
- Favicon: served at `https://www.arcandledger.com/squarelogo.png`
- Screenshots (5, ~2080px wide, cropped to the response): `assets/screenshots/0*.png`
- Paired prompt text: `assets/screenshots/prompts.txt`

## GA / launch date
Target: on publish of the `/mcp` docs page and DNS cutover of `mcp.arcandledger.com`.

## Surfaces tested
- claude.ai web (custom connector) - see Phase 7 transcripts
- Claude desktop (custom connector)
- (ChatGPT developer mode covered in the OpenAI submission)

---

## Pre-submission review-criteria checklist
- [x] Every tool has `readOnlyHint: true` and a human-readable `title` (annotations).
- [x] Every tool `inputSchema` is a valid JSON Schema object; enums used where appropriate; numerics clamped.
- [x] Tool descriptions are honest "Use this when the user..." sentences, no marketing.
- [x] Public documentation link with 3+ fully worked examples.
- [x] Privacy policy covers all five required topics + contact email.
- [x] Support channel (email) provided.
- [x] Allowed link URIs declared; tool responses use only first-party links.
- [x] No auth required; no test credentials needed for review.
- [x] Stateless; no PII or health data stored; 30-day anonymous log retention documented.
- [x] Server name + descriptions are consistent across server, docs, and listing.
- [x] Health + version endpoints respond.
- [ ] Endpoint reachable at the public URL (requires DNS cutover - deployment step, see launch summary).
- [ ] MCP Inspector run against the deployed URL (Phase 7; done locally against the handler, pending live URL).

## Apps SDK widget (informational for Claude review)
`compare_formation_states` also serves an OPTIONAL in-chat UI resource (`ui://widget/formation-states.html`, mimeType `text/html+skybridge`) via namespaced `openai/*` `_meta` for ChatGPT's Apps SDK. Claude ignores these fields entirely; the tool's text + structuredContent responses are unchanged. The widget is fully self-contained (its CSP declares zero external connect/resource domains).
