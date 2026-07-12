/**
 * Centralized 2026 tax constants.
 *
 * Update this ONE file when IRS publishes new rates or inflation adjustments.
 * All calculators and guide articles import from here.
 *
 * Verified June 2026 against:
 * - IRS Rev. Proc. 2025-32 (2026 inflation adjustments incl. OBBBA amendments)
 * - IRS Notice 2026-10 (2026 standard mileage rates)
 * - One Big Beautiful Bill Act (OBBBA), signed July 4, 2025
 * - IRS standard mileage rates: https://www.irs.gov/tax-professionals/standard-mileage-rates
 * - California FTB, EDD for state-specific rates
 */

export const TAX_YEAR = 2026;

// ─── Self-Employment ──────────────────────────────────────────
export const SE_TAX_RATE = 0.153;           // 15.3% (Social Security 12.4% + Medicare 2.9%)
export const SE_TAX_MULTIPLIER = 0.9235;    // 92.35% of net earnings subject to SE tax
export const SE_INCOME_THRESHOLD = 400;     // Minimum net SE earnings to trigger filing
export const SOCIAL_SECURITY_WAGE_BASE = 184_500; // 2026 SS wage base (12.4% applies up to this)
export const MEDICARE_SURTAX_RATE = 0.009;  // 0.9% Additional Medicare Tax
export const MEDICARE_SURTAX_SINGLE = 200_000;
export const MEDICARE_SURTAX_MFJ = 250_000;

// ─── Standard Deduction (2026, Rev. Proc. 2025-32) ────────────
export const STANDARD_DEDUCTION_SINGLE = 16_100;
export const STANDARD_DEDUCTION_MFJ = 32_200;

// ─── Federal Tax Brackets - 2026 (Single) ────────────────────
export const TAX_BRACKETS_SINGLE = [
  { limit: 12_400, rate: 0.10 },
  { limit: 50_400, rate: 0.12 },
  { limit: 105_700, rate: 0.22 },
  { limit: 201_775, rate: 0.24 },
  { limit: 256_225, rate: 0.32 },
  { limit: 640_600, rate: 0.35 },
  { limit: Infinity, rate: 0.37 },
] as const;

// ─── Federal Tax Brackets - 2026 (Married Filing Jointly) ─────
export const TAX_BRACKETS_MFJ = [
  { limit: 24_800, rate: 0.10 },
  { limit: 100_800, rate: 0.12 },
  { limit: 211_400, rate: 0.22 },
  { limit: 403_550, rate: 0.24 },
  { limit: 512_450, rate: 0.32 },
  { limit: 768_700, rate: 0.35 },
  { limit: Infinity, rate: 0.37 },
] as const;

// ─── Capital Gains (Long-Term) - 2026 ─────────────────────────
export const LTCG_RATES = {
  single: [
    { limit: 49_450, rate: 0.00 },
    { limit: 545_500, rate: 0.15 },
    { limit: Infinity, rate: 0.20 },
  ],
  mfj: [
    { limit: 98_900, rate: 0.00 },
    { limit: 613_700, rate: 0.15 },
    { limit: Infinity, rate: 0.20 },
  ],
} as const;

// ─── Standard Mileage Rate (2026, IRS Notice 2026-10) ────────
export const STANDARD_MILEAGE_RATE = 0.725; // 72.5 cents per mile (business, 2026)
export const MEDICAL_MILEAGE_RATE = 0.205;  // 20.5 cents per mile (medical/moving, 2026)
export const CHARITABLE_MILEAGE_RATE = 0.14; // 14 cents per mile (statutory)

// ─── Home Office (Simplified Method) ─────────────────────────
export const HOME_OFFICE_SIMPLIFIED_RATE = 5; // $5 per sq ft
export const HOME_OFFICE_SIMPLIFIED_MAX_SQFT = 300;

