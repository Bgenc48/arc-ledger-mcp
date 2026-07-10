# Changelog

All notable changes to the Arc & Ledger Tax Tools MCP server. Bump
`SERVER_VERSION` in `wrangler.toml` and `version` in `package.json` together;
`GET /version` and every tool response's `server_version` expose the running
release.

## 0.6.0

Diagnostic remediation, Phase 0 (launch-gate fixes).

### Fixed
- **estimate_reasonable_comp** no longer returns a `$0` salary at `$0` (or
  negative) net profit, and no numeric salary below a $25,000 meaningful-profit
  floor. Reasonable compensation is measured against services performed, not
  book profit; these cases now return a fixed conversation-needed message with
  no salary figure. (P0-1)
- **deadline_calendar** now rolls every statutory due and extension date forward
  past Saturdays, Sundays, and legal holidays per IRC 7503, including observed
  DC Emancipation Day. TY2025 Form 1120-S now correctly reports March 16, 2026
  (statutory March 15 is a Sunday). (P0-2)

- **compare_formation_states** no longer pastes a state's "profile" blurb into
  the recommendation rationale (which read as a self-contradiction, e.g.
  recommending California with its "only when you operate here" profile). The
  recommendation rationale and the per-state profile are now separate. (P1-1)
- **compare_formation_states** surfaces a Delaware C-corporation note when the
  caller is raising venture capital (institutional VC requires a Delaware
  C-corp, not an LLC; that entity choice precedes the state question). (P1-2)
- **estimate_quarterly_taxes** no longer silently assumes California when the
  `state` parameter is omitted; it models federal only and asks for the state,
  so a non-California user is not shown California installment timing. (P2-1)
- **check_fbar_fatca** boundary wording now states the "exceeds $10,000" test
  explicitly and clarifies the exact-$10,000 case and intra-year peak. (P2-6)
- **estimate_irs_penalty** summary now notes the interest figure is approximate
  (compounds daily, rate resets quarterly), matching the structured detail. (P2-3)

### Added
- Every tool response carries a `server_version` field (matches `GET /version`)
  so any output is attributable to a specific release. (P0-3)
- `rollToBusinessDay` / `isBusinessDay` helpers in `lib/dates.ts` with a federal
  + DC holiday calendar; date-roll fixtures for 2026-2029.

### Release discipline (test harness)
- **Determinism harness** (`test/golden.test.ts`): every tool, 20x with identical
  inputs, must return byte-identical output, plus the review's boundary fixtures
  (FBAR $10k, Form 8938 abroad flip, Augusta 14/15, deadline roll). (Phase 1)
- **Schema-contract snapshot** (`test/schema.test.ts`): any tool input-schema
  change fails CI until the snapshot is updated, which is the cue to bump the
  version and add a changelog line. Closes the silent-enum-drift gap. (Phase 1)
- **Content-governance gate** (`test/governance.test.ts`): banned-string (em
  dash, "IRS-licensed", "IRS Enrolled Agent", "Certified Acceptance Agent",
  "MST", a "$0 - $0" salary) and required-string (disclaimer, approved credential
  line) checks over rendered tool/resource/prompt output. (Phase 2)
- This CHANGELOG.
