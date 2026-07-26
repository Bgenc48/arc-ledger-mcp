# Changelog

All notable changes to the Arc & Ledger Tax Help MCP server (formerly listed
as Arc & Ledger Tax Tools; technical identifiers unchanged). Bump
`SERVER_VERSION` in `wrangler.toml` and `version` in `package.json` together;
`GET /version` and every tool response's `server_version` expose the running
release.

## 0.15.0

Directory-submission safety release and midyear mileage correction.

### Added
- `POST /directory/mcp`, a separate submission surface with 13 reviewed
  educational tools. It has no fee quote, booking, firm catalog, marketing
  prompt, UI handoff, service CTA, first-party conversion link, or per-call
  analytics. Every result links to the relevant IRS or FinCEN authority.
- `destructiveHint: false` on every tool, alongside the existing
  `readOnlyHint` and `openWorldHint` annotations required by current directory
  review.
- `/.well-known/openai-apps-challenge`, which serves the exact portal token
  only when `OPENAI_APPS_CHALLENGE` is configured.
- Directory regression tests covering the registry, annotations, resources,
  prompts, representative output branches, first-party-link exclusion, contact
  detail exclusion, and zero per-call logging.

### Fixed
- `estimate_accountable_plan` now applies the two IRS business mileage rates
  for 2026: 72.5 cents before July 1 and 76 cents on or after July 1
  (Announcement 2026-11). When the caller omits the period, the tool returns a
  range instead of silently choosing a rate.
- Accountable-plan copy now reflects the permanent disallowance of
  miscellaneous itemized deductions for unreimbursed employee business
  expenses.
- `check_itin_eligibility` no longer treats foreign ownership of a US LLC as
  automatic personal ITIN eligibility. It identifies the Form 5472 reference
  ID alternative, returns reason-specific statuses, and correctly distinguishes
  a Certifying Acceptance Agent from an ordinary Acceptance Agent.
- `estimate_augusta_rule` now labels its result as a conditional day-count
  screen. It separates the owner-side IRC 280A(g) income exclusion from the
  business-side ordinary, necessary, and reasonable-rent requirements.
- Directory output filtering preserves decimals, removes references to tools
  that are unavailable on the restricted surface, removes direct payment
  links, and omits unrelated state and BOI fields from the federal deadline
  tool.
- The Claude plugin manifest no longer claims an MIT license. The public
  repository's source-available license is the controlling license.

### Changed
- Removed application-level tool-call and rate-limit event logging from the
  entire Worker and disabled Workers observability. Inputs remain in memory
  only for the request. An IP-derived key is processed transiently only to
  enforce the abuse limit.
- The directory surface intentionally excludes commercial tools and tools that
  need a separate neutral redesign or a complete state-law table before review:
  tax-problem triage, document intake, LLC/S-corp comparison, reasonable
  compensation, formation-state comparison, sales-tax nexus, fee quotes, and
  consultation booking.

## 0.14.0

Adds a dedicated Form 5472 obligation checker (18 -> 19 tools).

### Added
- `check_5472_obligation`: answers whether a foreign-owned US entity must file
  Form 5472 with a pro-forma Form 1120, the reportable-transaction rule, the
  deadline and Form 7004 extension, the annual compliance set (registered
  agent, state annual report, BOI where it applies, FBAR when foreign accounts
  cross the threshold), and the penalty for not filing. Distinguishes a
  single-member LLC (files 5472) from a default multi-member LLC (a partnership
  that files Form 1065 instead) and from a US corporation with a 25%+ foreign
  owner. Penalty from `INFO_RETURN_PENALTIES.form5472`; no inlined figures.
  Advertised in the international cluster after `check_itin_eligibility`.
  Clock-free and deterministic.

## 0.13.0

Conversion-design release: urgency-matched contact for act-now situations, a
no-commitment free-download second step on four tools, and factual
penalty-vs-fee context on the fee quote. No schema or price changes.

### Added
- `triage_tax_problem`: when the situation resolves to `act_now` urgency, the
  response now carries an `urgent_contact` block (office phone, WhatsApp,
  hours) and the summary says a call reaches an Enrolled Agent faster than a
  calendar slot. Booking `next_step` unchanged.
- `free_download` field on four tools, each pointing at an existing
  first-party asset in `public/downloads/` (plain links; no email is
  collected): `deadline_calendar` (the 2026 deadlines .ics),
  `decode_irs_notice` (IRS Notice Response Guide PDF),
  `estimate_quarterly_taxes` (quarterly worksheet PDF), and
  `get_document_checklist` (printable checklist PDF). New `DOWNLOADS`
  constant block in `lib/config.ts`.
