# Changelog

All notable changes to the Arc & Ledger Tax Tools MCP server. Bump
`SERVER_VERSION` in `wrangler.toml` and `version` in `package.json` together;
`GET /version` and every tool response's `server_version` expose the running
release.

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
