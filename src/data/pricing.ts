/**
 * Arc & Ledger Accounting - published fee schedule.
 *
 * This is the standalone snapshot of the firm's price list used by the MCP
 * tools and the product catalog. It carries the same numbers published at
 * https://www.arcandledger.com/pricing/ and served by the live MCP endpoint;
 * it is kept in sync with the firm's site on each release.
 *
 * Whole US dollars. "from"/"starting"/"minimum" values are a floor; final fees
 * are scoped after a document review. Recurring items are per month unless
 * noted. No tool may hardcode a dollar figure - it must be read from here.
 */

/** Identifies which published price set this build serves (exposed by GET /version). */
export const PRICE_SET = "recommended_2026_27";

/* ------------------------------------------------------------------ */
/* INDIVIDUAL & BUSINESS TAX RETURNS  (one-time, per return)          */
/* ------------------------------------------------------------------ */
export const taxReturns = {
  form1040: 525,
  scheduleC_smllc: 850,              // Schedule C / single-member LLC (one product)
  sCorp1120S_or_1065: 1595,          // includes CA return + reasonable-compensation memo; up to 2 K-1s + CA 100S/565
  cCorp1120: 1895,
  nonProfit990: 1500,
  multiEntityCrossBorder_from: 2750, // quoted after a Discovery Session
  form1040NR: 595,                   // non-resident alien return (Form 1040-NR)
  dualStatusReturn: 895,             // dual-status alien return (part-year resident + non-resident in one year)
} as const;

/* ------------------------------------------------------------------ */
/* RETURN MODIFIERS  (added to a base tier, one-time)                 */
/* ------------------------------------------------------------------ */
export const modifiers = {
  additionalState: 125,
  k1Received: 45,                // per K-1 entered
  k1IssuedOver2: 125,            // per K-1 beyond the 2 included
  rentalScheduleE: 175,          // per property
  additionalScheduleC: 295,      // per extra business
  crypto: { upTo50: 95, from50to500: 295, over500_from: 595 },
  stockOptionsRSUs: 150,
  foreignTaxCredit1116: 195,     // per category
  booksCleanupBeforeReturn_from: 495,
  rushSurchargePct: 25,          // +25% of the return fee when documents arrive after Mar 15 (individuals) / Feb 15 (entities); guarantees the deadline
} as const;

/* ------------------------------------------------------------------ */
/* INTERNATIONAL & CROSS-BORDER  (one-time, per form)                 */
/* ------------------------------------------------------------------ */
export const international = {
  fbar_firstYear: 225,
  fbar_catchUpPerYear: 99,
  form8938_fatca: 295,
  form8833_treaty: 295,
  form5471_base: 1895,
  form5471_perSchedule: 500,
  form5472_base: 1800,
  form8865_base: 1750,
  form3520: 895,
  form3520A: 1095,
  form8621PFIC_first: 350,       // PFIC reporting (Form 8621), first fund
  form8621PFIC_additional: 150,  // each additional PFIC / fund
  firpta8288B: 1500,
  streamlinedDomestic: 2650,
  streamlinedForeign: 3195,
  itinCAA: 399,
  preImmigrationPlanning_from: 1500,
} as const;

/* ------------------------------------------------------------------ */
/* BOOKKEEPING - MONTHLY  (10% off on annual prepay)                  */
/* Essentials does NOT bundle a cloud-accounting subscription (bring   */
/* your own QuickBooks/Xero); Growth and up include it. `price` is the */
/* new-client promotional rate; `regular` applies after promoEndDate.  */
/* ------------------------------------------------------------------ */
export const bookkeeping = {
  essentials: { price: 295, regular: 395, volume: "0-100 txns/mo", cloudSoftwareIncluded: false },
  growth: { price: 495, regular: 595, volume: "101-300 txns/mo", cloudSoftwareIncluded: true },
  enterprise: { from: 795, volume: "300+ txns / multi-entity" }, // scoped per case
  cleanupCatchUp_from: 750,      // one-time catch-up, priced from this floor after a records review
  firstYear1099Free: true,       // annual clients: first Form 1099 filed free
  promoEndDate: "2026-08-31",    // new-client promo end date
  annualPrepayDiscountPct: 10,
} as const;