- `get_fee_quote`: the `formation` and `international_form` quotes now state
  the Form 5472 penalty ($25,000 per form per year, from
  `INFO_RETURN_PENALTIES`) next to the preparation line items, as factual
  stakes context.

## 0.12.0

Tax-problem front door release: the server now leads with help for people in
trouble with the IRS, and the Claude plugin actually ships with the public
repository.

### Added
- `triage_tax_problem` (tool 20): the front door for any tax problem. Takes a
  coarse problem category (IRS or state letter, back taxes, unfiled years,
  levy or garnishment, audit, penalties, identity verification, payroll tax,
  state tax, or not sure) plus optional amount band, years behind, and a
  deadline-soon flag, and returns an urgency level (act now / act this week /
  plan this month), a this-week and this-month action plan, what not to do,
  which tool to run next, and the matching published-fee service. Enums and
  booleans only: no free text, no exact dollar amounts, fully deterministic.
- A fourth Apps SDK widget: the tax action-plan card (urgency banner,
  numbered this-week and this-month steps, what not to do, one Enrolled Agent
  handoff button). Self-contained, light and dark themes, `openai/widgetCSP`
  declares zero external domains.
- Two new prompts (10 -> 12): `help_with_my_tax_problem` (English) and
  `vergi_sorunum_var` (Turkish).
- A second plugin Skill, `resolve-back-taxes`: tax debt and unfiled years,
  sequence-first (filing compliance before any agreement), with a
  resolution-path reference map. Plugin version 0.2.0.
- The export script now ships `plugin/` and `.claude-plugin/marketplace.json`
  to the public mirror, so `/plugin marketplace add Bgenc48/arc-ledger-mcp`
  resolves; a structural self-check pins the install path, and the mirror
  test suite sweeps the plugin files for forbidden content.

### Changed
- Display name is now **Arc & Ledger Tax Help** (initialize `serverInfo.title`,
  `GET /version` name, registry manifest title, README, docs). Technical
  identifiers are unchanged: the `arc-ledger-mcp` slug, the
  `com.arcandledger/tax-tools` registry name, the endpoint, and the
  `arc-ledger-irs` plugin id.
- Tools are advertised tax-problems-first: triage, notice decoding,
  resolution screening, and penalty math lead the list; formation and
  planning tools follow; the fee quote and booking handoffs close it.
- The initialize `instructions` now tell assistants to call
  `triage_tax_problem` first when someone has a tax problem and does not know
  where to start, and note that tools and prompts work in English, Turkish,
  and Spanish.

## 0.11.1

Constants re-home (no value or behavior changes).

### Changed
- `IRS_UNDERPAYMENT_ANNUAL_RATE`, `IRS_RATE_VERIFIED_THROUGH`, and
  `FTF_MINIMUM_OVER_60_DAYS` moved from `src/rates.ts` into the shared
  constants module (`taxConstants2026`), which `src/rates.ts` re-exports.
  Values are unchanged; the website's penalty calculator now imports the same
  figures, so the two surfaces cannot drift apart. The quarterly re-verify
  gate in `test/drift.test.ts` is unchanged.

## 0.11.0

Document-widget and notice-landing-page release.

### Added
- `explain_tax_document` now renders an in-chat Apps SDK widget (a document
  card: what the form is, who sends it and when, the boxes that matter, where
  it goes on the return, what to check, what to do if it is wrong or missing,
  and a single Enrolled Agent handoff). Third widget alongside the IRS notice
  card and the formation-state comparison; fully self-contained, light and
  dark themes, `openai/widgetCSP` declares zero external domains.

### Changed
- Four more notice codes now resolve `decode_irs_notice` `source_url` to their
  own dedicated guide page instead of the notices hub: CP05 (refund review),
  5071C (identity verification), CP523 (installment-agreement default), and
  CP215 (civil penalty). The corresponding landing pages ship on the website;
  the worker registry marks these `hasLandingPage: true`.

## 0.10.0

Document-explanation release: the server now explains the tax documents people
receive, not only the IRS notices that follow them.

### Added
- `explain_tax_document` (tool 19): explains 28 common US tax documents - W-2,
  W-2G, the 1099 family (NEC, MISC, K, INT, DIV, B, DA, R, G, C, S, SA, Q),
  Schedule K-1 (1065, 1120-S, 1041), SSA-1099, 1042-S, 5498, 1098, 1098-T,
  1098-E, 1095-A and 1095-B/C, and the W-9 / W-8BEN requests. Each profile
  covers who sends it and when, what it is, where it goes on the return, the
  key boxes, what to verify before filing, what to do when it is wrong or
  missing, and how the IRS matches it. Fuzzy lookup normalizes spellings
  ("Form 1099-K", "1099k", "Schedule K-1 (Form 1065)", "K-1") with an
  output-sanitized fallback for unknown names.