// ─── OBBBA Provisions ─────────────────────────────────────────
// No Tax on Tips
export const OBBBA_TIP_DEDUCTION_MAX = 25_000;
export const OBBBA_TIP_PHASEOUT_SINGLE = 150_000;
export const OBBBA_TIP_PHASEOUT_MFJ = 300_000;

// No Tax on Overtime
export const OBBBA_OVERTIME_MAX_SINGLE = 12_500;
export const OBBBA_OVERTIME_MAX_MFJ = 25_000;
export const OBBBA_OVERTIME_PHASEOUT_SINGLE = 150_000;
export const OBBBA_OVERTIME_PHASEOUT_MFJ = 300_000;

// Senior Deduction (age 65+)
export const OBBBA_SENIOR_DEDUCTION_MAX = 6_000;
export const OBBBA_SENIOR_PHASEOUT_SINGLE = 75_000;
export const OBBBA_SENIOR_PHASEOUT_MFJ = 150_000;

// Car Loan Interest Deduction
export const OBBBA_CAR_INTEREST_MAX = 10_000;
export const OBBBA_CAR_INTEREST_PHASEOUT_SINGLE = 100_000;
export const OBBBA_CAR_INTEREST_PHASEOUT_MFJ = 200_000;

// SALT Cap (2026: $40,000 base +1%/yr -> $40,400; phasedown begins $505,000 MAGI)
export const SALT_CAP = 40_400;
export const SALT_CAP_MFS = 20_200; // Married Filing Separately
export const SALT_CAP_PHASEDOWN_THRESHOLD = 505_000;

// QBI §199A
export const QBI_DEDUCTION_RATE = 0.20; // 20%
export const QBI_MINIMUM = 400; // Starting 2026

// Non-Itemizer Charitable
export const CHARITABLE_NON_ITEMIZER_SINGLE = 1_000;
export const CHARITABLE_NON_ITEMIZER_MFJ = 2_000;

// Estate Tax
export const ESTATE_EXEMPTION = 15_000_000; // Per person (2026)

// ─── Quarterly Estimated Tax ──────────────────────────────────
export const QUARTERLY_THRESHOLD_FEDERAL = 1_000;
export const QUARTERLY_THRESHOLD_CA = 500;
export const QUARTERLY_DUE_DATES = ['April 15', 'June 15', 'September 15', 'January 15'] as const;

// ─── 1099 Reporting ───────────────────────────────────────────
export const REPORTING_THRESHOLD_1099_NEC = 2_000; // Raised from $600 by OBBBA (payments after 12/31/2025)
export const REPORTING_THRESHOLD_1099_K = 20_000;  // OBBBA reverted to $20,000 AND 200 transactions
export const REPORTING_TRANSACTIONS_1099_K = 200;

// ─── IRS Penalties ────────────────────────────────────────────
export const FAILURE_TO_FILE_RATE = 0.05;     // 5% per month
export const FAILURE_TO_FILE_MAX = 0.25;      // 25% max
export const FAILURE_TO_PAY_RATE = 0.005;     // 0.5% per month
export const FAILURE_TO_PAY_MAX = 0.25;       // 25% max
export const IRS_INTEREST_RATE_ADDITION = 3;  // Federal short-term rate + 3%
export const SERIOUSLY_DELINQUENT_THRESHOLD = 66_000; // IRC §7345 (2026), passport denial

// ─── FDAP / International ─────────────────────────────────────
export const FDAP_DEFAULT_WITHHOLDING = 0.30;  // 30%
export const SCHOLARSHIP_WITHHOLDING = 0.14;   // 14%
export const FIRPTA_INDIVIDUAL = 0.15;         // 15%
export const FIRPTA_CORPORATE = 0.21;          // 21%
export const W8BEN_VALIDITY_YEARS = 3;
export const FORM_1042_PENALTY_PER_FORM = 340; // Returns required to be filed in 2026 (TY 2025)
export const FORM_1042_INTENTIONAL_PENALTY = 680;