/* ------------------------------------------------------------------ */
/* IRS NOTICES / RESOLUTION                                           */
/* ------------------------------------------------------------------ */
export const resolution = {
  installmentAgreementSimple_from: 950,      // streamlined, under $50k, current filer
  irsRepresentationResolution_from: 1500,    // notices + transcripts + multi-year + liens; OIC and complex cases quoted per case
  oicTypical: { from: 5000, to: 15000 },     // Offer in Compromise - typical range, quoted per case
  penaltyAbatementFirstTime_from: 395,
  noticeResponseOneIssue_low: 750,
  noticeResponseOneIssue_high: 1500,
  amended1040X_minor: 350,
  amended1040X_full: 650,
  amended1040X_perState: 175,
  irsHealthCheck: 299,                       // full account + transcript review
  irsWatchdog_monthly: 29,
  irsWatchdog_annual: 290,
  irsWatchdogPro_monthly: 99,                // quarterly transcript pull + EA summary call
} as const;

/* ------------------------------------------------------------------ */
/* COMPLIANCE & MAINTENANCE                                           */
/* ------------------------------------------------------------------ */
export const compliance = {
  registeredAgent_annual: 149,
  annualReport_annual: 199,
  boiReport: 175,                // foreign-formed entities only; US-formed exempt (FinCEN, Mar 2025)
  ein: 250,
  sCorpElection: 299,
  taxExtension: 99,
  stateTaxRegistration_perState: 199,
  salesTax_perStatePerPeriod: 150,
  // California state filings (flat prep fee; CA government filing fee passed through separately)
  caStatementOfInformation: 75,  // CA SOS Statement of Information (LLC/Corp)
  caForm3500A: 75,               // CA FTB Form 3500A submission - short form
  caForm3500: 400,               // CA FTB Form 3500 full exemption application - from
  caForm588: 75,                 // CA FTB Form 588 nonresident withholding waiver request
} as const;

/* ------------------------------------------------------------------ */
/* ADD-ONS & ADVISORY                                                 */
/* ------------------------------------------------------------------ */
export const addOns = {
  payroll_perQuarter: 495,       // standalone quarterly rate; included in retainer packages
  reasonableCompStudy: 495,      // S-corp salary support
  entityStructuringConsult: 500,
  priorYearReturn_perYear: 600,
  salesTaxNexusAnalysis: 500,    // e-commerce sales-tax nexus study (one-time)
  form1099Filing_upTo5: 199,          // January 1099-NEC/MISC filing, up to 5 forms
  form1099Filing_perAdditional: 10,   // each 1099 beyond the first 5
  quarterlyEstimatedTax_annual: 349,  // quarterly estimated-tax calculation + vouchers for the year
  noticeShield_perReturnAnnual: 149,  // 12 months of IRS/state notice response for a filed return
} as const;

/* ------------------------------------------------------------------ */
/* TAX PLANNING  (two tiers)                                          */
/* ------------------------------------------------------------------ */
export const taxPlanning = {
  snapshot: 349,                 // 45 min + written top moves; credited toward a larger engagement
  engagement_from: 1497,
  strategyProject: { from: 2497, to: 4997 }, // comprehensive multi-entity restructuring project
  quarterlyEstimates_annual: 349, // computes each quarter's federal + CA payment and sends reminders, per year
} as const;

/* ------------------------------------------------------------------ */
/* BUNDLES                                                            */
/* `value` is the retail sum of the included services; savings =       */
/* value - price. Standard-complexity scope; return modifiers apply    */
/* beyond it. Bundles do not combine with other discounts.             */
/* ------------------------------------------------------------------ */
export const bundles = {
  newBusinessStarter: { price: 699, savings: 50 }, // EIN + S-Corp election + setup
  annualPeaceOfMind: { price: 349, savings: 289 },
  sCorpOwnerComplete: { value: 4524, price: 3995, monthlyPrice: 369, savings: 529 }, // 1120-S + 1040 + monthly books + payroll + CA filings
  expatAnnual: { value: 1240, price: 1095, savings: 145 },                            // 1040 + FBAR + FATCA + FTC for Americans abroad
  foreignFounderComplianceY2: { value: 2613, price: 2295, savings: 318 },             // year-2+ foreign-owned US entity: 5472 + returns + agent + reports
  landlordPackage: { value: 1224, price: 1095, savings: 129 },                        // 1040 + Schedule E rentals + depreciation
  freshStart: { value: 3049, price: 2795, savings: 254, deposit: 500 },               // back-year returns + transcripts + abatement; deposit credited toward the price
  nonresidentInvestorStarter: { value: 1169, price: 1045, savings: 124 },             // 1040-NR + treaty + FIRPTA + ITIN
} as const;

/* ------------------------------------------------------------------ */
/* CONSULTATIONS / ENTRY POINTS                                       */
/* ------------------------------------------------------------------ */
export const consultations = {
  free15Min: 0,
  irsNoticeReview: 199,          // single-notice triage, credited in full
  discoverySession_from: 297,    // standard 297 / specialist 497, both credited
  discoverySpecialist: 497,
} as const;