- 15 new IRS notice profiles in `decode_irs_notice` (13 -> 28 codes): CP05 and
  CP05A refund reviews, CP75 credit audits (EITC), Letter 12C missing-information
  holds (the 1095-A / Form 8962 case), 5071C and 4883C identity verification,
  CP59 unfiled-return (with CP515/CP516/CP518 aliases), CP80 unapplied credits,
  CP21A and CP22A adjustment notices, CP23 estimated-payment mismatch, CP49
  refund offset, CP523 installment-agreement default, CP71C annual balance
  reminder, and CP215 civil penalties (late Form 5472/5471, late 1120-S/1065,
  late W-2/1099, Forms 3520/3520-A) with the CP15 individual alias.
- Two new prompts (8 -> 10): `explain_my_tax_form` (English) and
  `bu_vergi_formu_ne` (Turkish).

### Changed
- The source-URL map gained the individual-tax service page, the default
  backing page for document explanations.

## 0.9.0

Accuracy and resilience release following an external product and security
review of the live server.

### Added
- `check_treaty_withholding`: US withholding on dividends, interest,
  royalties, personal services, and scholarships for non-US payees; the
  US-Turkey treaty rates; which form to give the payer (W-8BEN, W-8BEN-E,
  W-9, Form 8233); and the TIN/ITIN requirement behind a treaty claim.
- `get_document_checklist`: the documents to gather per engagement
  (individual, self-employed, foreign-owned LLC Form 5472, S-corp,
  partnership, FBAR/Streamlined catch-up, ITIN), with first-year onboarding
  extras and secure-upload guidance.
- A `relay` field stamped on every tool response (exact string, defined once):
  instructs the calling assistant to present figures, dates, and deadlines
  verbatim - no rounding, no currency conversion - and states that all amounts
  are US dollars. Also added to the shared `outputSchema` and enforced by the
  governance tests.
- Per-tool kill switch: the `DISABLED_TOOLS` var (comma-separated tool names)
  removes a tool from `tools/list` and answers `tools/call` with a fixed
  "temporarily offline" message, so one stale rate can be pulled within
  minutes without touching the other tools. `GET /version` reports the
  disabled count.
- Offer in Compromise application fee ($205, waived under the low-income
  certification) in `check_resolution_options`, sourced from `rates.ts`.

### Changed
- `compare_llc_scorp` no longer describes its default salary as a "neutral
  50% split": when no salary estimate is given it uses the midpoint of the
  reasonable-compensation starting range for an owner-services business, and
  the response states explicitly that no IRS safe-harbor percentage exists
  and points to `estimate_reasonable_comp`. Both compensation tools now name
  the no-safe-harbor rule (governance-tested) and cite David E. Watson, P.C.
  v. United States, 668 F.3d 1008 (8th Cir. 2012).
- `deadline_calendar`'s BOI section now spells out the formation-jurisdiction
  rule (US-formed companies exempt under the March 2025 FinCEN interim final
  rule; foreign-formed entities registered in a US state generally still
  file), notes the pending final rule, notes the New York LLC Transparency
  Act, and states that BOI status does not change Form 5472 obligations.
- `estimate_augusta_rule` cites Sinopoli v. Commissioner (T.C. Memo 2023-105)
  and asks for written quotes from more than one comparable venue.
- Sales-tax nexus table: Illinois and Utah are now dollar-only (both repealed
  the 200-transaction test, effective 2026-01-01 and 2025-07-01); the general
  rule notes the repeal trend. Kentucky drops its transaction test 2026-08-01
  (dated note in `rates.ts`).
- Fixed the accountable-plan mileage line, which rendered the 72.5 cents/mile
  rate as "$0/mile" (whole-dollar formatting applied to a fractional rate).
  The reimbursement math was always correct.
- The schema snapshot test now pins each tool's title, description, and
  annotations alongside its inputSchema, so a silent description change fails
  CI the same way a schema change does.

## 0.8.0

Directory-readiness hardening for the ChatGPT App and Claude connector
submissions, plus an installable Claude plugin.

### Added
- `outputSchema` on every tool's `tools/list` entry (ChatGPT's Apps SDK
  requires one; the MCP spec makes it optional). All 16 tools advertise the
  shared response-envelope schema, which `structuredContent` satisfies by
  construction.
- `brief:true` input on `decode_irs_notice` and `check_resolution_options` for
  shorter answers (token frugality).
