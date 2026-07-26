import { z } from 'zod';
import { dollars, count, clamp } from '../lib/schemas';
import { output } from '../lib/response';
import { SOURCE, GO } from '../lib/config';
import { usd } from '../pricing';
import {
  STANDARD_MILEAGE_RATE_FIRST_HALF_2026,
  STANDARD_MILEAGE_RATE_SECOND_HALF_2026,
  DEFAULT_MARGINAL_RATE,
} from '../rates';
import { round0 } from '../lib/tax';
import type { ToolDef } from '../lib/types';

const input = z.object({
  home_office_expense_usd: dollars(500_000).optional().describe('Annual business-use portion of your home costs (rent/mortgage interest, utilities, insurance x business-use %). If you only know square footage, use the simplified method: $5/sq ft up to 300 sq ft = $1,500 max.'),
  business_miles: count(1_000_000).optional().describe('Business miles driven in your personal vehicle. For 2026, also identify whether the miles were before July 1, on or after July 1, or span both periods because the IRS changed the rate midyear.'),
  business_mileage_period: z
    .enum(['before_july_1_2026', 'on_or_after_july_1_2026', 'mixed_or_unknown'])
    .optional()
    .describe('When the business miles occurred. Defaults to mixed_or_unknown, which returns a reimbursement range rather than inventing a single rate. For miles in both 2026 periods, call the tool once per period and add the results.'),
  cell_internet_usd: dollars(100_000).optional().describe('Annual business-use portion of your cell phone and home internet.'),
  other_business_expense_usd: dollars(1_000_000).optional().describe('Other out-of-pocket business expenses you personally paid (supplies, travel, professional dues, etc.).'),
  marginal_tax_rate_pct: z
    .number()
    .finite()
    .optional()
    .describe('Your combined marginal tax rate as a percent (e.g. 24, or 33 to include state). Used to estimate the tax saving. Defaults to 22.'),
});

const NEXT_STEP = {
  label: 'Have an Enrolled Agent draft your accountable plan and expense-report system - free 15-minute call',
  url: GO.book15min,
};