/* ------------------------------------------------------------------ */
/* DISCOUNTS & ENGAGEMENT TERMS                                       */
/* ------------------------------------------------------------------ */
export const terms = {
  referralDiscountPct: 10,       // both parties, new clients only, first invoice
  earlyFilingDiscountPct: 10,    // complete docs before Feb 28; returns only
  annualPrepayDiscountPct: 10,   // bookkeeping & retainers
  maxStackedDiscountPct: 15,     // promotional discounts do not stack; the single largest applies, capped here
  engagementFee_min: 250,        // non-refundable deposit, applied in full to the final invoice
  engagementFee_max: 750,
} as const;

/* ------------------------------------------------------------------ */
/* DIAGNOSTICS  (fixed-fee reviews; fees marked "credited" apply      */
/* toward the follow-on engagement)                                   */
/* ------------------------------------------------------------------ */
export const diagnostics = {
  sCorpHealthCheck: 349,                          // payroll/QBI/basis/CA-filings diagnostic; credited toward the report
  sCorpHealthCheckReport: { from: 795, to: 1250 },
  accountablePlanSetup: 499,                      // written plan + board resolution + expense-report system
  accountablePlanPackage: { from: 999, to: 1500 },
  accountablePlanQuarterlyReview: 249,            // per-quarter substantiation review
  rentalCostSegScan: 299,                         // depreciation/passive-loss/cost-seg feasibility scan; credited toward memo
  costSegMemo: { from: 750, to: 1500 },
  rdFeasibilityReview: 750,                       // R&D credit screening; credited toward feasibility
  rdFeasibilityDeep: 1500,
  rdCreditStudy: { from: 3000, to: 15000 },       // full study - quoted per case
  businessReturnReadiness: 295,                   // pre-filing readiness check; credited toward return prep
  entityElectionReview: 399,                      // entity + S-election review before filing
} as const;

/* ------------------------------------------------------------------ */
/* TAX REVIEW  (second-opinion reviews; distinct from preparation)    */
/* ------------------------------------------------------------------ */
export const taxReview = {
  quickCheck: 199,
  comprehensiveIndividual: 499,
  backYearPerYear: 399,
  businessReturn: 749,
  amendment_from: 750,
  amendment_to: 2500,
  internationalReview: 899,
} as const;

/* ------------------------------------------------------------------ */
/* INTERNATIONAL-FOUNDER FORMATION FUNNEL                             */
/* Bundled formation packages and their add-ons; some add-on rates     */
/* intentionally differ from the standalone catalog above (bundled     */
/* pricing).                                                           */
/* ------------------------------------------------------------------ */
export const formation = {
  // Tier packages
  starter: 499,            // one-time
  ecommerce: 999,          // one-time
  business: 1999,          // annual
  investor: 3999,          // annual
  businessMonthlyPlan: 199,  // monthly payment-plan charge
  investorMonthlyPlan: 399,  // monthly payment-plan charge
  // Funnel add-ons
  additionalStateRegistration: 299, // per state
  salesTaxRegistration: 299,
  itinW7: 399,
  sCorpElection2553: 299,
  additionalForm5472: 350,
  catchUpBookkeeping_perMonth: 250,
  amendedReturn: 500,
  penaltyAbatement_from: 750,
  delinquentFbar: 500,
  taxPlanningHour: 250,
  realEstateLlc_perProperty: 799,
} as const;

/* ------------------------------------------------------------------ */
/* DISPLAY HELPERS                                                    */
/* Format only - these never round, alter, or invent a value.         */
/* ------------------------------------------------------------------ */

/** Group a whole-dollar integer with commas: 1895 -> "1,895". */
export const groupThousands = (n: number): string =>
  String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** Render a whole-dollar amount as a price string: 1895 -> "$1,895". */
export const usd = (n: number): string => `$${groupThousands(n)}`;

/** Render a price range: (525, 1500) -> "$525 - $1,500". */
export const usdRange = (low: number, high: number): string =>
  `${usd(low)} - ${usd(high)}`;

/** True while a promotion is still running (inclusive of its end date). */
export const isPromoActive = (iso: string, now: Date = new Date()): boolean => {
  const end = new Date(`${iso}T23:59:59`);
  return now.getTime() <= end.getTime();
};

/**
 * The bookkeeping price to display TODAY: the promotional rate while the
 * new-client promo runs, the regular rate once it ends.
 */
export const bookkeepingPrice = (
  tier: { price: number; regular: number },
  now: Date = new Date(),
): number => (isPromoActive(bookkeeping.promoEndDate, now) ? tier.price : tier.regular);