- `plugin/`: an installable Claude plugin bundling the
  `respond-to-your-irs-notice` Skill with this MCP server via `.mcp.json`,
  plus the `.claude-plugin/marketplace.json` manifest.
- `IRS_RATE_VERIFIED_THROUGH` in `rates.ts` and a drift test that fails at the
  start of each new quarter until the IRC 6621 underpayment rate is re-verified.

### Changed
- CTA redesign across 14 informational tools: `next_step` labels no longer
  carry a price (published fees stay in `get_fee_quote` / `book_consultation`
  and on the linked pages); `decode_irs_notice` and `estimate_irs_penalty`
  escalate their handoff only when the result actually warrants it (an urgent
  deadline, a material penalty); no tool links directly to a checkout.
- Slimmed `check_resolution_options` and `check_fbar_fatca` structured output
  (removed embedded per-option fee strings; shortened prose) for response
  minimization.
- Server instructions no longer describe the tools as an "intake funnel."

## 0.7.0

Registry readiness and a rebuilt public-repository pipeline. No tool behavior
or input-schema changes.

### Added
- `GET /.well-known/mcp-registry-auth` on the deployed worker: the ed25519
  domain-ownership proof for the Official MCP Registry.
- `server.json` manifest (Official MCP Registry) in the public repository.
- CI for the public repository: typecheck, tests, and a bundle check run on
  every push and pull request.
- `LICENSE` (source-available): the code is published for transparency and
  registry review; all rights reserved.

### Changed
- The public repository (`github.com/Bgenc48/arc-ledger-mcp`) is now generated
  from the source tree by an export script instead of being synced by hand.
  This release brings it to full parity with the live server: it adds the
  `check_resolution_options` tool, the `settle_my_irs_debt`, `irs_borc_cozumu`,
  and `decodificar_mi_aviso_irs` prompts, the IRS notice widget, and the
  current test suites.
- README overhaul: complete 16-tool table, connect instructions for Claude and
  ChatGPT, and an accurate layout section.
- Internal comment cleanup across `src/` and `test/`.

## 0.6.0

Fixes from an external diagnostic review of the live server, plus new release
gates in the test suite.

### Fixed
- **estimate_reasonable_comp** no longer returns a `$0` salary at `$0` (or
  negative) net profit, and no numeric salary below a $25,000 meaningful-profit
  floor. Reasonable compensation is measured against services performed, not
  book profit; these cases now return a fixed conversation-needed message with
  no salary figure.
- **deadline_calendar** now rolls every statutory due and extension date forward
  past Saturdays, Sundays, and legal holidays per IRC 7503, including observed
  DC Emancipation Day. TY2025 Form 1120-S now correctly reports March 16, 2026
  (statutory March 15 is a Sunday).

- **compare_formation_states** no longer pastes a state's "profile" blurb into
  the recommendation rationale (which read as a self-contradiction, e.g.
  recommending California with its "only when you operate here" profile). The
  recommendation rationale and the per-state profile are now separate.
- **compare_formation_states** surfaces a Delaware C-corporation note when the
  caller is raising venture capital (institutional VC requires a Delaware
  C-corp, not an LLC; that entity choice precedes the state question).
- **estimate_quarterly_taxes** no longer silently assumes California when the
  `state` parameter is omitted; it models federal only and asks for the state,
  so a non-California user is not shown California installment timing.
- **check_fbar_fatca** boundary wording now states the "exceeds $10,000" test
  explicitly and clarifies the exact-$10,000 case and intra-year peak.
- **estimate_irs_penalty** summary now notes the interest figure is approximate
  (compounds daily, rate resets quarterly), matching the structured detail.

### Added
- Every tool response carries a `server_version` field (matches `GET /version`)
  so any output is attributable to a specific release.
- `rollToBusinessDay` / `isBusinessDay` helpers in `lib/dates.ts` with a federal
  + DC holiday calendar; date-roll fixtures for 2026-2029.

### Release discipline (test harness)
- **Determinism harness** (`test/golden.test.ts`): every tool, 20x with identical
  inputs, must return byte-identical output, plus boundary fixtures
  (FBAR $10k, Form 8938 abroad flip, Augusta 14/15, deadline roll).
- **Schema-contract snapshot** (`test/schema.test.ts`): any tool input-schema
  change fails CI until the snapshot is updated, which is the cue to bump the
  version and add a changelog line. Closes the silent-enum-drift gap.
- **Content-governance gate** (`test/governance.test.ts`): banned-string (em
  dash, "IRS-licensed", "IRS Enrolled Agent", "Certified Acceptance Agent",
  "MST", a "$0 - $0" salary) and required-string (disclaimer, approved credential
  line) checks over rendered tool/resource/prompt output.
- This CHANGELOG.
