import { z } from 'zod';
import { dollars, count, clamp } from '../lib/schemas';
import { output } from '../lib/response';
import { SOURCE, GO } from '../lib/config';
import { taxPlanning, usd } from '../pricing';
import { STANDARD_MILEAGE_RATE, DEFAULT_MARGINAL_RATE } from '../rates';
import { round0 } from '../lib/tax';
import type { ToolDef } from '../lib/types';

const input = z.object({
  home_office_expense_usd: dollars(500_000).optional().describe('Annual business-use portion of your home costs (rent/mortgage interest, utilities, insurance x business-use %). If you only know square footage, use the simplified method: $5/sq ft up to 300 sq ft = $1,500 max.'),
  business_miles: count(1_000_000).optional().describe('Business miles you drive per year in your personal vehicle. Reimbursed at the IRS standard mileage rate.'),
  cell_internet_usd: dollars(100_000).optional().describe('Annual business-use portion of your cell phone and home internet.'),
  other_business_expense_usd: dollars(1_000_000).optional().describe('Other out-of-pocket business expenses you personally paid (supplies, travel, professional dues, etc.).'),
  marginal_tax_rate_pct: z
    .number()
    .finite()
    .optional()
    .describe('Your combined marginal tax rate as a percent (e.g. 24, or 33 to include state). Used to estimate the tax saving. Defaults to 22.'),
});

const NEXT_STEP = {
  label: `Have an Enrolled Agent set up your accountable plan (tax-planning snapshot ${usd(taxPlanning.snapshot)})`,
  url: GO.book15min,
};

function run(args: z.infer<typeof input>) {
  const homeOffice = args.home_office_expense_usd ?? 0;
  const miles = args.business_miles ?? 0;
  const cellInternet = args.cell_internet_usd ?? 0;
  const other = args.other_business_expense_usd ?? 0;
  const marginalRate =
    args.marginal_tax_rate_pct !== undefined ? clamp(args.marginal_tax_rate_pct, 0, 50) / 100 : DEFAULT_MARGINAL_RATE;

  const mileageReimbursement = round0(miles * STANDARD_MILEAGE_RATE);
  const totalReimbursable = round0(homeOffice + mileageReimbursement + cellInternet + other);
  const taxSaving = round0(totalReimbursable * marginalRate);

  const fields = {
    inputs: {
      home_office: homeOffice,
      business_miles: miles,
      cell_internet: cellInternet,
      other: other,
      marginal_tax_rate: `${Math.round(marginalRate * 100)}%`,
    },
    reimbursement_breakdown: {
      home_office: homeOffice,
      mileage: `${mileageReimbursement} (${miles} miles x ${usd(STANDARD_MILEAGE_RATE)}/mile)`,
      cell_and_internet: cellInternet,
      other: other,
    },
    total_annual_reimbursement: totalReimbursable,
    estimated_annual_tax_saving: taxSaving,
    why_it_matters:
      'The 2017 Tax Cuts and Jobs Act suspended the deduction for unreimbursed employee business expenses (2018 through 2025). So if you are an S-corp or C-corp owner-employee paying these costs out of pocket, you get NOTHING for them personally. An accountable plan fixes that: the company reimburses you, the company DEDUCTS it, and the reimbursement is TAX-FREE to you - not reported as wages.',
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
      'The home-office amount must reflect genuine business-use percentage; the simplified method caps at $1,500 (300 sq ft x $5).',
    ],
  };

  const summary =
    totalReimbursable > 0
      ? `An accountable plan could reimburse you about ${usd(totalReimbursable)} a year TAX-FREE (home office, ${miles} business miles, phone/internet, and other costs), which the company deducts - roughly ${usd(taxSaving)} in tax saved at a ${Math.round(marginalRate * 100)}% rate. Without the plan, an S-corp/C-corp owner gets no deduction for these out-of-pocket costs. It needs a written policy, substantiation, and return of any excess.`
      : `An accountable plan lets your S-corp/C-corp reimburse you TAX-FREE for out-of-pocket business costs (home office, mileage, phone, supplies) that you otherwise cannot deduct at all. Tell me your annual amounts and I will estimate the saving.`;

  return output(summary, fields, SOURCE.taxPlanning, NEXT_STEP);
}

export const estimateAccountablePlan: ToolDef<typeof input> = {
  name: 'estimate_accountable_plan',
  title: 'Estimate accountable-plan reimbursements',
  description:
    'Use this when an S-corp or C-corp owner asks how to deduct home office, mileage, cell phone, or other out-of-pocket business expenses, or asks about an "accountable plan." Totals the tax-free reimbursement, estimates the tax saving, and explains the three requirements (business connection, substantiation, return of excess) and why owner-employees get no deduction without one.',
  input,
  annotations: { title: 'Estimate accountable-plan reimbursements', readOnlyHint: true, openWorldHint: false },
  logEnums: (args) => ({
    has_home_office: args.home_office_expense_usd !== undefined,
    has_mileage: args.business_miles !== undefined,
    has_marginal_rate: args.marginal_tax_rate_pct !== undefined,
  }),
  run,
};