function run(args: z.infer<typeof input>) {
  const homeOffice = args.home_office_expense_usd ?? 0;
  const miles = args.business_miles ?? 0;
  const cellInternet = args.cell_internet_usd ?? 0;
  const other = args.other_business_expense_usd ?? 0;
  const mileagePeriod = args.business_mileage_period ?? 'mixed_or_unknown';
  const marginalRate =
    args.marginal_tax_rate_pct !== undefined ? clamp(args.marginal_tax_rate_pct, 0, 50) / 100 : DEFAULT_MARGINAL_RATE;

  const rateLow =
    mileagePeriod === 'on_or_after_july_1_2026'
      ? STANDARD_MILEAGE_RATE_SECOND_HALF_2026
      : STANDARD_MILEAGE_RATE_FIRST_HALF_2026;
  const rateHigh =
    mileagePeriod === 'before_july_1_2026'
      ? STANDARD_MILEAGE_RATE_FIRST_HALF_2026
      : STANDARD_MILEAGE_RATE_SECOND_HALF_2026;
  const mileageLow = round0(miles * rateLow);
  const mileageHigh = round0(miles * rateHigh);
  const nonMileage = homeOffice + cellInternet + other;
  const totalLow = round0(nonMileage + mileageLow);
  const totalHigh = round0(nonMileage + mileageHigh);
  const taxSavingLow = round0(totalLow * marginalRate);
  const taxSavingHigh = round0(totalHigh * marginalRate);
  const exact = totalLow === totalHigh;

  const fields: Record<string, unknown> = {
    inputs: {
      home_office: homeOffice,
      business_miles: miles,
      business_mileage_period: mileagePeriod,
      cell_internet: cellInternet,
      other: other,
      marginal_tax_rate: `${Math.round(marginalRate * 100)}%`,
    },
    reimbursement_breakdown: {
      home_office: homeOffice,
      mileage: exact
        ? {
            miles,
            period: mileagePeriod,
            rate_cents_per_mile: rateLow * 100,
            estimated_reimbursement: mileageLow,
          }
        : {
            miles,
            period: mileagePeriod,
            rate_cents_per_mile_range: [
              STANDARD_MILEAGE_RATE_FIRST_HALF_2026 * 100,
              STANDARD_MILEAGE_RATE_SECOND_HALF_2026 * 100,
            ],
            estimated_reimbursement_range: { low: mileageLow, high: mileageHigh },
          },
      cell_and_internet: cellInternet,
      other: other,
    },
    why_it_matters:
      'Federal law disallows miscellaneous itemized deductions for unreimbursed employee business expenses. If an S-corp or C-corp owner-employee pays business costs personally, a qualifying accountable plan lets the company reimburse substantiated expenses, deduct the reimbursement, and keep the reimbursement out of wages.',
    the_three_requirements: [
      'Business connection: the expense must have a legitimate business purpose.',
      'Substantiation: you must document each expense (receipts, a mileage log, the home-office calculation) within a reasonable time.',
      'Return of excess: any advance beyond actual expenses must be paid back within a reasonable time.',
    ],
    how_to_set_it_up: [
      'Adopt a written accountable-plan policy (a corporate resolution).',
      'Submit an expense report to the company on a regular schedule with backup.',
      'The company reimburses you by separate payment (not on your W-2).',
      'Keep the mileage log and home-office worksheet with the report.',
    ],
    caveats: [
      'This estimates the income-tax saving using the marginal rate you gave (or a 22% default); it does not model your full return.',
      'An accountable plan applies to a CORPORATION reimbursing an owner-employee. A sole proprietor deducts these directly on Schedule C instead and does not need one.',
      'Use EITHER the standard mileage rate OR actual vehicle costs, not both; this tool uses the standard rate.',
      'The 2026 business mileage rate is 72.5 cents for expenses before July 1 and 76 cents for expenses on or after July 1. Split mixed-period mileage and calculate each period separately for an exact reimbursement.',
      'The home-office amount must reflect genuine business-use percentage; the simplified method caps at $1,500 (300 sq ft x $5).',
    ],
  };

  if (exact) {
    fields.total_annual_reimbursement = totalLow;
    fields.estimated_annual_tax_saving = taxSavingLow;
  } else {
    fields.total_annual_reimbursement_range = { low: totalLow, high: totalHigh };
    fields.estimated_annual_tax_saving_range = { low: taxSavingLow, high: taxSavingHigh };
  }

  const summary =
    totalHigh > 0
      ? exact
        ? `A qualifying accountable plan could reimburse about ${usd(totalLow)} for the entered costs, including ${miles} business miles at ${(rateLow * 100).toFixed(1)} cents per mile, with an estimated ${usd(taxSavingLow)} income-tax effect at a ${Math.round(marginalRate * 100)}% marginal rate. It requires a business connection, timely substantiation, and return of any excess.`
        : `The 2026 mileage period is missing, so a single reimbursement would be false precision. The entered costs produce an estimated reimbursement range of ${usd(totalLow)} to ${usd(totalHigh)} and an estimated income-tax effect of ${usd(taxSavingLow)} to ${usd(taxSavingHigh)}. Use 72.5 cents for miles before July 1 and 76 cents for miles on or after July 1, then call the tool separately for each period.`
      : `A qualifying accountable plan can reimburse an S-corp or C-corp owner-employee for substantiated out-of-pocket business costs without treating the reimbursement as wages. Enter the costs and identify the mileage period for an estimate.`;

  return output(summary, fields, SOURCE.taxPlanning, NEXT_STEP);
}

export const estimateAccountablePlan: ToolDef<typeof input> = {
  name: 'estimate_accountable_plan',
  title: 'Estimate accountable-plan reimbursements',
  description:
    'Use this when an S-corp or C-corp owner asks how an accountable plan handles substantiated home-office, mileage, cell-phone, or other out-of-pocket business expenses. Estimates the reimbursement and tax effect, applies the two separate 2026 mileage rates by date, and explains the three requirements: business connection, substantiation, and return of excess.',
  input,
  annotations: { title: 'Estimate accountable-plan reimbursements', readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  logEnums: (args) => ({
    has_home_office: args.home_office_expense_usd !== undefined,
    has_mileage: args.business_miles !== undefined,
    mileage_period: args.business_mileage_period ?? 'mixed_or_unknown',
    has_marginal_rate: args.marginal_tax_rate_pct !== undefined,
  }),
  run,
};
