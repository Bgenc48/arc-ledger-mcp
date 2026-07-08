/**
 * Versioned tax-rate adapter. Re-exports the website's single source of truth
 * for tax constants (src/config/taxConstants2026.ts, TAX_YEAR = 2026, verified
 * against Rev. Proc. 2025-32 / Notice 2026-10 / OBBBA) and adds the pieces the
 * MCP tools need that do NOT exist anywhere in the site codebase yet.
 *
 * Rule mirrors pricing: never hardcode a rate that already lives in the site
 * constants - import it. The additions below are genuinely new (safe-harbor
 * multipliers, the CA S-corp rate as a named constant, the full Form 8938
 * matrix, CA installment weighting) and are documented with their statutory
 * source so a reviewer can verify them.
 */
export * from '../../src/config/taxConstants2026';

// ─── Estimated-tax safe harbor (IRC §6654) - NOT in the site codebase ────────
/** Pay at least this share of CURRENT-year tax to avoid the underpayment penalty. */
export const SAFE_HARBOR_CURRENT_YEAR = 0.9; // 90%
/** ...or this share of PRIOR-year tax (the "prior-year" safe harbor). */
export const SAFE_HARBOR_PRIOR_YEAR = 1.0; // 100%
/** ...raised to this share when prior-year AGI was over the high-income threshold. */
export const SAFE_HARBOR_PRIOR_YEAR_HIGH_AGI = 1.1; // 110%
/** Prior-year AGI above this triggers the 110% figure ($75,000 if MFS). */
export const SAFE_HARBOR_HIGH_AGI_THRESHOLD = 150_000;
export const SAFE_HARBOR_HIGH_AGI_THRESHOLD_MFS = 75_000;

// ─── California specifics - NOT named constants in the site codebase ─────────
/** CA S-corp franchise tax rate on net income, floored at CA_FRANCHISE_TAX_MINIMUM. */
export const CA_SCORP_TAX_RATE = 0.015; // 1.5% (R&TC §23802)
/**
 * California estimated-tax installment weighting (FTB): 30/40/0/30 of the annual
 * required amount for Q1/Q2/Q3/Q4. Distinct from the even federal 25/25/25/25.
 */
export const CA_INSTALLMENT_WEIGHTS = [0.3, 0.4, 0.0, 0.3] as const;
/** CA high-income taxpayers (AGI >= $1M) must use 90% current-year, no prior-year option. */
export const CA_HIGH_INCOME_NO_PRIOR_SAFE_HARBOR = 1_000_000;

// ─── Form 8938 (FATCA) reporting thresholds - only single-year-end is in site ─
// Full matrix from IRS Form 8938 instructions (fixed since 2011, not inflation
// adjusted). Keys: living-in-US vs living-abroad; each has a year-end ("last day
// of the year") threshold and a higher "any time during the year" threshold.
export const FORM_8938_THRESHOLDS = {
  livingInUS: {
    single_or_mfs: { yearEnd: 50_000, anyTime: 75_000 },
    mfj: { yearEnd: 100_000, anyTime: 150_000 },
  },
  livingAbroad: {
    single_or_mfs: { yearEnd: 200_000, anyTime: 300_000 },
    mfj: { yearEnd: 400_000, anyTime: 600_000 },
  },
} as const;

// ─── Reasonable-compensation modeling defaults (compare_llc_scorp) ───────────
/**
 * A neutral default split used ONLY to illustrate the S-corp salary/distribution
 * mechanic when the caller gives no salary estimate. It is a modeling assumption,
 * not tax advice, and the tool states the reasonable-compensation caveat.
 */
export const SCORP_DEFAULT_SALARY_SPLIT = 0.5;

// ─── Residential rental depreciation + passive-loss (estimate_rental_income) ─
/** Residential real property is depreciated straight-line over 27.5 years (IRC §168(c)). */
export const RESIDENTIAL_DEPRECIATION_YEARS = 27.5;
/**
 * §469(i) special allowance: an active participant may deduct up to $25,000 of
 * rental losses against other income, phased out $1 for every $2 of MAGI over
 * $100,000, fully gone at $150,000. A real-estate professional (§469(c)(7)) is
 * not limited. Losses that cannot be used carry forward.
 */
