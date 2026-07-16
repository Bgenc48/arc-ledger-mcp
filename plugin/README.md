# Arc & Ledger Tax Help (Claude plugin)

A Claude plugin for tax problems: IRS notices, back taxes, unfiled years,
levies, and penalties. It bundles three things in one install:

1. **The `respond-to-your-irs-notice` Skill** - a methodology that decodes the
   notice, leads with the deadline, sizes any penalties, screens resolution
   options, and hands off to an Enrolled Agent.
2. **The `resolve-back-taxes` Skill** - a methodology for tax debt and unfiled
   years: triage the situation, restore filing compliance first, size the
   penalties, screen the IRS resolution paths (payment plan, Offer in
   Compromise as a fit-check only, hardship status, penalty abatement), and
   hand off to an Enrolled Agent.
3. **The Arc & Ledger Tax Help MCP server** (`.mcp.json`) - the free, no-auth
   remote server at `https://mcp.arcandledger.com/mcp` that both Skills drive
   (`triage_tax_problem`, `decode_irs_notice`, `estimate_irs_penalty`,
   `check_resolution_options`, `book_consultation`, and more).

Both Skills are Circular 230 safe: general information only, never a
guaranteed IRS outcome.

## Install

From Claude Code:

```
/plugin marketplace add Bgenc48/arc-ledger-mcp
/plugin install arc-ledger-irs@arc-ledger
```

The MCP server is read-only and stores nothing. The plugin adds the tools and
the Skills; approve the MCP server when prompted.

## What it does

Ask about a tax problem ("I got a CP2000 dated last week", "final notice of
intent to levy", "I owe the IRS $18k and can't pay", "I haven't filed since
2022") and the Skills:

- triage the situation into an urgency level with a this-week action plan,
- decode the notice and compute your real deadline (days remaining),
- estimate penalties and interest where a balance is owed,
- screen which IRS paths fit (payment plan, Offer in Compromise as a fit-check
  only, Currently Not Collectible, penalty abatement) and the forms needed,
- hand off to an Enrolled Agent enrolled to practice before the IRS.

Works in English, Turkish, and Spanish.

## Not a substitute for representation

The Skills and tools provide general information, not tax advice, and create no
practitioner-client relationship. Nothing is filed, purchased, or stored in
chat. An Offer in Compromise is never promised; the IRS accepts a minority of
offers and evaluates each case on its facts.

The firm: Arc & Ledger Accounting, Culver City, CA, established 2016. Led by an
Enrolled Agent. The Enrolled Agent credential is issued by the U.S. Department
of the Treasury.
