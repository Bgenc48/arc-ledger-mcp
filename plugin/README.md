# Arc & Ledger IRS reference plugin

A Claude plugin for understanding IRS notices and general back-tax resolution
paths. It bundles:

1. `respond-to-your-irs-notice`, a deadline-first method for identifying a
   notice, explaining the usual response path, and using estimates carefully.
2. `resolve-back-taxes`, a sequence-first method that checks filing compliance
   before screening general payment, hardship, and penalty-abatement paths.
3. The read-only Arc & Ledger Tax Reference MCP endpoint at
   `https://mcp.arcandledger.com/directory/mcp`.

The plugin provides general information, not tax advice. It cannot file,
transmit, sign, certify, authorize payment, contact a tax authority, access an
IRS account, upload documents, book a consultation, or sell a service.

## Install

From Claude Code:

```text
/plugin marketplace add Bgenc48/arc-ledger-mcp
/plugin install arc-ledger-irs@arc-ledger
```

Approve the remote MCP connection when Claude asks. No Arc & Ledger account,
API key, or OAuth access is required.

## Safety and privacy

- Do not send Social Security numbers, ITINs, EINs, account numbers, bank
  details, passwords, or documents.
- The tools need only general categories, dates, and nonidentifying figures.
- Tool inputs and outputs are processed for the request and are not written to
  application logs or storage.
- Each result includes an official IRS or FinCEN source link and a
  general-information limitation.
- Estimates are labeled and must be checked against the user's records and
  current official guidance before action.
- No outcome, penalty relief, collection alternative, or deadline extension is
  guaranteed.

Privacy policy:
https://www.arcandledger.com/mcp/privacy/

Directory documentation:
https://www.arcandledger.com/mcp/directory/

## Supported directory tools

The Skills principally use:

- `decode_irs_notice`
- `estimate_irs_penalty`
- `check_resolution_options`
- `deadline_calendar`

The same MCP endpoint also provides reviewed tools for explaining named tax
documents, screening FBAR, FATCA, ITIN, Form 5472, and selected treaty issues,
and producing clearly labeled quarterly-tax, mileage, home-rental, and
rental-income estimates.

## Limits

The connector cannot read a user's mail, drive, tax software, IRS account, or
financial institution. It cannot inspect an actual notice or tax form. Ask the
user for only the printed notice code, notice date, and nonidentifying facts
needed by a tool. If the user has an appeal, petition, levy, or other statutory
deadline, tell them to verify the exact notice and obtain timely advice from a
qualified tax professional.
