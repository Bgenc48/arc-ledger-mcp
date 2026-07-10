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

### Added
- Every tool response carries a `server_version` field (matches `GET /version`)
  so any output is attributable to a specific release. (P0-3)
- `rollToBusinessDay` / `isBusinessDay` helpers in `lib/dates.ts` with a federal
  + DC holiday calendar; date-roll fixtures for 2026-2029.
