/**
 * Tax-document profiles for explain_tax_document - the forms people RECEIVE
 * (W-2, the 1099 family, K-1s, 1042-S, 1098s, 1095s, SSA-1099) plus the two
 * forms people are asked to FILL OUT for a payer (W-9, W-8BEN). Static and
 * deterministic on purpose. Everything here is GENERAL information (Circular
 * 230 safe): no guaranteed outcomes, "Enrolled Agent" phrasing only, no em
 * dashes. IRS notices and letters (CP/LT codes) live in notices.ts, not here.
 *
 * Dollar figures in this file are TAX-LAW amounts (reporting thresholds,
 * statutory caps), never service prices; service prices come from pricing.ts.
 */

export type DocCategory =
  | 'employment'
  | 'self_employment_and_platforms'
  | 'investment'
  | 'retirement_and_benefits'
  | 'deduction_and_credit'
  | 'health'
  | 'business_owner_k1'
  | 'international'
  | 'request_to_complete';

export interface TaxDocProfile {
  /** Canonical lookup key: uppercase letters and digits only, e.g. '1099K'. */
  id: string;
  /** Display name, e.g. 'Form 1099-K'. */
  code: string;
  /** Extra normalized spellings that should resolve to this profile. */
  aliases?: string[];
  /** The document's plain-language subtitle. */
  title: string;
  category: DocCategory;
  /** Who sends it and roughly when it should arrive. */
  whoSendsIt: string;
  whatItIs: string;
  /** Where the numbers land on a return (or what to do with the paper). */
  whereItGoes: string;
  /** The boxes or fields that actually matter, as "Box N: meaning" lines. */
  keyBoxes: string[];
  /** What to verify before filing with it. */
  checkBeforeFiling: string[];
  /** What to do when it is wrong, duplicated, or never arrived. */
  ifWrongOrMissing: string;
  /** How the IRS uses its copy (matching exposure, or explicitly none). */
  howIrsUsesIt: string;
  /** Situations where professional help commonly matters (factual, optional). */
  professionalHelpWhen?: string;
}

