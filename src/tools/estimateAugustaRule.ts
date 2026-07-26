import { z } from 'zod';
import { dollars, count, clamp } from '../lib/schemas';
import { output } from '../lib/response';
import { SOURCE, GO } from '../lib/config';
import { usd } from '../pricing';
import { AUGUSTA_MAX_DAYS, DEFAULT_MARGINAL_RATE } from '../rates';
import { round0 } from '../lib/tax';
import type { ToolDef } from '../lib/types';

const input = z.object({
  fair_daily_rental_rate_usd: dollars(100_000).describe('The FAIR-MARKET daily rate to rent your home for a comparable business event (e.g. what a hotel meeting room or event space of similar size would charge). Must be supportable with a written quote or comparable.'),
  days_rented: count(365).describe('Total number of days during the year the dwelling is rented to anyone at a fair rental price, including days rented to your business. The IRC 280A(g) income exclusion requires fewer than 15 total rental days and that the dwelling is used as a home.'),
  marginal_tax_rate_pct: z
    .number()
    .finite()
    .optional()
    .describe('Your combined marginal tax rate as a percent (e.g. 24 for 24%, or 33 to include state). Used to translate the deduction into a tax saving. Defaults to 22.'),
});

const NEXT_STEP = {
  label: 'Set up the Augusta strategy with defensible documentation - free 15-minute call with an Enrolled Agent',
  url: GO.book15min,
};

function run(args: z.infer<typeof input>) {
  const rate = args.fair_daily_rental_rate_usd;
  const requestedDays = args.days_rented;
  const marginalRate =
    args.marginal_tax_rate_pct !== undefined ? clamp(args.marginal_tax_rate_pct, 0, 50) / 100 : DEFAULT_MARGINAL_RATE;

  const passesDayCount = requestedDays <= AUGUSTA_MAX_DAYS;
  const enteredRent = round0(rate * requestedDays);
  const potentialTaxEffect = passesDayCount ? round0(enteredRent * marginalRate) : 0;

  const fields = {
    inputs: {
      fair_daily_rate: rate,
      days_requested: requestedDays,
      marginal_tax_rate: `${Math.round(marginalRate * 100)}%`,
    },
    day_count_screen: {
      passes: passesDayCount,
      total_rental_days_entered: requestedDays,
      threshold: `Fewer than 15 total rental days, or no more than ${AUGUSTA_MAX_DAYS}.`,
      limitation:
        'Passing the day-count screen does not establish the exclusion or a business deduction. The dwelling must be used as a home, and the business payment must separately be ordinary, necessary, and reasonable.',
    },
    entered_rent_amount: enteredRent,
    potential_business_rent_expense: enteredRent,
    potential_owner_income_exclusion: passesDayCount ? enteredRent : 0,
    estimated_potential_income_tax_effect: potentialTaxEffect,
    how_it_works:
      'IRC 280A(g) can exclude rent received when a dwelling unit is used as a home and is rented for fewer than 15 total days during the tax year. That owner-side exclusion does not by itself establish the business-side deduction.',
    requirements_to_review: [
      `Count every day the dwelling is rented to anyone at a fair rental price, not only days rented to the business. The section 280A(g) screen allows no more than ${AUGUSTA_MAX_DAYS}.`,
      'Confirm the dwelling meets the tax definition of used as a home for the year.',
      'Support the rate with comparable, similar venues and do not use unreasonable related-party rent.',
      'Establish that each business use is ordinary and necessary under the business expense rules.',
      'Keep a written agreement, agenda, attendance record, proof of use, comparable-rate evidence, and proof of actual payment.',
      'A sole proprietor cannot create a deductible rent payment by renting property to the same sole proprietorship.',
    ],
    caveats: [
      'This is a day-count and arithmetic screen only. It does not decide whether the dwelling is used as a home, whether the business expense is deductible, or whether the entered rate is reasonable.',
      'The potential income-tax effect uses the marginal rate entered, or a 22% default, and does not model the full return.',
      'At 15 or more total rental days, section 280A(g) does not provide the owner-side income exclusion. Other rental reporting rules then apply.',
      'Related-party rent and poorly documented business use receive close factual scrutiny. Obtain qualified review before reporting the transaction.',
    ],
    official_sources: [
      'https://www.irs.gov/publications/p527',
      'https://www.irs.gov/publications/p334',
    ],
  };

  const summary = passesDayCount
    ? `The entered ${requestedDays}-day amount is ${usd(enteredRent)}. It passes only the fewer-than-15-days screen under IRC 280A(g). The owner-side exclusion still depends on the dwelling being used as a home, and any business deduction separately depends on ordinary and necessary use plus reasonable rent. The potential income-tax effect is about ${usd(potentialTaxEffect)} at a ${Math.round(marginalRate * 100)}% rate if both treatments apply.`
    : `The entered ${requestedDays} total rental days exceed the fewer-than-15-days screen, so IRC 280A(g) does not provide the owner-side income exclusion. The ${usd(enteredRent)} payment requires normal rental-income reporting, and any business deduction separately depends on ordinary and necessary use plus reasonable rent.`;

  return output(summary, fields, SOURCE.taxPlanning, NEXT_STEP);
}

export const estimateAugustaRule: ToolDef<typeof input> = {
  name: 'estimate_augusta_rule',
  title: 'Screen the 14-day home-rental rule',
  description:
    'Use this when a business owner asks about the "Augusta rule," renting a home to a related business, or the fewer-than-15-day rental-income exclusion in IRC 280A(g). Screens the total rental-day limit and calculates conditional amounts while keeping the owner-side exclusion separate from the business-side deduction requirements.',
  input,
  annotations: { title: 'Screen the 14-day home-rental rule', readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  logEnums: (args) => ({
    within_limit: args.days_rented <= AUGUSTA_MAX_DAYS,
    has_marginal_rate: args.marginal_tax_rate_pct !== undefined,
  }),
  run,
};
