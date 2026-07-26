import { z } from 'zod';
import { dollars } from '../lib/schemas';
import { output } from '../lib/response';
import { SOURCE, GO } from '../lib/config';
import { usd, usdRange } from '../pricing';
import { REASONABLE_COMP_SHARES, REASONABLE_COMP_MIN_PROFIT } from '../rates';
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
  label: 'Document your salary with a defensible reasonable-compensation study - free 15-minute call with an Enrolled Agent',
  url: GO.book15min,
};

const CONSULT_NEXT_STEP = {
  label: 'Talk it through with an Enrolled Agent - free 15-minute call',
  url: GO.book15min,
};

/** The facts-and-circumstances factors the IRS actually weighs (no formula). */
const THE_REAL_TEST = [
  'Training and experience',
  'Duties and responsibilities',
  'Time and effort devoted to the business',
  'What comparable businesses pay for similar services (the anchor the IRS weighs most)',
  'What you would have to pay to hire someone to replace you',
  'Your dividend/distribution history and the ratio of salary to distributions',
];

/**
 * Which handling a given profit falls into. Coarse, non-identifying (no dollar
 * amounts) - safe to log.
 */
function profitBand(profit: number): 'zero_or_negative' | 'below_floor' | 'normal' {
  if (profit <= 0) return 'zero_or_negative';
  if (profit < REASONABLE_COMP_MIN_PROFIT) return 'below_floor';
  return 'normal';
}

function run(args: z.infer<typeof input>) {
  const profit = args.business_net_profit_usd;
  const driver = args.profit_driver ?? 'primarily_owner_services';
  const share = REASONABLE_COMP_SHARES[driver];
  const band = profitBand(profit);

  // Guard: reasonable compensation is measured against SERVICES PERFORMED,
  // not book profit. At or below zero profit we must not emit a salary number
  // (a $0 "reasonable salary" is the exact zero-comp-with-distributions audit
  // pattern); below the floor a percentage-of-profit range is not meaningful
  // and an S election is usually not cost-effective. Both return a fixed
  // conversation-needed message with NO numeric salary.
  if (band !== 'normal') {
    const summary =
      band === 'zero_or_negative'
        ? `Reasonable compensation is not a percentage of profit, so there is no salary to calculate at ${usd(profit)} of net profit. Officer pay is measured against the services you actually perform: an S-corp can owe reasonable compensation even in a break-even or loss year if you work in the business and take distributions. This one needs a conversation with an Enrolled Agent, not a calculator.`
        : `At ${usd(profit)} of net profit, this is below the level where a salary calculation is meaningful. Reasonable compensation is measured against the services you perform, not book profit, and an S election is usually not cost-effective at this profit level (compare_llc_scorp shows the break-even). This one needs a conversation with an Enrolled Agent, not a calculator.`;

    const fields = {
      inputs: { net_profit: profit, profit_driver: driver, profit_driver_meaning: share.label },
      salary_recommendation: 'not calculated - see guidance below',
      guidance: [
        'Reasonable compensation has NO formula and NO safe-harbor percentage in the law; it is measured against the services the owner performs, not against book profit.',
        'A shareholder who performs substantial services and takes distributions while reporting little or no officer salary is a top IRS audit trigger, regardless of the profit for the year.',
        band === 'zero_or_negative'
          ? 'A company can owe reasonable compensation even in a break-even or loss year if the owner works in the business.'
          : 'At this profit level an S election usually does not save enough to justify the payroll and filing cost; the compare_llc_scorp tool shows where the break-even is.',
      ],
      the_real_test: THE_REAL_TEST,
    };

    return output(summary, fields, SOURCE.sCorpElection, CONSULT_NEXT_STEP);
  }

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
    how_this_is_estimated: `Reasonable compensation has NO formula and NO safe-harbor percentage in the law - it is a facts-and-circumstances test (your training, duties, hours, and what the market pays someone to do your job). This range is a STARTING point: ${Math.round(share.low * 100)}-${Math.round(share.high * 100)}% of net profit for a business where ${share.label.toLowerCase()}.`,
    the_real_test: THE_REAL_TEST,
    caveats: [
      'Setting salary too low to reduce payroll tax is one of the top S-corp audit triggers; the IRS can reclassify distributions as wages plus penalties and interest, and courts have upheld that reclassification (David E. Watson, P.C. v. United States, 668 F.3d 1008 (8th Cir. 2012)).',
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
    profit_band: profitBand(args.business_net_profit_usd),
  }),
  run,
};
