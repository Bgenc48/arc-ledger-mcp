# Changelog

Notable changes to the Arc & Ledger Tax Tools MCP server. Bump `SERVER_VERSION`
in `wrangler.toml` and `version` in `package.json` together; `GET /version` and
every tool response's `server_version` expose the running release.

## 0.6.0

### Changed
- **estimate_reasonable_comp**: for zero, negative, or very low net profit,
  returns guidance to speak with an Enrolled Agent rather than a
  percentage-of-profit figure. Reasonable compensation is a facts-and-
  circumstances test based on the services performed, not a share of book profit.
- **deadline_calendar**: due and extension dates now observe the business-day
  rule (IRC 7503), rolling past weekends and federal/DC holidays (including
  Emancipation Day). For example, a tax-year-2025 Form 1120-S resolves to
  March 16, 2026.
- **compare_formation_states**: clearer recommendation rationale, kept separate
  from each state's descriptive profile; adds a Delaware C-corporation note when
  the caller is raising venture capital.
- **estimate_quarterly_taxes**: models a state's estimated-tax timing only when a
  state is provided (no default assumption).
- **check_fbar_fatca**: clarified the "exceeds $10,000" threshold wording.
- **estimate_irs_penalty**: notes that the interest figure is approximate.

### Added
- `server_version` on every tool response (matches `GET /version`).
- Business-day helpers (`rollToBusinessDay` / `isBusinessDay`) in `lib/dates.ts`.
- Test suite additions: a determinism check (identical inputs produce identical
  output), an input-schema contract snapshot, and content checks over rendered
  output.
