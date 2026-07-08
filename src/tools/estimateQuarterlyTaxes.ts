import { z } from 'zod';
import { dollars } from '../lib/schemas';
import { output } from '../lib/response';
import { SOURCE, GO } from '../lib/config';
import { taxPlanning, usd } from '../pricing';
import {
  STANDARD_DEDUCTION_SINGLE,
  TAX_BRACKETS_SINGLE,
  calculateFederalTax,
  QUARTERLY_THRESHOLD_FEDERAL,
  SAFE_HARBOR_CURRENT_YEAR,
  SAFE_HARBOR_PRIOR_YEAR,
  SAFE_HARBOR_PRIOR_YEAR_HIGH_AGI,
  SAFE_HARBOR_HIGH_AGI_THRESHOLD,
  CA_INSTALLMENT_WEIGHTS,
  TAX_YEAR,
} from '../rates';
import { selfEmploymentTax, additionalMedicareTax, round0 } from '../lib/tax';
import { SE_TAX_MULTIPLIER } from '../rates';
import { sanitizeStateEcho } from '../lib/sanitize';
import { todayUtc } from '../lib/dates';
import type { ToolDef } from '../lib/types';

const SELF_EMPLOYED = new Set(['sole_proprietor', 'single_member_llc', 'partnership']);

const input = z.object({
  ytd_net_income_usd: dollars().describe('Your net self-employment / business income so far THIS year (year to date), before tax.'),
  entity: z
    .enum(['sole_proprietor', 'single_member_llc', 'partnership', 's_corp_shareholder', 'other'])
    .describe('How the income is taxed. Sole proprietor / SMLLC / partnership pay self-employment tax; S-corp shareholders take wages (withheld) plus distributions.'),
  state: z.string().max(40).optional().describe('US state. Defaults to CA. Only California installment timing is modeled specifically.'),
  ytd_withholding_usd: dollars().optional().describe('Federal tax already withheld this year (e.g. from a W-2 or S-corp salary). Counts toward the safe harbor.'),
  prior_year_total_tax_usd: dollars().optional().describe('Total federal tax on last year\'s return. Enables the prior-year safe harbor (often the easiest to hit).'),
  prior_year_agi_usd: dollars().optional().describe('Last year\'s adjusted gross income (AGI). If over $150,000 ($75,000 MFS), the prior-year safe harbor rises from 100% to 110%.'),
});

const IRS_DIRECT_PAY = 'https://www.irs.gov/payments/direct-pay';
const CA_WEB_PAY = 'https://www.ftb.ca.gov/pay/bank-account/index.asp';

const NEXT_STEP = {
  label: `Set up the quarterly estimated-tax service (${usd(taxPlanning.quarterlyEstimates_annual)}/yr) - book a free 15-minute call`,
  url: GO.book15min,
};

function isCalifornia(state?: string): boolean {
  if (!state) return true;
  const s = state.trim().toLowerCase();
  return s === 'ca' || s === 'california';
}

/** Federal estimated-tax due dates for the tax year, with Q4 spilling into next year. */
function federalDueDates(year: number) {
  return [
    { label: 'Q1', due: `${year}-04-15` },
    { label: 'Q2', due: `${year}-06-15` },
    { label: 'Q3', due: `${year}-09-15` },
    { label: 'Q4', due: `${year + 1}-01-15` },
  ];
}