export const PASSIVE_LOSS_SPECIAL_ALLOWANCE = 25_000;
export const PASSIVE_LOSS_PHASEOUT_START = 100_000;
export const PASSIVE_LOSS_PHASEOUT_END = 150_000;
/** A stay of 14 days or fewer with more personal than rental use is tax-free (§280A(g), "Augusta rule"). */
export const SHORT_TERM_PERSONAL_USE_EXEMPT_DAYS = 14;

// ─── Founder / nonresident filing deadlines (deadline_calendar) ──────────────
// Statutory deadlines for a calendar-year filer. Month/day pairs; the tool
// resolves them against the requested filing year. Sources noted per line.
export const FILING_DEADLINES = {
  /** Foreign-owned SMLLC / C-corp: Form 1120 + 5472, 15th day of the 4th month. */
  form1120_5472: { month: 4, day: 15, extendedMonth: 10, extendedDay: 15 },
  /** Nonresident individual Form 1040-NR: June 15 when no US wages subject to withholding, else April 15. */
  form1040nr_noUsWages: { month: 6, day: 15, extendedMonth: 12, extendedDay: 15 },
  form1040nr_usWages: { month: 4, day: 15, extendedMonth: 10, extendedDay: 15 },
  /** Domestic multi-member LLC / partnership Form 1065: 15th day of the 3rd month. */
  form1065: { month: 3, day: 15, extendedMonth: 9, extendedDay: 15 },
  /** S-corp Form 1120-S: 15th day of the 3rd month. */
  form1120s: { month: 3, day: 15, extendedMonth: 9, extendedDay: 15 },
  /** FBAR (FinCEN 114): April 15 with an AUTOMATIC extension to October 15. */
  fbar: { month: 4, day: 15, extendedMonth: 10, extendedDay: 15, automaticExtension: true },
} as const;

/** Statutory information-return penalties (not service prices). Sources per line. */
export const INFO_RETURN_PENALTIES = {
  form5472: 25_000, // IRC §6038A(d), per form, per year (foreign-owned US entity)
  form5471: 10_000, // IRC §6038(b), per form, per year (foreign corp ownership)
  form8865: 10_000, // IRC §6038(b), per form (foreign partnership)
  boiReport: 591, // FinCEN CTA civil penalty, inflation-adjusted per day of violation
} as const;

// ─── IRS underpayment interest rate (estimate_irs_penalty) ───────────────────
/**
 * Annual interest rate on unpaid individual balances = federal short-term rate
 * + 3% (IRC §6621), compounded daily, RESET QUARTERLY. This is the recent
 * standing figure; the tool states it is an approximation and that the real
 * rate changes each quarter. Failure-to-file/pay rates come from the site
 * constants (FAILURE_TO_FILE_RATE etc.).
 */
export const IRS_UNDERPAYMENT_ANNUAL_RATE = 0.07; // ~7% (in effect since Q2 2025); IRC §6621, set quarterly - verify the current quarter
/** Failure-to-file is reduced by the failure-to-pay amount in any month both apply (IRC §6651(c)). */
export const FTF_REDUCED_BY_FTP_RATE = 0.005;
/** Minimum failure-to-file penalty when a return is >60 days late: lesser of this or 100% of the tax (IRC §6651(a), 2026). */
export const FTF_MINIMUM_OVER_60_DAYS = 525;

// ─── US formation-state comparison (compare_formation_states) ────────────────
// Structured from the site's formationPages.ts cost tables (WY/NM/DE/CA), for
// a non-US founder choosing where to open a US LLC. Government fees only; our
// service fee is separate. Fees change - the tool says to verify.
export const FORMATION_STATES = {
  wyoming: {
    label: 'Wyoming',
    filingFee: 100,
    annualReport: 60,
    franchiseTax: 0,
    stateIncomeTax: false,
    approvalDays: '3-5 business days',
    strengths: ['No state income or franchise tax', 'Strong privacy (no member disclosure)', 'Low, flat annual cost'],
    bestFor: 'Most non-US founders of a simple online business - the default low-cost, private choice.',
  },
  newMexico: {
    label: 'New Mexico',
    filingFee: 50,
    annualReport: 0,
    franchiseTax: 0,
    stateIncomeTax: false,
    approvalDays: '1-3 business days',
    strengths: ['No annual report at all', 'Strongest privacy (no member or manager disclosure)', 'Lowest ongoing cost'],
    bestFor: 'Founders who want the lowest maintenance and maximum anonymity, with no annual filing.',
  },
  delaware: {
    label: 'Delaware',
    filingFee: 90,
    annualReport: 0, // a DE LLC files NO annual report (only DE corporations do); it pays one flat $300/yr tax below
    franchiseTax: 300, // flat $300/yr LLC tax, due June 1
    stateIncomeTax: false,
    approvalDays: '1-2 weeks (expedite available)',
    strengths: ['Preferred by VCs and for C-corps taking investment', 'Mature business-court system (Court of Chancery)'],
    bestFor: 'Startups raising venture capital or planning to convert to a C-corp; overkill for a simple LLC.',
  },
  california: {
    label: 'California',
    filingFee: 70,
    annualReport: 20,
    franchiseTax: 800, // $800 minimum franchise tax every year
    stateIncomeTax: true,
    approvalDays: '5-10 business days',
    strengths: ['Required only if you actually do business or live in California'],
    bestFor: 'Only when you physically operate in California - the $800/yr minimum franchise tax makes it the costliest choice otherwise.',
  },
} as const;