// US-Turkey Treaty Rates
export const TURKEY_TREATY_DIVIDEND_INDIVIDUAL = 0.20; // 20%
export const TURKEY_TREATY_DIVIDEND_CORPORATE = 0.15;  // 15% (10%+ ownership)
export const TURKEY_TREATY_INTEREST = 0.15;            // 15%
export const TURKEY_TREATY_ROYALTY = 0.10;             // 10%

// ─── FBAR / FATCA ─────────────────────────────────────────────
export const FBAR_THRESHOLD = 10_000;
// Penalty ceilings are inflation-adjusted (31 CFR 1010.821); the 2025 amounts
// remain in effect for 2026 (OMB M-26-11). Statutory bases: $10,000 / $100,000.
export const FBAR_NONWILLFUL_PENALTY = 16_536;  // per report (per Bittner), current max
export const FBAR_WILLFUL_PENALTY_MIN = 165_353; // or 50% of balance, whichever is greater
export const FBAR_WILLFUL_PENALTY_PERCENT = 0.50; // 50% of balance
export const FATCA_THRESHOLD_SINGLE_YEAREND = 50_000;

// ─── California ───────────────────────────────────────────────
export const CA_FRANCHISE_TAX_MINIMUM = 800;
export const CA_LLC_FEE_SCHEDULE = [
  { min: 0, max: 249_999, fee: 0 },
  { min: 250_000, max: 499_999, fee: 900 },
  { min: 500_000, max: 999_999, fee: 2_500 },
  { min: 1_000_000, max: 4_999_999, fee: 6_000 },
  { min: 5_000_000, max: Infinity, fee: 11_790 },
] as const;

// CA Payroll Tax (2026)
export const CA_UI_RATE_NEW_EMPLOYER = 0.034; // 3.4%
export const CA_UI_WAGE_LIMIT = 7_000;
export const CA_ETT_RATE = 0.001; // 0.1%
export const CA_ETT_WAGE_LIMIT = 7_000;
export const CA_SDI_RATE = 0.013; // 1.3% (2026, no wage cap since 2024)

// ─── Los Angeles ──────────────────────────────────────────────
export const LA_GROSS_RECEIPTS_PROFESSIONAL = 4.25; // per $1,000
export const LA_GROSS_RECEIPTS_RETAIL = 1.27;
export const LA_GROSS_RECEIPTS_WHOLESALE = 1.01;
export const LA_SMALL_BUSINESS_EXEMPTION = 100_000;
export const LA_CREATIVE_ARTIST_EXEMPTION = 300_000;

// ─── Culver City ──────────────────────────────────────────────
export const CULVER_CITY_GROSS_RECEIPTS_PROFESSIONAL = 3.00; // per $1,000
export const CULVER_CITY_EXEMPTION = 200_000;
export const CULVER_CITY_SALES_TAX = 0.1075; // 10.75% (Measure CL, effective Jan 1, 2026)

// ─── S-Corp ───────────────────────────────────────────────────
export const SCORP_BREAKEVEN_ESTIMATE = 60_000; // Approximate net income breakeven

// ─── Utility ──────────────────────────────────────────────────

type TaxBracket = { limit: number; rate: number };

/** Calculates federal income tax using progressive bracket system. */
export function calculateFederalTax(
  taxableIncome: number,
  brackets: readonly TaxBracket[] = TAX_BRACKETS_SINGLE,
): number {
  let tax = 0;
  let previousLimit = 0;

  for (const bracket of brackets) {
    if (taxableIncome <= previousLimit) break;
    const taxableInBracket = Math.min(taxableIncome, bracket.limit) - previousLimit;
    tax += taxableInBracket * bracket.rate;
    previousLimit = bracket.limit;
  }

  return tax;
}

/** Formats a number as USD currency. */
export function formatUSD(value: number): string {
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