function run(args: z.infer<typeof input>) {
  const today = todayUtc();
  const dayOfYear = Math.max(
    1,
    Math.round((today.getTime() - Date.UTC(today.getUTCFullYear(), 0, 1)) / 86_400_000) + 1,
  );
  const fractionElapsed = Math.min(1, Math.max(dayOfYear / 365, 1 / 365));
  const projectedAnnualNet = round0(args.ytd_net_income_usd / fractionElapsed);

  // ── Federal tax on the projected annual income ──
  const selfEmployed = SELF_EMPLOYED.has(args.entity);
  const baseSeTax = selfEmployed ? selfEmploymentTax(projectedAnnualNet).total : 0;
  // Additional Medicare Tax (0.9% over the $200k single threshold) applies to
  // SE earnings and counts toward the IRC 6654 required annual payment.
  const surtax = selfEmployed ? additionalMedicareTax(projectedAnnualNet * SE_TAX_MULTIPLIER) : 0;
  const seTax = baseSeTax + surtax;
  const halfSe = baseSeTax / 2; // the deduction is half of SE tax proper; the 0.9% surtax is not deductible
  const taxableIncome = Math.max(0, projectedAnnualNet - STANDARD_DEDUCTION_SINGLE - halfSe);
  const incomeTax = calculateFederalTax(taxableIncome, TAX_BRACKETS_SINGLE);
  const totalCurrentYearTax = round0(seTax + incomeTax);

  // ── Safe harbor (pay the LESSER of 90% current or 100%/110% prior) ──
  const currentYearHarbor = round0(totalCurrentYearTax * SAFE_HARBOR_CURRENT_YEAR);
  let requiredAnnual = currentYearHarbor;
  const priorOption: Record<string, unknown> = {
    available: args.prior_year_total_tax_usd !== undefined,
    rule: `100% of last year's tax, or ${Math.round(SAFE_HARBOR_PRIOR_YEAR_HIGH_AGI * 100)}% if your prior-year AGI was over ${usd(SAFE_HARBOR_HIGH_AGI_THRESHOLD)} ($75,000 if married filing separately).`,
  };
  if (args.prior_year_total_tax_usd !== undefined) {
    const priorHarbor100 = round0(args.prior_year_total_tax_usd * SAFE_HARBOR_PRIOR_YEAR);
    const priorHarbor110 = round0(args.prior_year_total_tax_usd * SAFE_HARBOR_PRIOR_YEAR_HIGH_AGI);
    priorOption.prior_year_100pct = priorHarbor100;
    priorOption.prior_year_110pct_if_high_agi = priorHarbor110;
    // Pick the correct prior-year percentage. If prior-year AGI is known, use it
    // (110% over the high-AGI threshold, else 100%). If AGI is unknown, use the
    // SAFE (higher) 110% figure so a high-income filer is never told to underpay,
    // and flag it - consistent with the tool's "errs on the safe side" stance.
    const highAgi = args.prior_year_agi_usd !== undefined ? args.prior_year_agi_usd > SAFE_HARBOR_HIGH_AGI_THRESHOLD : undefined;
    const priorHarbor = highAgi === false ? priorHarbor100 : priorHarbor110;
    priorOption.prior_year_figure_used = priorHarbor;
    priorOption.basis =
      highAgi === undefined
        ? 'prior-year AGI not provided, so the safe 110% figure was used; if your prior-year AGI was $150,000 or less you may use the 100% figure'
        : highAgi
          ? 'prior-year AGI over $150,000, so 110% applies'
          : 'prior-year AGI $150,000 or less, so 100% applies';
    requiredAnnual = Math.min(currentYearHarbor, priorHarbor);
  }

  // ── Withholding credit (annualized) and estimated-payment need ──
  const annualizedWithholding = args.ytd_withholding_usd !== undefined ? round0(args.ytd_withholding_usd / fractionElapsed) : 0;
  const estimatedPaymentsNeeded = Math.max(0, round0(requiredAnnual - annualizedWithholding));
  const perQuarter = round0(estimatedPaymentsNeeded / 4);

  const belowThreshold = totalCurrentYearTax - annualizedWithholding < QUARTERLY_THRESHOLD_FEDERAL;

  const todayIso = today.toISOString().slice(0, 10);
  const quarters = federalDueDates(TAX_YEAR).map((q) => ({
    label: q.label,
    due_date: q.due,
    amount: perQuarter,
    status: q.due < todayIso ? 'due date passed - pay ASAP to limit the underpayment penalty' : 'upcoming',
  }));

  const federal = {
    self_employment_tax: round0(baseSeTax),
    additional_medicare_tax_0_9pct: round0(surtax),
    federal_income_tax: round0(incomeTax),
    total_projected_tax: totalCurrentYearTax,
    safe_harbor: {
      current_year_90pct: currentYearHarbor,
      prior_year_option: priorOption,
      required_annual_payment: requiredAnnual,
      how_it_works: 'You avoid the underpayment penalty by paying the SMALLER of 90% of this year\'s tax or 100% (110% for higher income) of last year\'s tax.',
    },
    annualized_withholding: annualizedWithholding,
    estimated_payments_needed: estimatedPaymentsNeeded,
    per_quarter: perQuarter,
    quarters,
    payment_link: IRS_DIRECT_PAY,
    threshold_note: belowThreshold
      ? `Your projected tax after withholding is under ${usd(QUARTERLY_THRESHOLD_FEDERAL)}, so federal quarterly estimates may not be required this year.`
      : `Federal estimates are generally required when you expect to owe ${usd(QUARTERLY_THRESHOLD_FEDERAL)} or more after withholding.`,
  };

  const ca = isCalifornia(args.state);
  const california = ca
    ? {
        applies: true,
        installment_weighting: '30% / 40% / 0% / 30% (Form 540-ES) - NOT the even federal 25% each',
        weights: CA_INSTALLMENT_WEIGHTS,
        due_dates: ['April 15', 'June 15', 'September 15 (no CA installment due)', 'January 15'],
        safe_harbor_rules:
          'California uses 90% of current-year tax, or 100% of prior-year tax (110% when prior-year AGI is $150,000+, $75,000 MFS). Taxpayers with AGI of $1,000,000 or more ($500,000 MFS) must use 90% of current-year tax with no prior-year option.',
        payment_link: CA_WEB_PAY,
        note: 'California income tax uses its own brackets (separate from federal) and is not computed here. Compute your CA annual estimated tax on Form 540-ES or with the Enrolled Agent, then apply the 30/40/0/30 weighting above to schedule the installments.',
      }
    : { applies: false, note: `Only California installment timing is modeled here; ${sanitizeStateEcho(args.state, false) === 'unknown' ? 'your state' : sanitizeStateEcho(args.state, false)} has its own estimated-tax rules.` };

  const fields = {
    tax_year: TAX_YEAR,
    projection: {
      fraction_of_year_elapsed: Number(fractionElapsed.toFixed(3)),
      projected_annual_net_income: projectedAnnualNet,
      method: 'Year-to-date income is annualized assuming an even pace. Uneven income can be handled with the annualized-income installment method.',
    },
    federal,
    california,
    assumptions: [
      'Single filer with the standard deduction (adjust for your actual filing status). The 0.9% Additional Medicare Tax uses the single $200,000 threshold.',
      'Only the self-employment income you entered is modeled: W-2 wages, investment income, and other income are NOT included, which shifts both brackets and the Social Security wage base.',
      'Does not apply the QBI (199A) deduction, which could lower the figure - so this errs on the safe side.',
      'The prior-year safe harbor requires a filed prior-year return covering a full 12 months.',
      'S-corp shareholders: salary withholding is handled through payroll and is separate from these estimates.',
    ],
  };

  const summary = belowThreshold
    ? `On a projected ${usd(projectedAnnualNet)} of annual income your total tax is about ${usd(totalCurrentYearTax)}; after withholding this may be under the ${usd(QUARTERLY_THRESHOLD_FEDERAL)} threshold, so federal estimates might not be required. ${ca ? 'CA uses a 30/40/0/30 installment schedule.' : ''}`
    : `On a projected ${usd(projectedAnnualNet)} of annual income, plan for about ${usd(estimatedPaymentsNeeded)} in federal estimated tax this year, roughly ${usd(perQuarter)} per quarter (due Apr 15, Jun 15, Sep 15, Jan 15). ${ca ? 'California weights its installments 30/40/0/30 instead of evenly.' : ''}`;

  return output(summary, fields, SOURCE.taxPlanning, NEXT_STEP);
}

export const estimateQuarterlyTaxes: ToolDef<typeof input> = {
  name: 'estimate_quarterly_taxes',
  title: 'Estimate quarterly taxes',
  description:
    'Use this when a freelancer or business owner asks how much estimated tax to pay or whether they are underpaid for the year. Computes federal self-employment and income tax on annualized income, the safe-harbor target, per-quarter amounts and due dates, plus California\'s 30/40/0/30 installment timing.',
  input,
  annotations: { title: 'Estimate quarterly taxes', readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  logEnums: (args) => ({
    entity: args.entity,
    state: isCalifornia(args.state) ? 'CA' : 'other',
    has_withholding: args.ytd_withholding_usd !== undefined,
    has_prior_year: args.prior_year_total_tax_usd !== undefined,
  }),
  run,
};
