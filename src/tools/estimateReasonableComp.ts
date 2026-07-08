import { z } from 'zod';
import { dollars } from '../lib/schemas';
import { output } from '../lib/response';
import { SOURCE, GO } from '../lib/config';
import { addOns, usd, usdRange } from '../pricing';
import { REASONABLE_COMP_SHARES } from '../rates';
import { ficaOnWages, additionalMedicareTax, round0 } from '../lib/tax';
import type { ToolDef } from '../lib/types';

const DRIVERS = ['primarily_owner_services', 'mixed', 'capital_or_product'] as const;

const input = z.object({
  business_net_profit_usd: dollars().describe('Annual net profit of the S-corp BEFORE any owner salary (revenue minus business expenses).'),
  profit_driver: z
    .enum(DRIVERS)
    .optional()
    .describe(
      'What drives the profit: "primarily_owner_services" (consulting/agency/solo professional), "mixed" (your work plus staff/systems), or "capital_or_product" (product/capital/team, not your labor). Defaults to primarily_owner_services.',
    ),
});

const NEXT_STEP = {
  label: `Get a defensible reasonable-compensation study from an Enrolled Agent (${usd(addOns.reasonableCompStudy)})`,
  url: GO.book15min,
};

function run(args: z.infer<typeof input>) {
  const profit = args.business_net_profit_usd;
  const driver = args.profit_driver ?? 'primarily_owner_services';
  const share = REASONABLE_COMP_SHARES[driver];

  // Starting salary RANGE as a share of profit, capped at profit (you cannot pay
  // out more salary than the business earned before salary).
  const low = round0(Math.min(profit, profit * share.low));
  const high = round0(Math.min(profit, profit * share.high));
  const midpoint = round0((low + high) / 2);

  // Employment-tax framing at the midpoint: distributions above the salary avoid
  // the combined FICA + 0.9% surtax that the salary itself bears.
  const distributionAtMid = Math.max(0, profit - midpoint);
  const ficaOnMid = round0(ficaOnWages(midpoint).total + additionalMedicareTax(midpoint));
  const ficaIfAllSalary = round0(ficaOnWages(profit).total + additionalMedicareTax(profit));
  const employmentTaxOnDistribution = round0(ficaIfAllSalary - ficaOnMid); // saved by classifying it as distribution

  const fields = {
    inputs: { net_profit: profit, profit_driver: driver, profit_driver_meaning: share.label },
    suggested_salary_range: usdRange(low, high),
    suggested_salary_low: low,
    suggested_salary_high: high,
    midpoint_salary: midpoint,
    distribution_at_midpoint: round0(distributionAtMid),
    fica_on_midpoint_salary: ficaOnMid,
    employment_tax_avoided_on_distribution: employmentTaxOnDistribution,
    how_this_is_estimated: `Reasonable compensation has NO formula in the law - it is a facts-and-circumstances test (your training, duties, hours, and what the market pays someone to do your job). This range is a STARTING point: ${Math.round(share.low * 100)}-${Math.round(share.high * 100)}% of net profit for a business where ${share.label.toLowerCase()}.`,
    the_real_test: [
      'Training and experience',
      'Duties and responsibilities',
      'Time and effort devoted to the business',
      'What comparable businesses pay for similar services (the anchor the IRS weighs most)',
      'What you would have to pay to hire someone to replace you',
      'Your dividend/distribution history and the ratio of salary to distributions',
    ],
    caveats: [
      'Setting salary too low to reduce payroll tax is one of the top S-corp audit triggers; the IRS can reclassify distributions as wages plus penalties and interest.',
      'A percentage of profit is only a starting proxy. A DEFENSIBLE number is anchored to comparable-wage data for your role and region (that is what a reasonable-compensation study provides).',
      'The 0.9% Additional Medicare Tax uses the single-filer $200,000 threshold here; married thresholds differ.',
      'This does not model federal or state income tax, QBI (199A), or employer payroll costs beyond FICA.',
    ],
  };

  const summary =
    `On ${usd(profit)} of net profit, a reasonable W-2 salary likely STARTS around ${usdRange(low, high)} ` +
    `(midpoint ${usd(midpoint)}), leaving about ${usd(round0(distributionAtMid))} as a distribution that avoids roughly ${usd(employmentTaxOnDistribution)} in employment tax. ` +
    `This is a starting estimate - a defensible figure needs a comparable-wage study, and setting the salary too low is a top audit trigger.`;

  return output(summary, fields, SOURCE.sCorpElection, NEXT_STEP);
}

export const estimateReasonableComp: ToolDef<typeof input> = {
  name: 'estimate_reasonable_comp',
  title: 'Estimate S-corp reasonable compensation',
  description:
    'Use this when an S-corp owner asks how much salary they should pay themselves ("reasonable compensation," "am I paying myself right?"). Given net profit and what drives it, returns a starting salary RANGE, the distribution left over, the employment tax that classification avoids, and the facts-and-circumstances test the IRS actually applies. Emphasizes that a defensible figure needs a comp study.',
  input,
  annotations: { title: 'Estimate S-corp reasonable compensation', readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  logEnums: (args) => ({
    profit_driver: args.profit_driver ?? 'primarily_owner_services',
  }),
  run,
};