export const TAX_DOCUMENTS: Record<string, TaxDocProfile> = {
  W2: {
    id: 'W2',
    code: 'Form W-2',
    aliases: ['WAGEANDTAXSTATEMENT'],
    title: 'Wage and Tax Statement (employee pay)',
    category: 'employment',
    whoSendsIt: 'Your employer, by January 31, with a copy filed with the Social Security Administration.',
    whatItIs:
      'The annual statement of what an employer paid you and what was withheld: wages, federal and state income tax withholding, Social Security and Medicare tax, and benefit items like 401(k) deferrals and health coverage.',
    whereItGoes:
      'Wages (Box 1) go on Form 1040 line 1a; federal withholding (Box 2) goes in the payments section (line 25a). State amounts go on the state return.',
    keyBoxes: [
      'Box 1: taxable wages for federal income tax (already reduced by pre-tax 401(k) and similar).',
      'Box 2: federal income tax withheld.',
      'Boxes 3-6: Social Security and Medicare wages and tax (often higher than Box 1; that is normal).',
      'Box 12: coded items, e.g. D = 401(k) deferrals, W = employer + employee HSA contributions, DD = cost of employer health coverage (informational only).',
      'Boxes 15-17: state wages and state withholding.',
    ],
    checkBeforeFiling: [
      'Your SSN and name are exactly right (a mismatch delays processing and refunds).',
      'Box 1 vs Boxes 3/5: a gap usually equals your pre-tax retirement or cafeteria-plan items, not an error.',
      'If you moved states mid-year, the state boxes split wages correctly between states.',
      'Every employer sent one; job-switchers commonly forget an early-year W-2.',
    ],
    ifWrongOrMissing:
      'Ask the employer for a corrected Form W-2c; do not just report different numbers. Missing by mid-February: check the employer portal, then the IRS can be asked to contact the employer, and Form 4852 (substitute W-2) is the last resort. Never file from a final pay stub if the W-2 may differ.',
    howIrsUsesIt:
      'The IRS and SSA receive their own copies and match them against your return. Leaving a W-2 off, even a small one, commonly surfaces as a CP2000 mismatch notice about a year later.',
  },

  W2G: {
    id: 'W2G',
    code: 'Form W-2G',
    aliases: ['GAMBLINGWINNINGS'],
    title: 'Certain Gambling Winnings',
    category: 'employment',
    whoSendsIt: 'The casino, sportsbook, lottery, or other payer, generally by January 31; issued at game-specific thresholds (for example $1,200 slot or bingo wins, $5,000 poker tournament net wins).',
    whatItIs:
      'A report of a gambling win large enough that the payer must tell the IRS, along with any federal tax withheld on it.',
    whereItGoes:
      'Winnings are reported as other income on Schedule 1; withholding (Box 4) goes in the Form 1040 payments section. ALL gambling winnings are taxable, including wins below the W-2G thresholds that never generate a form.',
    keyBoxes: [
      'Box 1: reportable winnings from that payer and session type.',
      'Box 4: federal income tax withheld (often 24% on large wins).',
      'Box 14-17: state winnings and withholding.',
    ],
    checkBeforeFiling: [
      'Collect every W-2G; frequent players often have several from one casino.',
      'Losses can offset winnings ONLY if you itemize deductions, only up to winnings, and (starting with 2026 tax years) subject to a further 90%-of-losses cap.',
      'Keep a session log and statements (win/loss statements alone are weak substantiation).',
    ],
    ifWrongOrMissing:
      'Ask the payer to correct it. A missing form does not remove the income: report actual winnings from your own records.',
    howIrsUsesIt:
      'Matched against your return like a 1099. Reporting net winnings (wins minus losses) as a single smaller number instead of gross winnings plus an itemized loss deduction is a classic mismatch trigger.',
  },

  '1099NEC': {
    id: '1099NEC',
    code: 'Form 1099-NEC',
    aliases: ['NEC', 'NONEMPLOYEECOMPENSATION'],
    title: 'Nonemployee Compensation (freelance and contractor pay)',
    category: 'self_employment_and_platforms',
    whoSendsIt: 'Each business client that paid you as a non-employee, by January 31. The reporting threshold is $600 for 2025 payments; it rises to $2,000 for payments made in 2026 (indexed after that).',
    whatItIs:
      'The freelancer form: it reports gross pay to an independent contractor. No tax was withheld (unless backup withholding applied), so income tax AND self-employment tax are still owed on the net profit.',
    whereItGoes:
      'Onto Schedule C with your business expenses deducted against it; the net profit flows to Form 1040 and to Schedule SE for the 15.3% self-employment tax (once net self-employment earnings reach $400).',
    keyBoxes: [
      'Box 1: nonemployee compensation (gross, before any platform fees you paid).',
      'Box 4: federal backup withholding, if any (24% when a payer lacked your correct TIN).',
    ],
    checkBeforeFiling: [
      'Box 1 is GROSS: deduct your real expenses (software, fees, contractors, home office, mileage) on Schedule C rather than reporting a netted-down number.',
      'Compare against your own invoices; issuers sometimes report the wrong year for a late-December payment.',
      'Income under the reporting threshold or with no form issued is still taxable; the form is not what makes it income.',
      'The same dollars sometimes also appear on a 1099-K from the payment platform: report the income once, not twice.',
    ],
    ifWrongOrMissing:
      'Ask the issuer for a corrected form. If they will not fix it, report the correct income from your records and keep the paper trail explaining the difference.',
    howIrsUsesIt:
      'Fully matched by the Automated Underreporter. Unreported 1099-NEC income is one of the most common CP2000 causes, and the IRS proposal will ignore your deductions until you respond with a Schedule C.',
    professionalHelpWhen:
      'First year of self-employment, quarterly estimated taxes, home-office and mileage substantiation, or an S-corp election question once profit is meaningful.',
  },

  '1099MISC': {
    id: '1099MISC',
    code: 'Form 1099-MISC',
    aliases: ['MISC', 'MISCELLANEOUSINFORMATION'],
    title: 'Miscellaneous Information (rents, royalties, prizes, other income)',
    category: 'self_employment_and_platforms',
    whoSendsIt: 'The business that paid you, generally by January 31 (mid-February for some box types). Same reporting thresholds as the 1099-NEC ($600 for 2025 payments, $2,000 for 2026).',
    whatItIs:
      'The catch-all information form for payments that are not contractor compensation: rent paid to you, royalties, prizes and award money, legal settlements, and other income.',
    whereItGoes:
      'Depends on the box: rents and royalties usually go on Schedule E, prizes and other income on Schedule 1 line 8, and amounts that are really business income belong on Schedule C.',
    keyBoxes: [
      'Box 1: rents (Schedule E for passive rentals).',
      'Box 2: royalties.',
      'Box 3: other income (prizes, awards, settlements; generally NOT self-employment taxed).',
      'Box 4: federal backup withholding, if any.',
    ],
    checkBeforeFiling: [
      'The box number controls the tax treatment; a payer putting contractor pay in Box 3 (or vice versa) changes self-employment tax and is worth correcting.',
      'Settlement income is nuanced: the taxable portion depends on what the settlement compensated for.',
    ],
    ifWrongOrMissing:
      'Ask the issuer for a corrected form, especially when the wrong box was used. Report real income from your records even when no form arrives.',
    howIrsUsesIt: 'Matched like the rest of the 1099 family; the IRS also matches the box type to where it expects the income on your return.',
  },

  '1099K': {
    id: '1099K',
    code: 'Form 1099-K',
    aliases: ['PAYMENTCARD', 'THIRDPARTYNETWORK'],
    title: 'Payment Card and Third Party Network Transactions',
    category: 'self_employment_and_platforms',
    whoSendsIt: 'Payment platforms and processors (Stripe, PayPal, Venmo, Amazon, Etsy, eBay, Uber, card processors), by January 31.',
    whatItIs:
      'A report of the GROSS payments processed for you. For 2025 and later years the federal threshold is back to over $20,000 AND more than 200 transactions for third-party platforms (card processors report with no minimum, several states use lower thresholds, and platforms may issue one voluntarily below the threshold).',
    whereItGoes:
      'Business sales go on Schedule C (or your business return) with fees, refunds, and cost of goods deducted. Personal item sales at a loss and mistaken personal transfers are not income, but a reported form should be reconciled on the return rather than ignored.',
    keyBoxes: [
      'Box 1a: gross amount processed (before platform fees, refunds, chargebacks, shipping, and sales tax collected by the platform).',
      'Box 1b: card-not-present portion (informational).',
      'Box 4: federal backup withholding, if any.',
      'Monthly boxes 5a-5l: how the gross splits across the year.',
    ],
    checkBeforeFiling: [
      'Gross does not equal profit: reconcile Box 1a to your own sales report, then deduct fees, refunds, and costs on the return.',
      'Personal (friends-and-family) transfers mislabeled as goods-and-services: ask the platform to correct, and document what the transfers were.',
      'Sales tax the platform collected and remitted should not end up in your income.',
      'The same revenue may also be on a 1099-NEC from a client: count it once.',
    ],
    ifWrongOrMissing:
      'Ask the platform for a correction (they rarely reissue quickly, so also document the true numbers and report the income accurately with an adjustment where appropriate). No form does not mean no income: report actual sales.',
    howIrsUsesIt:
      'Matched against your return at the GROSS level. Returns that show less gross revenue than the 1099-K total are flagged, which is why the reconciliation belongs on the return itself; the resulting letter is typically a CP2000.',
    professionalHelpWhen:
      'Mixed personal and business activity in one account, marketplace sales across states (sales-tax nexus), or a large gap between gross processed and true profit.',
  },

  '1099INT': {
    id: '1099INT',
    code: 'Form 1099-INT',
    aliases: ['INTERESTINCOME'],
    title: 'Interest Income',
    category: 'investment',
    whoSendsIt: 'Banks, credit unions, brokers, and the U.S. Treasury, by January 31, once they paid you at least $10 of interest.',
    whatItIs: 'A report of taxable and tax-exempt interest paid to you during the year.',
    whereItGoes:
      'Form 1040 line 2b (taxable) and 2a (tax-exempt). Over $1,500 of taxable interest also requires Schedule B listing each payer.',
    keyBoxes: [
      'Box 1: taxable interest.',
      'Box 2: early-withdrawal penalty (deductible as an adjustment; do not lose it).',
      'Box 3: U.S. Treasury interest (federally taxable, exempt from state income tax).',
      'Box 8: tax-exempt municipal interest (still reported, and can affect other calculations).',
    ],
    checkBeforeFiling: [
      'Interest under $10 (no form issued) is still taxable.',
      'Treasury interest in Box 3 should NOT be taxed on your state return; check the state subtraction.',
      'High-yield savings accounts opened mid-year are the most commonly forgotten form.',
    ],
    ifWrongOrMissing: 'Download it from the bank portal (paperless settings hide these) and ask the bank to correct real errors.',
    howIrsUsesIt: 'Matched to the dollar. Small forgotten interest forms are a very common CP2000 trigger precisely because people ignore them.',
  },

  '1099DIV': {
    id: '1099DIV',
    code: 'Form 1099-DIV',
    aliases: ['DIVIDENDSANDDISTRIBUTIONS'],
    title: 'Dividends and Distributions',
    category: 'investment',
    whoSendsIt: 'Brokers and fund companies, by January 31 (often mid-February as part of a consolidated statement).',
    whatItIs: 'A report of dividends and fund distributions: ordinary vs qualified dividends, capital-gain distributions, and any foreign tax paid.',
    whereItGoes:
      'Form 1040 lines 3a/3b; capital-gain distributions (Box 2a) flow to Schedule D (or directly to the 1040 when nothing else is on Schedule D). Over $1,500 of ordinary dividends requires Schedule B.',
    keyBoxes: [
      'Box 1a: total ordinary dividends.',
      'Box 1b: the qualified portion (taxed at the lower capital-gains rates).',
      'Box 2a: capital-gain distributions from funds (taxable even if reinvested).',
      'Box 7: foreign tax paid (usually claimable as a credit on Form 1116 or directly).',
    ],
    checkBeforeFiling: [
      'Reinvested dividends are still taxable in the year paid.',
      'Brokers frequently issue CORRECTED consolidated 1099s in February or March; filing very early risks amending later.',
      'Do not miss the foreign tax credit in Box 7.',
    ],
    ifWrongOrMissing: 'Check the broker portal for the final corrected version before filing; ask the broker to fix true errors.',
    howIrsUsesIt: 'Matched by the Automated Underreporter, including the split between ordinary and qualified amounts.',
  },

  '1099B': {
    id: '1099B',
    code: 'Form 1099-B',
    aliases: ['BROKERPROCEEDS', 'CONSOLIDATED1099'],
    title: 'Proceeds from Broker Transactions (stock and asset sales)',
    category: 'investment',
    whoSendsIt: 'Your broker, typically by mid-February inside a consolidated 1099 statement (which bundles 1099-B, 1099-DIV, and 1099-INT).',
    whatItIs:
      'A trade-by-trade report of sale proceeds, and (for covered positions) the cost basis and holding period, for stocks, ETFs, options, and other securities you sold.',
    whereItGoes: 'Form 8949 and Schedule D, split by short-term vs long-term and by whether basis was reported to the IRS.',
    keyBoxes: [
      'Proceeds (Box 1d) and cost basis (Box 1e) per lot.',
      'Holding period: short-term vs long-term sections (different tax rates).',
      'The "basis reported to IRS" vs "noncovered" distinction (noncovered lots need YOUR basis records).',
      'Box 1g: wash-sale loss disallowed.',
    ],
    checkBeforeFiling: [
      'Missing or zero basis on noncovered lots: supply the true basis or the whole proceeds look like gain.',
      'Employer stock (RSU/ESPP) basis is often understated on the 1099-B because the W-2 income portion is not in the broker basis; correct it with an adjustment.',
      'Wait for the CORRECTED consolidated statement; brokers commonly revise in March.',
    ],
    ifWrongOrMissing: 'Ask the broker to correct; for basis problems you can adjust on Form 8949 with the right adjustment code while keeping records.',
    howIrsUsesIt:
      'Proceeds are matched at the gross level: a return that omits a 1099-B commonly draws a CP2000 proposing tax on the FULL proceeds as if basis were zero. That inflated number is usually reducible by responding with the real basis.',
    professionalHelpWhen: 'Equity compensation sales (RSU/ESPP/ISO), wash sales across accounts, or a CP2000 already proposing tax on gross proceeds.',
  },

  '1099DA': {
    id: '1099DA',
    code: 'Form 1099-DA',
    aliases: ['DIGITALASSETS', 'CRYPTO1099'],
    title: 'Digital Asset Proceeds from Broker Transactions (crypto)',
    category: 'investment',
    whoSendsIt: 'U.S. digital-asset brokers and exchanges (Coinbase, Kraken, etc.), starting with 2025 transactions; arrives with the January/February statements.',
    whatItIs:
      'The new crypto equivalent of the 1099-B: gross proceeds from digital-asset sales and exchanges made through a broker. Cost-basis reporting by brokers phases in for assets acquired in 2026 and later, so early forms may show proceeds only.',
    whereItGoes: 'Form 8949 and Schedule D like securities; income-type crypto (staking rewards, payments received) is ordinary income reported separately.',
    keyBoxes: [
      'Gross proceeds per disposition (sales AND crypto-to-crypto trades are dispositions).',
      'Cost basis where the broker has it (self-custody transfers usually break broker basis tracking).',
      'The digital-asset question on Form 1040 must be answered consistently with the form.',
    ],
    checkBeforeFiling: [
      'Reconcile the broker proceeds against your own transaction history or crypto tax software; transfers between your own wallets are NOT sales.',
      'Missing basis after wallet transfers: build the basis history yourself; do not let proceeds stand as pure gain.',
      'Staking, airdrops, and payment income are ordinary income at receipt AND create basis for a later sale.',
    ],
    ifWrongOrMissing: 'Exchanges correct slowly: keep your own complete transaction export and report accurate figures with documentation.',
    howIrsUsesIt:
      'This form exists to bring digital assets into the same Automated Underreporter matching as stocks. Unreported exchange activity now surfaces as a mismatch (the CP2000 profile already lists 1099-DA as a matched form).',
    professionalHelpWhen: 'Multi-exchange or DeFi activity, lost basis records, or prior unreported years that need cleanup before matching catches up.',
  },

  '1099R': {
    id: '1099R',
    code: 'Form 1099-R',
    aliases: ['RETIREMENTDISTRIBUTIONS'],
    title: 'Distributions from Pensions, IRAs, Retirement Plans, Annuities',
    category: 'retirement_and_benefits',
    whoSendsIt: 'The plan custodian or insurer, by January 31, for any distribution of $10 or more (including rollovers and Roth conversions).',
    whatItIs:
      'A report of money that left a retirement plan or annuity. Receiving one does NOT automatically mean the amount is taxable: the Box 7 code and what you did with the money control that.',
    whereItGoes:
      'Form 1040 lines 4a/4b (IRAs) or 5a/5b (pensions); early distributions may also need Form 5329 for the 10% additional tax or its exceptions.',
    keyBoxes: [
      'Box 1: gross distribution.',
      'Box 2a: taxable amount (sometimes blank with "taxable amount not determined" checked, which means YOU compute it).',
      'Box 4: federal withholding.',
      'Box 7: the distribution code that drives everything, e.g. 7 = normal, 1 = early (10% additional tax unless an exception applies), G = direct rollover (generally not taxable), code combinations for Roth.',
    ],
    checkBeforeFiling: [
      'A direct rollover (code G) should show as NOT taxable; an indirect rollover completed within 60 days needs to be reported as rolled over or it becomes taxable.',
      'Roth conversions are taxable now on purpose; make sure that was intended.',
      'Nondeductible IRA basis (Form 8606 history) reduces the taxable portion; do not tax the same dollars twice.',
    ],
    ifWrongOrMissing: 'Ask the custodian for a correction, especially a wrong Box 7 code; those are common and consequential.',
    howIrsUsesIt: 'Matched against your return. Omitted 1099-Rs (especially rollovers people assume are invisible) are a frequent CP2000 subject; the response is usually showing the rollover, not paying.',
    professionalHelpWhen: 'Early distributions with possible penalty exceptions, backdoor Roth reporting, or inherited-account distribution rules.',
  },

  '1099G': {
    id: '1099G',
    code: 'Form 1099-G',
    aliases: ['GOVERNMENTPAYMENTS', 'UNEMPLOYMENTCOMPENSATION'],
    title: 'Certain Government Payments (unemployment, state refunds)',
    category: 'retirement_and_benefits',
    whoSendsIt: 'A federal, state, or local agency, by January 31 (state unemployment agencies usually post it online).',
    whatItIs: 'A report of government payments to you: unemployment compensation, prior-year state tax refunds, and some grants.',
    whereItGoes:
      'Unemployment (Box 1) is taxable federal income on Schedule 1. A state refund (Box 2) is taxable ONLY if you itemized in the prior year and got a tax benefit from deducting state taxes; standard-deduction filers generally owe nothing on it.',
    keyBoxes: [
      'Box 1: unemployment compensation.',
      'Box 2: state or local refund for a prior year.',
      'Box 4: federal withholding you elected on unemployment.',
    ],
    checkBeforeFiling: [
      'Standard deduction last year: the Box 2 state refund is usually NOT taxable; do not pay tax on it reflexively.',
      'Unemployment withholding is optional and often skipped, which creates surprise balances; check Box 4.',
    ],
    ifWrongOrMissing:
      'A 1099-G for unemployment you never claimed is a classic identity-theft signal: report it to the issuing state agency and request a corrected form; do not report income you never received.',
    howIrsUsesIt: 'Matched. Unreported unemployment is a routine CP2000 line item.',
  },

  '1099C': {
    id: '1099C',
    code: 'Form 1099-C',
    aliases: ['CANCELLATIONOFDEBT', 'DEBTFORGIVENESS', 'COD'],
    title: 'Cancellation of Debt',
    category: 'retirement_and_benefits',
    whoSendsIt: 'A lender or card issuer that canceled $600 or more of your debt, by January 31.',
    whatItIs:
      'A report that a creditor wrote off debt you owed. Canceled debt is GENERALLY taxable income, but major exclusions exist: bankruptcy discharge, insolvency (debts exceeded assets when canceled), certain student-loan discharges, and some mortgage situations.',
    whereItGoes:
      'Taxable portions go on Schedule 1 as other income; exclusions are claimed on Form 982, which must be attached to use them.',
    keyBoxes: [
      'Box 2: amount of debt discharged.',
      'Box 6: identifiable-event code (why it was issued).',
      'Box 7: fair market value of any property involved (foreclosures).',
    ],
    checkBeforeFiling: [
      'Run the insolvency worksheet BEFORE paying tax on it: if you were insolvent when the debt was canceled, some or all of it is excludable on Form 982.',
      'Disputed or still-being-collected debt reported as canceled is worth challenging with the issuer.',
      'Foreclosures and short sales can produce both a sale (1099-A/S side) and cancellation income; they are computed separately.',
    ],
    ifWrongOrMissing: 'Ask the creditor to correct or rescind it if the debt was not actually discharged, and keep the dispute records.',
    howIrsUsesIt: 'Matched; omitting it typically produces a CP2000 taxing the full Box 2 amount with no exclusion analysis. Responding with Form 982 support is how the exclusion gets applied.',
    professionalHelpWhen: 'Insolvency worksheets, foreclosure-year returns, and anything where the exclusion could remove most of the tax.',
  },

  '1099S': {
    id: '1099S',
    code: 'Form 1099-S',
    aliases: ['REALESTATEPROCEEDS'],
    title: 'Proceeds from Real Estate Transactions',
    category: 'investment',
    whoSendsIt: 'The closing agent, title company, or attorney, usually at closing or by January 31 after the sale year.',
    whatItIs: 'A report of GROSS proceeds from a real-estate sale (home, land, rental, inherited property).',
    whereItGoes:
      'A main-home sale may be fully excludable (up to $250,000 of gain, $500,000 married filing jointly, when the ownership and use tests are met), but when a 1099-S was issued the sale is generally reported even if the exclusion wipes out the gain. Rentals and other property go on Form 8949/Schedule D, with depreciation recapture for rentals on Form 4797.',
    keyBoxes: [
      'Box 2: gross proceeds (not your gain; basis and selling costs come off).',
      'Box 4: checked if you received property or services (barter).',
    ],
    checkBeforeFiling: [
      'Compute gain from basis (purchase price + improvements + costs), never from proceeds alone.',
      'Main home: verify the 2-of-5-year ownership and use tests before assuming the exclusion.',
      'Inherited property generally gets a stepped-up basis to date-of-death value; the taxable gain is often small.',
    ],
    ifWrongOrMissing: 'The closing agent can correct it; keep the closing statement (settlement statement) since it carries the real numbers.',
    howIrsUsesIt: 'Matched at the gross-proceeds level: an unreported 1099-S invites a CP2000 treating the ENTIRE sale price as gain. Reporting the sale with basis and exclusion prevents that.',
    professionalHelpWhen: 'Rental sales with depreciation recapture, partial-exclusion moves (job or health), inherited or gifted basis questions.',
  },

  '1099SA': {
    id: '1099SA',
    code: 'Form 1099-SA',
    aliases: ['HSADISTRIBUTIONS'],
    title: 'Distributions from an HSA or MSA',
    category: 'health',
    whoSendsIt: 'The HSA custodian, by January 31, for any year you spent or withdrew HSA money.',
    whatItIs:
      'A report of money that came OUT of a health savings account. Distributions are tax-free when they reimbursed qualified medical expenses; otherwise they are taxable and usually carry a 20% additional tax.',
    whereItGoes: 'Form 8889 (required in any year with HSA activity), which computes the taxable portion, then flows to the 1040.',
    keyBoxes: [
      'Box 1: gross distribution.',
      'Box 3: distribution code (1 = normal, 5 = prohibited transaction, etc.).',
    ],
    checkBeforeFiling: [
      'File Form 8889 even when everything was qualified; skipping it makes the IRS treat the full distribution as taxable.',
      'Keep receipts for the medical expenses matched to the distributions (they are not attached, but they are the substantiation).',
      'Contributions have their own form (5498-SA, arriving in May); do not confuse the two.',
    ],
    ifWrongOrMissing: 'Custodian corrections are straightforward; check the online account for the form if it never mailed.',
    howIrsUsesIt: 'Matched to Form 8889. A 1099-SA with no 8889 on the return reliably generates an IRS letter proposing tax plus the 20% addition.',
  },

  '1099Q': {
    id: '1099Q',
    code: 'Form 1099-Q',
    aliases: ['529DISTRIBUTION', 'QUALIFIEDEDUCATIONPROGRAMS'],
    title: 'Payments from Qualified Education Programs (529 plans)',
    category: 'deduction_and_credit',
    whoSendsIt: 'The 529 or Coverdell plan administrator, by January 31, to whoever received the distribution (owner or beneficiary).',
    whatItIs:
      'A report of a 529/Coverdell withdrawal, split between your contributions (basis) and earnings. Nothing is taxable when total distributions do not exceed adjusted qualified education expenses for the same year.',
    whereItGoes:
      'Nowhere, when fully qualified (keep the expense records). Nonqualified portions: the EARNINGS part is taxable to the recipient plus generally a 10% additional tax.',
    keyBoxes: [
      'Box 1: gross distribution.',
      'Box 2: earnings portion (the only part that can be taxed).',
      'Box 3: basis (your contributions, never taxed again).',
    ],
    checkBeforeFiling: [
      'Match distributions to expenses in the SAME calendar year (a December bill paid with a January withdrawal is a classic mismatch).',
      'Room and board counts for at least half-time students, up to the school cost-of-attendance figures.',
      'Coordinate with education credits: the same tuition dollars cannot support both the American Opportunity Credit and tax-free 529 treatment.',
    ],
    ifWrongOrMissing: 'Plan administrators correct rarely; the cure is usually documentation showing qualified expenses covering the distribution.',
    howIrsUsesIt: 'The IRS sees the distribution but NOT your expenses, so mismatched years or credit double-dipping draw automated letters that a worksheet and receipts usually resolve.',
  },

  SSA1099: {
    id: 'SSA1099',
    code: 'Form SSA-1099',
    aliases: ['SOCIALSECURITYBENEFITSTATEMENT', 'RRB1099'],
    title: 'Social Security Benefit Statement',
    category: 'retirement_and_benefits',
    whoSendsIt: 'The Social Security Administration, by January 31 (the railroad equivalent is RRB-1099). Replacements download instantly from your my Social Security account.',
    whatItIs:
      'The annual statement of Social Security benefits paid to you, benefits repaid, and any voluntary federal withholding.',
    whereItGoes:
      'Form 1040 line 6a (gross) and 6b (taxable part). Between 0% and 85% of benefits are taxable depending on your combined income; the worksheet, not a flat rule, decides.',
    keyBoxes: [
      'Box 3: benefits paid.',
      'Box 4: benefits you repaid (nets against Box 3).',
      'Box 5: net benefits (the number the worksheet uses).',
      'Box 6: voluntary federal withholding.',
    ],
    checkBeforeFiling: [
      'Medicare premiums deducted from benefits are itemizable medical expenses; they are shown on the statement.',
      'A lump-sum award covering prior years has a special election that can lower the tax; do not just tax it all in one year.',
    ],
    ifWrongOrMissing: 'Download a replacement from ssa.gov rather than waiting on the mail.',
    howIrsUsesIt: 'Matched; the taxable-portion math is a common source of both IRS and self-inflicted errors.',
  },

  '5498': {
    id: '5498',
    code: 'Form 5498',
    aliases: ['IRACONTRIBUTIONINFORMATION', '5498SA', '5498ESA'],
    title: 'IRA Contribution Information (informational, arrives late)',
    category: 'retirement_and_benefits',
    whoSendsIt: 'The IRA custodian, by May 31 (after the filing deadline on purpose, because contributions for a year are allowed until the April due date). The 5498-SA (HSA) and 5498-ESA versions are parallel.',
    whatItIs:
      'An informational record of IRA contributions, rollovers received, conversions, and the year-end fair market value. It is NOT needed to file, and nothing on it goes directly on the return.',
    whereItGoes:
      'Keep it with your records. Deductible contributions were already claimed on the return; nondeductible ones should be tracked on Form 8606 so they are not taxed again at withdrawal.',
    keyBoxes: [
      'Box 1: traditional IRA contributions.',
      'Box 2: rollover contributions (should mirror the 1099-R code G from the sending plan).',
      'Box 3: Roth conversions.',
      'Box 5: year-end fair market value (used for RMD math later).',
      'Box 10: Roth IRA contributions.',
    ],
    checkBeforeFiling: [
      'Do not wait for it to file; it arrives in May by design.',
      'Verify it matches what you actually contributed and claimed (custodian coding errors between Roth and traditional happen).',
      'Backdoor Roth users: the 5498 pair (contribution + conversion) plus Form 8606 is the paper trail.',
    ],
    ifWrongOrMissing: 'Custodians correct these routinely; the year-end FMV and contribution type are worth fixing because of later RMD and basis math.',
    howIrsUsesIt: 'The IRS uses it to police contribution limits and rollover consistency; a 1099-R rollover with no matching 5498 receipt can prompt a letter.',
  },

  '1098': {
    id: '1098',
    code: 'Form 1098',
    aliases: ['MORTGAGEINTERESTSTATEMENT'],
    title: 'Mortgage Interest Statement',
    category: 'deduction_and_credit',
    whoSendsIt: 'Your mortgage servicer, by January 31, when you paid $600 or more of interest.',
    whatItIs: 'A report of home mortgage interest you paid, plus points, mortgage insurance where applicable, and the property details.',
    whereItGoes:
      'Schedule A, and only if you itemize; with today\'s standard deduction many homeowners get no additional benefit. Interest on acquisition debt is generally deductible on up to $750,000 of loan principal for post-2017 loans.',
    keyBoxes: [
      'Box 1: mortgage interest received by the lender.',
      'Box 5: mortgage insurance premiums (deductibility has changed over the years; check current law).',
      'Box 6: points paid on purchase (often deductible in full in the purchase year).',
      'Box 10: property taxes paid through escrow appear here or on the escrow statement (subject to the SALT cap on Schedule A).',
    ],
    checkBeforeFiling: [
      'A refinance mid-year means TWO 1098s; count both.',
      'Compare itemizing vs the standard deduction before assuming the mortgage helps.',
      'On a rental property, the interest belongs on Schedule E, not Schedule A.',
    ],
    ifWrongOrMissing: 'Servicers post these online; corrections go through the servicer.',
    howIrsUsesIt: 'The IRS sees the lender copy and checks large deducted amounts against it (deduction overstatement, not omission, is the risk direction here).',
  },

  '1098T': {
    id: '1098T',
    code: 'Form 1098-T',
    aliases: ['TUITIONSTATEMENT'],
    title: 'Tuition Statement (education credits)',
    category: 'deduction_and_credit',
    whoSendsIt: 'The college or university, by January 31, usually via the student portal.',
    whatItIs:
      'A report of qualified tuition and related expenses the school received, plus scholarships and grants. It is the starting point for the American Opportunity Credit (up to $2,500 per student) and the Lifetime Learning Credit, computed on Form 8863.',
    whereItGoes: 'Form 8863 for the credits; the form itself is not attached, but keep it and the bursar statement.',
    keyBoxes: [
      'Box 1: payments received for qualified tuition and fees (the credit math starts here, adjusted to what YOU actually paid in the year).',
      'Box 5: scholarships and grants (reduce qualified expenses, and excess scholarship over tuition can be taxable income to the student).',
      'Half-time and graduate-student checkboxes (affect which credit applies).',
    ],
    checkBeforeFiling: [
      'Box 1 rarely equals what you can claim: reconcile with the bursar account (spring tuition billed in December is the classic timing trap).',
      'Books and required course materials count for the American Opportunity Credit even though they are not on the form.',
      'Decide WHOSE return claims the student and the credit (dependency rules), and coordinate with any 529 distributions (no double-dipping on the same dollars).',
    ],
    ifWrongOrMissing: 'Schools correct through the registrar/bursar; the bursar transaction history is the real substantiation either way.',
    howIrsUsesIt: 'The IRS matches claimed education credits against 1098-T filings; credits without a matching form draw letters and refund holds.',
  },

  '1098E': {
    id: '1098E',
    code: 'Form 1098-E',
    aliases: ['STUDENTLOANINTEREST'],
    title: 'Student Loan Interest Statement',
    category: 'deduction_and_credit',
    whoSendsIt: 'Each student-loan servicer, by January 31, when you paid $600+ of interest (smaller amounts still count; pull them from the servicer portal).',
    whatItIs: 'A report of student-loan interest you paid during the year.',
    whereItGoes:
      'Schedule 1 as an above-the-line adjustment: up to $2,500 of interest, no itemizing required, phased out at higher incomes and unavailable on married-filing-separately returns.',
    keyBoxes: ['Box 1: interest received by the lender (across all your loans with that servicer).'],
    checkBeforeFiling: [
      'Multiple servicers (or a mid-year transfer) means multiple forms; add them up, then apply the $2,500 cap.',
      'Only the person legally obligated on the loan claims it (a parent paying a child\'s loan generally cannot, unless the parent is the borrower).',
    ],
    ifWrongOrMissing: 'Servicer portals show the annual interest even when no form was required.',
    howIrsUsesIt: 'Matched against the deduction claimed; modest exposure, but easy to substantiate.',
  },

  '1095A': {
    id: '1095A',
    code: 'Form 1095-A',
    aliases: ['HEALTHINSURANCEMARKETPLACESTATEMENT', 'MARKETPLACESTATEMENT'],
    title: 'Health Insurance Marketplace Statement (MUST be reconciled)',
    category: 'health',
    whoSendsIt: 'The federal or state health insurance marketplace (healthcare.gov or your state exchange), by January 31; also downloadable from your marketplace account.',
    whatItIs:
      'The statement of your marketplace coverage: monthly premiums, the second-lowest-cost silver plan (SLCSP) benchmark, and the advance premium tax credit (APTC) paid to your insurer on your behalf.',
    whereItGoes:
      'Form 8962, where the advance credit is reconciled against the premium tax credit your actual income supports. This is NOT optional: a return with APTC and no Form 8962 gets rejected or held, and the IRS letter asking for it (typically a Letter 12C) freezes any refund until answered.',
    keyBoxes: [
      'Column A: monthly premiums.',
      'Column B: the SLCSP benchmark (if blank or zero for covered months, look it up with the marketplace tool; the credit cannot compute without it).',
      'Column C: advance credit paid monthly to the insurer.',
    ],
    checkBeforeFiling: [
      'File Form 8962 whenever Column C has any amount, even if you owe some credit back.',
      'Income above the estimate you gave the marketplace means repaying part of the APTC; below it usually means extra credit.',
      'Household changes (marriage, a dependent moving off the policy) create shared-policy allocations that need care.',
    ],
    ifWrongOrMissing:
      'Corrections come from the marketplace, not the IRS: call the exchange for a corrected 1095-A (wrong months and wrong SLCSP are common). Do not file with numbers you know are wrong.',
    howIrsUsesIt:
      'The marketplace reports the same data to the IRS, which blocks or holds returns that fail to reconcile. This form is one of the most common causes of frozen refunds and 12C letters.',
    professionalHelpWhen: 'Shared policies across returns, mid-year marriage, self-employed health insurance deduction interacting with the credit (a circular calculation).',
  },

  '1095B': {
    id: '1095B',
    code: 'Form 1095-B / 1095-C',
    aliases: ['1095C', '1095BC', 'HEALTHCOVERAGE'],
    title: 'Health Coverage information statements (keep for records)',
    category: 'health',
    whoSendsIt: 'Insurers send the 1095-B; larger employers send the 1095-C; generally by early March.',
    whatItIs:
      'Proof-of-coverage statements showing which months you (and dependents) had health coverage. Since the federal individual mandate penalty dropped to zero, they usually change nothing on a federal return.',
    whereItGoes:
      'Nowhere on the federal return: keep them with your records. A few states (California, New Jersey, Massachusetts, Rhode Island, and DC) still have their own coverage mandates where the information matters.',
    keyBoxes: ['Covered individuals and the months-of-coverage checkboxes.'],
    checkBeforeFiling: [
      'Do NOT wait on a 1095-B/C to file a federal return.',
      'If you ALSO had marketplace coverage, the form that matters is the 1095-A, which must be reconciled (see that form).',
    ],
    ifWrongOrMissing: 'Rarely worth chasing for federal purposes; request corrections from the insurer or employer if a state mandate applies.',
    howIrsUsesIt: 'Informational reporting by insurers and employers; no line-by-line matching against your federal return.',
  },

  K11065: {
    id: 'K11065',
    code: 'Schedule K-1 (Form 1065)',
    aliases: ['K1', 'PARTNERSHIPK1', 'K1PARTNERSHIP', '1065K1'],
    title: 'Partner\'s Share of Income from a Partnership or multi-member LLC',
    category: 'business_owner_k1',
    whoSendsIt:
      'The partnership or multi-member LLC, due with its Form 1065 by March 15 (extensions push it to September 15, so K-1s legitimately arrive late; extend your own return rather than filing without one).',
    whatItIs:
      'Your share of the entity\'s income, deductions, and credits for the year, taxable to you whether or not any cash was distributed. (S corporation and trust versions exist: Schedule K-1 from Form 1120-S or Form 1041; the boxes differ, so ask about the one you actually hold.)',
    whereItGoes:
      'Schedule E page 2, with pieces flowing to Schedule SE (self-employment tax for general partners and active LLC members), Schedule D, Form 8995 (QBI), and state returns for each state the partnership works in.',
    keyBoxes: [
      'Box 1-3: ordinary business, rental, and other income types (each treated differently).',
      'Box 14: self-employment earnings (drives SE tax for active members).',
      'Box 19: distributions (cash you took; NOT the taxable number, and usually smaller or larger than Box 1).',
      'Box 20 / Schedule K-3: QBI details and foreign items.',
    ],
    checkBeforeFiling: [
      'Taxable income (Box 1) vs cash received (Box 19) differ by design; owing tax on profit you left in the business is normal.',
      'Losses may be limited by your basis, at-risk rules, and passive-activity rules before they help you.',
      'Multi-state partnerships can create filing duties in other states (or composite/withholding credits to claim).',
      'Received a K-3 too? It carries the foreign detail some filers need.',
    ],
    ifWrongOrMissing:
      'Only the partnership can correct or amend a K-1. Late K-1: file an extension for your own return; filing on estimates and amending later is the fallback, not the plan.',
    howIrsUsesIt: 'The IRS receives every K-1 and matches your return against your share. Omitted K-1 income is matched just like a 1099.',
    professionalHelpWhen: 'Basis and loss limitations, states, foreign partners or K-3 items, or your first year as a partner.',
  },

  K11120S: {
    id: 'K11120S',
    code: 'Schedule K-1 (Form 1120-S)',
    aliases: ['1120SK1', 'SCORPK1', 'K1SCORP', 'K11120'],
    title: 'Shareholder\'s Share of Income from an S corporation',
    category: 'business_owner_k1',
    whoSendsIt: 'The S corporation, due with its Form 1120-S by March 15 (September 15 on extension).',
    whatItIs:
      'Your share of the S corporation\'s income and deductions, taxable to you whether or not distributed. Unlike a partnership K-1, S-corp K-1 income is NOT self-employment income; owner-officers are paid a W-2 salary instead.',
    whereItGoes: 'Schedule E page 2, with capital items to Schedule D and QBI to Form 8995; your W-2 from the same company reports the salary part.',
    keyBoxes: [
      'Box 1: ordinary business income (no SE tax, which is the point of the structure).',
      'Box 16 (code D): distributions, tax-free up to your stock basis.',
      'Box 17 / K-3: other items and foreign detail.',
    ],
    checkBeforeFiling: [
      'Distributions above your stock basis become capital gain; basis tracking is YOUR job (Form 7203 covers it), not the corporation\'s.',
      'Working shareholders should also have a W-2 from the company (reasonable compensation); a K-1 with big income and no W-2 salary is an audit-profile issue.',
      'Losses need basis to be usable; loans you personally made to the company count differently than loans you merely guaranteed.',
    ],
    ifWrongOrMissing: 'Corrections require the corporation to amend; extend your return rather than filing without a late K-1.',
    howIrsUsesIt: 'Matched to your return; Form 7203 basis reporting is increasingly checked alongside it.',
    professionalHelpWhen: 'Basis (Form 7203), reasonable-compensation questions, or losses the software will not let through.',
  },

  K11041: {
    id: 'K11041',
    code: 'Schedule K-1 (Form 1041)',
    aliases: ['1041K1', 'TRUSTK1', 'ESTATEK1', 'BENEFICIARYK1'],
    title: 'Beneficiary\'s Share of Income from an Estate or Trust',
    category: 'business_owner_k1',
    whoSendsIt: 'The estate or trust fiduciary, due with Form 1041 by April 15 for calendar-year filers (September 30 on extension; estates on a fiscal year can send K-1s at unexpected times of year).',
    whatItIs:
      'Your share of income the estate or trust DISTRIBUTED (or was required to distribute) to you: interest, dividends, capital gains, rental income. Inheriting property itself is generally not taxable income; this form is about the income the estate earned and passed out.',
    whereItGoes: 'Schedule E page 2 and the matching schedules (B for interest/dividends, D for gains), keeping the character each item had inside the trust.',
    keyBoxes: [
      'Boxes 1-4a: interest, dividends, and capital gains passed through.',
      'Box 5-8: rental and business income shares.',
      'Box 11: final-year deductions (usable on your return when the estate closes).',
    ],
    checkBeforeFiling: [
      'The principal you inherited is not income; only the earnings on it flow through here.',
      'A fiscal-year estate\'s K-1 lands on YOUR return for the year the fiscal year ENDS, which surprises people.',
      'Final-year K-1s can carry deductions and losses worth using.',
    ],
    ifWrongOrMissing: 'Only the fiduciary can fix it; executors juggling a first estate return commonly need to amend.',
    howIrsUsesIt: 'Matched like other K-1s.',
    professionalHelpWhen: 'You are the executor or trustee (the 1041 side), or the K-1 carries unusual items in a final year.',
  },

  '1042S': {
    id: '1042S',
    code: 'Form 1042-S',
    aliases: ['1042', 'FOREIGNPERSONUSINCOME'],
    title: 'Foreign Person\'s U.S. Source Income Subject to Withholding',
    category: 'international',
    whoSendsIt:
      'The U.S. payer or withholding agent (a university, broker, company, or platform), by March 15. (Form 1042 itself is the payer\'s own return; individuals receive the 1042-S.)',
    whatItIs:
      'The information return for U.S.-source income paid to a NON-U.S. person: scholarships, dividends, royalties, services, interest. It shows the income type as a numeric code, the tax withheld (often 30%, or a lower treaty rate), and the exemption or treaty article applied.',
    whereItGoes:
      'For a nonresident filing Form 1040-NR, the income and the withholding credit come from this form; over-withholding is refunded through that return. U.S. residents for tax purposes who received one (common after a residency-status change) still report the income on Form 1040 and claim the withholding.',
    keyBoxes: [
      'Box 1: income code (16 = scholarship, 06 = dividends, 12 = royalties, etc.).',
      'Box 2: gross income paid.',
      'Boxes 3a/4a: exemption codes (e.g. a treaty exemption).',
      'Boxes 7-10: federal tax withheld.',
      'Box 13e/13f: your TIN and country as the payer has them.',
    ],
    checkBeforeFiling: [
      'Wrong withholding rate is common when a W-8BEN or Form 8233 was missing or expired: compare the treaty rate you were entitled to against what was withheld.',
      'Several 1042-S forms from one payer (one per income code) is normal; use them all.',
      'The check_treaty_withholding tool on this server explains the default and US-Turkey treaty rates and which certificate form applies.',
    ],
    ifWrongOrMissing:
      'Ask the withholding agent for a corrected 1042-S (they file corrections with the IRS too). Refunds of over-withholding generally require filing a 1040-NR with the form attached, and a TIN/ITIN.',
    howIrsUsesIt: 'The IRS matches claimed withholding credits against the payer\'s filed 1042-S copies; unmatched credits hold up refunds.',
    professionalHelpWhen:
      'Claiming a refund of over-withheld tax on a 1040-NR, residency-status changes mid-year, or treaty positions that need an ITIN (an Enrolled Agent prepares the W-7 and represents the applicant).',
  },

  W9: {
    id: 'W9',
    code: 'Form W-9',
    aliases: ['REQUESTFORTIN', 'W9REQUEST'],
    title: 'Request for Taxpayer Identification Number (someone asked YOU to fill it)',
    category: 'request_to_complete',
    whoSendsIt:
      'Not the IRS: a client, bank, platform, or landlord who will pay you sends it so they can report those payments (on a 1099) under your correct taxpayer ID. It is completed and returned to THEM, never filed with the IRS.',
    whatItIs:
      'Your certification of your name, taxpayer identification number (SSN or EIN), federal tax classification, and that you are a U.S. person (citizen, resident, or U.S. entity) not subject to backup withholding.',
    whereItGoes: 'Back to the requester; keep a copy. Expect a 1099-NEC/MISC/K from them the following January.',
    keyBoxes: [
      'Line 1: your legal name exactly as on your tax return (a business name goes on line 2).',
      'Line 3: tax classification (individual/sole proprietor, LLC and its tax status, corporation).',
      'Part I: SSN or EIN (sole proprietors may use either; using an EIN keeps your SSN out of circulation).',
    ],
    checkBeforeFiling: [
      'Refusing or providing a mismatched TIN triggers 24% backup withholding on your payments.',
      'A single-member LLC generally enters the OWNER\'s name on line 1 and may use the owner\'s SSN or the LLC\'s EIN per the form rules.',
      'NON-U.S. persons should NOT sign a W-9: the right form is a W-8BEN (or W-8BEN-E for entities).',
      'Only send it to parties who genuinely pay you; W-9 requests are a phishing vector for SSNs.',
    ],
    ifWrongOrMissing: 'Send the requester an updated W-9 whenever your name, entity type, or TIN changes; that stops mismatch (B-notice) letters.',
    howIrsUsesIt: 'Indirectly: it feeds the 1099s that ARE matched. A wrong TIN chain leads to IRS CP2100 "B notices" to the payer and backup withholding for you.',
  },

  W8BEN: {
    id: 'W8BEN',
    code: 'Form W-8BEN / W-8BEN-E',
    aliases: ['W8', 'W8BENE', 'CERTIFICATEOFFOREIGNSTATUS'],
    title: 'Certificate of Foreign Status (for non-U.S. persons asked by a U.S. payer)',
    category: 'request_to_complete',
    whoSendsIt:
      'A U.S. payer, broker, bank, or platform asks a NON-U.S. person to complete it (W-8BEN for individuals, W-8BEN-E for companies). Like the W-9, it goes back to the payer, never to the IRS.',
    whatItIs:
      'Your certification that you are a foreign person, which sets the default 30% U.S. withholding on U.S.-source passive income and lets you claim a lower TAX TREATY rate where one exists (a treaty claim generally requires a U.S. TIN: an SSN or ITIN).',
    whereItGoes: 'To the payer, who applies the withholding rate and later issues you a Form 1042-S showing what was withheld.',
    keyBoxes: [
      'Part I: identity, country of residence, foreign tax ID (and U.S. TIN when claiming treaty benefits).',
      'Part II: the treaty country, article, and rate you are claiming.',
      'Expiration: it lasts through the end of the third calendar year after signing unless facts change.',
    ],
    checkBeforeFiling: [
      'U.S. persons (including green-card holders and residents by day count) must use a W-9 instead; the wrong form causes wrong withholding for both sides.',
      'For U.S. WORK income as an individual claiming a treaty exemption, Form 8233 (not W-8BEN) is often the right certificate.',
      'An expired W-8BEN silently reverts you to 30% withholding; recheck every three years.',
      'The check_treaty_withholding tool on this server shows the default and US-Turkey treaty rates by income type.',
    ],
    ifWrongOrMissing: 'Submit a fresh, correct form to the payer; over-withheld amounts are recovered later via a 1040-NR refund claim with the 1042-S.',
    howIrsUsesIt: 'The payer relies on it to set withholding and reports the results on Form 1042-S, which the IRS matches against refund claims.',
    professionalHelpWhen: 'Treaty positions, getting the ITIN a treaty claim needs, or entity classification on the W-8BEN-E.',
  },
};

/**
 * Normalize a user-typed document name: uppercase, drop spaces/dots/dashes/
 * slashes/parentheses/underscores, then strip the words FORM / SCHEDULE / IRS
 * anywhere they appear. "Form 1099-K" -> "1099K"; "Schedule K-1 (Form 1065)"
 * -> "K11065"; "w2" -> "W2".
 */
export function normalizeDocCode(raw: string): string {
  const flat = raw.toUpperCase().trim().replace(/[\s._/()\\-]/g, '');
  return flat.replace(/FORM|SCHEDULE|IRS/g, '');
}

/** Resolve a normalized document name (including aliases) to a profile, or null. */
export function lookupTaxDocument(raw: string): TaxDocProfile | null {
  const norm = normalizeDocCode(raw);
  if (!norm) return null;
  const direct = TAX_DOCUMENTS[norm];
  if (direct) return direct;
  for (const profile of Object.values(TAX_DOCUMENTS)) {
    if (profile.aliases?.some((a) => normalizeDocCode(a) === norm)) return profile;
  }
  return null;
}

/** Every display code we cover (for the unknown-document fallback and docs/tests). */
export const COVERED_DOCUMENTS = Object.values(TAX_DOCUMENTS).map((d) => d.code);
