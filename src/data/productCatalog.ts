/**
 * Productized, fixed-fee SKUs - the flat-price products that can be quoted
 * without a custom scope. Feeds the `arcledger://fee-catalog` MCP resource and
 * the agentic-commerce product feed. Prices come from pricing.ts - never
 * hardcode a number here.
 */
import { compliance, international, resolution, consultations, bundles, diagnostics, taxPlanning, taxReview } from './pricing';

export interface ProductSku {
  /** Stable feed id. */
  id: string;
  name: string;
  description: string;
  /** Whole-dollar price from pricing.ts. */
  price: number;
  currency: 'USD';
  /** Site-relative URL (trailing slash), turned absolute in the feed/schema. */
  url: string;
  category: 'Business Formation' | 'Compliance' | 'IRS Help' | 'International' | 'Bundle' | 'Diagnostics';
  /** Key in the private site's stripeLinks.ts for the live checkout page. */
  checkoutLinkKey: string;
  /** Matching private portalProducts.ts sku when this product has portal fulfillment. */
  portalSku?: string;
  /** Billing recurrence for the feed; one-time unless noted. */
  recurrence?: 'annual' | 'monthly';
}

export const PRODUCT_CATALOG: ProductSku[] = [
  {
    id: 'ein-application',
    name: 'EIN Application',
    description: 'We obtain your federal Employer Identification Number, including for founders without an SSN.',
    price: compliance.ein,
    currency: 'USD',
    url: '/services/ein-application/',
    category: 'Business Formation',
    checkoutLinkKey: 'einApplication',
    portalSku: 'ein_application',
  },
  {
    id: 'itin-application',
    name: 'ITIN Application (Form W-7)',
    description: 'ITIN application prepared and represented by an Enrolled Agent. You submit your passport as an original or an issuing-agency certified copy.',
    price: international.itinCAA,
    currency: 'USD',
    url: '/services/itin-application/',
    category: 'International',
    checkoutLinkKey: 'itinApplication',
    portalSku: 'itin_application',
  },
  {
    id: 'tax-extension',
    name: 'Tax Extension Filing',
    description: 'File a federal (and state, if needed) extension to move your filing deadline.',
    price: compliance.taxExtension,
    currency: 'USD',
    url: '/services/tax-extension/',
    category: 'Compliance',
    checkoutLinkKey: 'taxExtension',
    portalSku: 'tax_extension',
  },
  {
    id: 's-corp-election',
    name: 'S-Corp Election (Form 2553)',
    description: 'Prepare and file the S-corporation election so your LLC or corporation is taxed as an S-corp.',
    price: compliance.sCorpElection,
    currency: 'USD',
    url: '/services/s-corp-election/',
    category: 'Business Formation',
    checkoutLinkKey: 'sCorpElection',
    portalSku: 's_corp_election',
  },
  {
    id: 'registered-agent',
    name: 'Registered Agent Service',
    description: 'Registered agent of record for your entity, per state, per year.',
    price: compliance.registeredAgent_annual,
    currency: 'USD',
    url: '/services/registered-agent/',
    category: 'Compliance',
    checkoutLinkKey: 'registeredAgent',
    portalSku: 'registered_agent',
    recurrence: 'annual',
  },
  {
    id: 'boi-report',
    name: 'BOI Report (FinCEN Beneficial Ownership)',
    description: 'Prepare and file the FinCEN Beneficial Ownership Information report (foreign-formed entities).',
    price: compliance.boiReport,
    currency: 'USD',
    url: '/services/annual-compliance/',
    category: 'Compliance',
    checkoutLinkKey: 'boiReport',
    portalSku: 'boi_report',
  },
  {
    id: 'irs-health-check',
    name: 'IRS Health Check - Transcript & Account Review',
    description: 'A full review of your IRS account and transcripts to surface balances, notices, and risks.',
    price: resolution.irsHealthCheck,
    currency: 'USD',
    url: '/services/irs-health-check/',
    category: 'IRS Help',
    checkoutLinkKey: 'irsHealthCheck',
    portalSku: 'irs_health_check',
  },
  {
    id: 'irs-notice-review',
    name: 'IRS Notice Review',
    description: 'An Enrolled Agent reads your specific IRS notice and tells you what it means and what to do. Credited toward representation.',
    price: consultations.irsNoticeReview,
    currency: 'USD',
    url: '/irs-notices/',
    category: 'IRS Help',
    checkoutLinkKey: 'irsNoticeReview',
    portalSku: 'irs_notice_review',
  },
  {
    id: 'new-business-starter',
    name: 'New Business Starter Bundle',
    description: 'EIN + S-Corp election + registered agent coverage in one checkout.',
    price: bundles.newBusinessStarter.price,
    currency: 'USD',
    url: '/pricing/',
    category: 'Bundle',
    checkoutLinkKey: 'newBusinessStarterBundle',
  },
  {
    id: 'annual-peace-of-mind',
    name: 'Annual Peace of Mind Bundle',
    description: 'A bundled annual compliance package for a single flat price.',
    price: bundles.annualPeaceOfMind.price,
    currency: 'USD',
    url: '/pricing/',
    category: 'Bundle',
    checkoutLinkKey: 'annualPeaceOfMindBundle',
  },

  // Diagnostics: fixed-fee reviews. Entry fees marked "credited" apply toward
  // the follow-on engagement.
  {
    id: 's-corp-health-check',
    name: 'S-Corp Tax Health Check',
    description: 'Diagnostic of your S-corp payroll and reasonable compensation, QBI, basis, and state filings, with written findings. Credited toward the full report.',
    price: diagnostics.sCorpHealthCheck,
    currency: 'USD',
    url: '/services/s-corp-health-check/',
    category: 'Diagnostics',
    checkoutLinkKey: 'sCorpHealthCheck',
    portalSku: 's_corp_health_check',
  },
  {
    id: 'accountable-plan-setup',
    name: 'Accountable Plan Setup',
    description: 'California pilot with a written accountable-plan policy, counsel-approved model adoption action, expense-report system, and Enrolled Agent review. Expanded work is scoped separately.',
    price: diagnostics.accountablePlanSetup,
    currency: 'USD',
    url: '/services/accountable-plan/',
    category: 'Diagnostics',
    checkoutLinkKey: 'accountablePlanSetup',
    portalSku: 'accountable_plan_setup',
  },
  {
    id: 'rental-cost-seg-scan',
    name: 'Rental Property / Cost Segregation Scan',
    description: 'Feasibility scan of one rental property covering depreciation, passive losses, and cost-segregation potential. Credited toward the full memo.',
    price: diagnostics.rentalCostSegScan,
    currency: 'USD',
    url: '/services/cost-segregation/',
    category: 'Diagnostics',
    checkoutLinkKey: 'rentalCostSegScan',
    portalSku: 'rental_cost_seg_scan',
  },
  {
    id: 'rd-feasibility-review',
    name: 'R&D Tax Credit Feasibility Review',
    description: 'Screening of your development activities against the federal research-credit tests, with a written suitability summary. Credited toward the deep feasibility.',
    price: diagnostics.rdFeasibilityReview,
    currency: 'USD',
    url: '/services/rd-tax-credit/',
    category: 'Diagnostics',
    checkoutLinkKey: 'rdFeasibilityReview',
  },
  {
    id: 'business-return-readiness',
    name: 'Business Return Readiness Check',
    description: 'Pre-filing readiness check of your books, schedules, elections, and documents with a written gap list. Credited toward return preparation.',
    price: diagnostics.businessReturnReadiness,
    currency: 'USD',
    url: '/services/tax-review/',
    category: 'Diagnostics',
    checkoutLinkKey: 'businessReturnReadiness',
    portalSku: 'business_return_readiness',
  },
  {
    id: 'entity-election-review',
    name: 'Entity & S-Election Review',
    description: 'A review of your entity choice and S-election suitability BEFORE you file, with a written recommendation. Distinct from the election filing.',
    price: diagnostics.entityElectionReview,
    currency: 'USD',
    url: '/services/s-corp-election/',
    category: 'Diagnostics',
    checkoutLinkKey: 'entityElectionReview',
    portalSku: 'entity_election_review',
  },
  {
    id: 'quarterly-planning-snapshot',
    name: 'Quarterly Tax Planning Snapshot',
    description: 'A 45-minute planning session plus a written summary of your top tax moves. Credited toward a larger planning engagement.',
    price: taxPlanning.snapshot,
    currency: 'USD',
    url: '/services/tax-planning/',
    category: 'Diagnostics',
    checkoutLinkKey: 'quarterlyPlanningSnapshot',
    portalSku: 'quarterly_planning_snapshot',
  },
  {
    id: 'tax-review-quick-check',
    name: 'Prior-Year Tax Return Quick Check',
    description: 'A second-opinion quick check of one prior-year return, with a written summary of anything worth a closer look. Credited toward a comprehensive review.',
    price: taxReview.quickCheck,
    currency: 'USD',
    url: '/services/tax-review/',
    category: 'Diagnostics',
    checkoutLinkKey: 'taxReviewQuickCheck',
    portalSku: 'tax_review_quick_check',
  },
  {
    id: 'irs-watchdog-pro',
    name: 'IRS Watchdog Pro - Monthly Monitoring',
    description: 'Premium IRS account monitoring: quarterly transcript pull, written summary, and a quarterly call with the Enrolled Agent.',
    price: resolution.irsWatchdogPro_monthly,
    currency: 'USD',
    url: '/services/irs-watchdog/',
    category: 'IRS Help',
    checkoutLinkKey: 'irsWatchdogProMonthly',
    recurrence: 'monthly',
  },
];
