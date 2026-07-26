---
name: resolve-back-taxes
description: >-
  Use when someone owes federal tax, has unfiled returns, cannot pay a tax
  balance, or asks about general IRS payment, hardship, compromise, or penalty
  relief paths. Uses read-only tools to check filing compliance, label
  estimates, and screen options without promising an outcome.
---

# Understand general back-tax resolution paths

Help the user organize a federal tax-balance problem in the order it is
normally addressed: urgent notices, filing compliance, verified balances, and
then possible collection alternatives. Be calm and factual. Do not imply that
you represent the user or can secure a result.

Use only these tools from the Arc & Ledger Tax Reference connector:

- `decode_irs_notice` when a notice code is known;
- `estimate_irs_penalty` for a labeled rough estimate;
- `check_resolution_options` for a general fit screen; and
- `deadline_calendar` for a directly relevant filing date.

If the connector is unavailable, say so. Do not invent figures, eligibility, or
deadlines.

## Safety rules

- Provide general information, not tax advice. Preserve each tool's limitation
  and official source URL.
- Never guarantee an installment agreement, Offer in Compromise, Currently Not
  Collectible status, penalty abatement, collection pause, levy release, or any
  other IRS action.
- Never request or process an SSN, ITIN, EIN, account number, bank detail,
  password, authentication code, transcript, tax return, or other document.
- Do not file, submit, sign, transmit, authorize payment, contact the IRS, or
  complete a tax or collection form.
- Do not recommend a specific payment amount beyond what a tool clearly labels
  as an estimate.
- Do not use fear, urgency marketing, or a commercial handoff.
- Match the user's language. Do not use an em dash.

## Method

### 1. Check for an urgent notice first

Ask whether the user has a final levy notice, wage or bank levy, garnishment,
Tax Court notice, appeal notice, or another printed response deadline. If a
notice code and printed date are available, use `decode_irs_notice` and lead
with the tool's window and verification warning.

For an already-passed date, active collection action, statutory notice of
deficiency, or appeal right, recommend prompt review of the actual notice by a
qualified tax professional.

### 2. Establish filing compliance

Ask only whether all required federal returns are filed. Do not collect the
returns. Explain that the IRS generally requires current filing compliance
before granting a collection alternative, while the exact required years and
returns depend on the account and facts.

If returns are missing, identify filing compliance as the first workstream.
Use `deadline_calendar` only when a supported current filing date is directly
relevant. Do not infer income or prepare missing returns.

### 3. Separate assessed tax from estimates

Ask for a rough total balance and, if the user wants a penalty illustration,
rough months late and whether the return was filed. Call
`estimate_irs_penalty`. Explain that:

- the output is not an account payoff;
- interest changes over time;
- the IRS transcript and current payoff amount control; and
- abatement eligibility requires separate review.

### 4. Screen general alternatives

Call `check_resolution_options` with the rough balance, filing-compliance
status, and broad ability-to-pay category. Present only the paths returned by
the tool. Typical categories may include:

- short-term payment;
- installment agreement;
- an agreement requiring financial disclosure;
- Offer in Compromise as a fit screen only;
- Currently Not Collectible as a hardship screen; and
- first-time or reasonable-cause penalty relief.

For each path, state what general facts and forms the tool identifies. Never
call a screen an approval or a recommendation based on a complete financial
analysis.

### 5. Give a noncommercial next-step checklist

Close with:

- verify filed and missing years from the IRS account or transcripts;
- verify assessed balances and current payoff figures;
- preserve and review every active notice and deadline;
- compare the tool's paths with current IRS eligibility rules;
- keep current filings and payments from falling behind; and
- obtain professional review before choosing a path when collection action,
  hardship, business payroll taxes, bankruptcy, or a large balance is involved.

Do not add a firm, booking, payment, upload, or service link.

## Reference

Use `reference/resolution-map.md` only as orientation. Current official IRS
guidance and the user's account facts control.
