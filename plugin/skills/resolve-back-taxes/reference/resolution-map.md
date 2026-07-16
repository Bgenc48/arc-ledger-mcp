# IRS back-tax resolution map

Reference for the resolve-back-taxes Skill: the paths, the forms, and the
collection sequence. General information; the user's transcripts and facts
decide what actually fits.

## The sequence the IRS runs

1. **Filing compliance first.** No installment agreement, Offer in Compromise,
   or hardship status is approved while required returns are unfiled. The IRS
   generally looks for the last six years filed (IRS Policy Statement 5-133);
   older years are handled case by case.
2. **Assessment.** Filed (or substitute-for-return) balances are assessed;
   penalties and interest ride on top.
3. **Collection notices.** CP14 (first balance due), then CP501, CP503, CP504
   (intent to levy state refunds), then LT11 / Letter 1058 (final notice of
   intent to levy, with Collection Due Process hearing rights, IRC 6330).
   The notice-map reference in the respond-to-your-irs-notice Skill covers
   this ladder in detail.
4. **Enforcement.** Federal tax lien, bank levy, wage garnishment. Engaging
   before this stage is what keeps options open; releases exist afterward but
   take longer.

## The resolution paths

| Path | Fits when | Key forms |
| --- | --- | --- |
| Short-term payment plan | Balance clearable within about 180 days | Online or phone setup, no financial statement |
| Streamlined installment agreement | Balance at or under $50,000, payable within 72 months | Form 9465 or online application |
| Installment agreement with disclosure | Balance above $50,000, or payment below the streamlined floor | Form 433-F or 433-A collection information statement |
| Offer in Compromise (fit-check only) | Realistic ability to pay over the remaining collection period is below the balance | Form 656 plus Form 433-A(OIC)/433-B(OIC), application fee (waived for low-income certification) |
| Currently Not Collectible | Paying anything would prevent basic living expenses | Form 433-F showing income and necessary expenses |
| Penalty abatement | First-time (clean prior three years) or reasonable cause | Phone request or Form 843 |

Notes:

- The Offer in Compromise is a screen, never a promise. The IRS accepts a
  minority of offers and evaluates the full financial picture.
- Currently Not Collectible pauses collection; penalties and interest keep
  accruing, and the IRS revisits the status when income changes.
- Penalty abatement shrinks the balance itself; interest falls away only on
  the penalty portion that is removed.

## Representation forms

- **Form 8821 (Tax Information Authorization):** lets an Enrolled Agent pull
  IRS transcripts to see assessed balances, filed and missing years, and
  collection status. Read-only; no representation.
- **Form 2848 (Power of Attorney):** lets an Enrolled Agent represent the
  taxpayer before the IRS: speak to collection, negotiate agreements, attend
  interviews.

## The collection clock

The IRS generally has 10 years from assessment to collect (the Collection
Statute Expiration Date, IRC 6502). Some resolution steps pause or extend that
clock (an Offer in Compromise, bankruptcy, certain hearings), which is part of
why path choice is a facts-and-circumstances decision. The actual dates are on
the account transcripts.

## Employment-tax caution

Unpaid payroll taxes are a separate, harsher lane: the trust-fund portion
(withheld income tax plus the employee share of Social Security and Medicare)
can be assessed personally against responsible persons (Trust Fund Recovery
Penalty, IRC 6672), and a Form 4180 interview decides that exposure. Current
deposits come first; representation before the interview matters.