// ─── Sales-tax economic nexus (check_sales_tax_nexus) ────────────────────────
// Post-Wayfair economic-nexus thresholds. Most states use $100k in sales OR 200
// transactions (current or prior year); notable states differ. Thresholds and
// the transaction test change often - the tool says to verify per state.
export const SALES_TAX_NEXUS_DEFAULT = { salesUsd: 100_000, transactions: 200, transactionsApply: true } as const;
export const SALES_TAX_NEXUS_OVERRIDES: Record<string, { salesUsd: number; transactions: number | null; both?: boolean }> = {
  CA: { salesUsd: 500_000, transactions: null }, // sales only, no transaction count
  TX: { salesUsd: 500_000, transactions: null },
  NY: { salesUsd: 500_000, transactions: 100, both: true }, // BOTH sales AND transactions
};
/** States with NO statewide sales tax (no economic-nexus sales-tax exposure). */
export const NO_SALES_TAX_STATES = ['DE', 'MT', 'NH', 'OR', 'AK'] as const;
/** The 50 states + DC. A well-formed 2-letter code not in this set is rejected, not answered. */
export const US_STATE_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
]);

// ─── Federal marginal brackets (planning-tool assumption) ────────────────────
/**
 * The 2026 ordinary-income marginal RATES (OBBBA made the TCJA schedule
 * permanent). Used ONLY as a caller-selectable assumption in the tax-planning
 * calculators (Augusta rule, accountable plan) to translate a deduction into an
 * approximate tax saving. The bracket THRESHOLDS are not modeled - the tool
 * asks the caller for their marginal bracket (or defaults) and says so.
 */
export const FEDERAL_MARGINAL_RATES = [0.10, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37] as const;
/** Default marginal rate when the caller gives none: the 22% bracket, a common small-business owner rate. */
export const DEFAULT_MARGINAL_RATE = 0.22;

// ─── Reasonable compensation (estimate_reasonable_comp) ──────────────────────
/**
 * Reasonable compensation has NO statutory formula (IRC 162; it is a
 * facts-and-circumstances test: training, duties, time devoted, comparable
 * wages, what a replacement would cost). These are practitioner STARTING RANGES
 * expressed as a share of net profit, keyed on how much of the profit is driven
 * by the owner's personal services vs. capital/other workers. They are a first
 * estimate only; a defensible figure needs a comparable-wage study, which the
 * tool states and offers.
 */
export const REASONABLE_COMP_SHARES = {
  primarily_owner_services: { low: 0.40, high: 0.60, label: "Almost all profit comes from your own billable work (consulting, agency, solo professional)" },
  mixed: { low: 0.28, high: 0.45, label: "A mix of your work plus employees, contractors, or systems" },
  capital_or_product: { low: 0.18, high: 0.32, label: "Profit is driven mostly by product, capital, or a team - not your personal labor" },
} as const;

// ─── Augusta rule / IRC 280A(g) (estimate_augusta_rule) ──────────────────────
/** A dwelling rented for THIS many days or fewer is excluded from income (IRC 280A(g)). Day 15 makes ALL of it taxable. */
export const AUGUSTA_MAX_DAYS = 14;

// ─── Home-office simplified method cap (estimate_accountable_plan) ───────────
/** The simplified home-office method allows up to this many square feet (x $5/sq ft = $1,500 max). */
export const HOME_OFFICE_SIMPLIFIED_MAX_SQFT = 300;
