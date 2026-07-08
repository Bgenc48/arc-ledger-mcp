import { z } from 'zod';
import { dollars, count, clamp } from '../lib/schemas';
import { output } from '../lib/response';
import { SOURCE, GO } from '../lib/config';
import { taxPlanning, usd } from '../pricing';
import { AUGUSTA_MAX_DAYS, DEFAULT_MARGINAL_RATE } from '../rates';
import { round0 } from '../lib/tax';
import type { ToolDef } from '../lib/types';

const input = z.object({
  fair_daily_rental_rate_usd: dollars(100_000).describe('The FAIR-MARKET daily rate to rent your home for a comparable business event (e.g. what a hotel meeting room or event space of similar size would charge). Must be supportable with a written quote or comparable.'),
  days_rented: count(365).describe('Number of days per year you rent your home to your business. The tax-free treatment ONLY applies at 14 days or fewer.'),
  marginal_tax_rate_pct: z
    .number()
    .finite()
    .optional()
    .describe('Your combined marginal tax rate as a percent (e.g. 24 for 24%, or 33 to include state). Used to translate the deduction into a tax saving. Defaults to 22.'),
});

const NEXT_STEP = {
  label: `Set up the Augusta strategy correctly with a tax-planning snapshot (${usd(taxPlanning.snapshot)})`,
  url: GO.book15min,
};

function run(args: z.infer<typeof input>) {
  const rate = args.fair_daily_rental_rate_usd;
  const requestedDays = args.days_rented;
  const marginalRate =
    args.marginal_tax_rate_pct !== undefined ? clamp(args.marginal_tax_rate_pct, 0, 50) / 100 : DEFAULT_MARGINAL_RATE;

  const qualifies = requestedDays <= AUGUSTA_MAX_DAYS;
  // Only the first 14 days can ever be tax-free; past that the whole arrangement
  // fails 280A(g) and the rental income becomes taxable.
  const eligibleDays = Math.min(requestedDays, AUGUSTA_MAX_DAYS);
  const annualDeduction = round0(rate * eligibleDays);
  const taxSaving = round0(annualDeduction * marginalRate);

  const fields = {
    inputs: {
      fair_daily_rate: rate,
      days_requested: requestedDays,
      marginal_tax_rate: `${Math.round(marginalRate * 100)}%`,
    },
    qualifies_for_exclusion: qualifies,
    eligible_days: eligibleDays,
    business_deduction: annualDeduction,
    tax_free_to_you: qualifies ? annualDeduction : 0,
    estimated_tax_saving: qualifies ? taxSaving : 0,
    how_it_works:
      'IRC 280A(g), the "Augusta rule": if you rent your personal residence to your own business for 14 days or fewer in a year, the business deducts the rent as a legitimate expense and you exclude that rent from your personal income entirely - it is tax-free to you.',
    the_15th_day_trap: qualifies
      ? `You are at ${requestedDays} day(s), within the ${AUGUSTA_MAX_DAYS}-day limit.`
      : `You entered ${requestedDays} days. At 15 days or more the exclusion is LOST and ALL of the rental income becomes taxable to you. Keep it to ${AUGUSTA_MAX_DAYS} days or fewer.`,
    requirements_to_make_it_stick: [
      `Keep it to ${AUGUSTA_MAX_DAYS} rental days per year or fewer.`,
      'The rate must be FAIR MARKET value - get a written quote from a comparable venue (hotel meeting room, event space) and keep it.',
      'There must be a genuine business purpose for each day (board meeting, strategy session, team offsite), with an agenda and minutes.',
      'The business should have a written rental agreement with you and actually pay you (a real transfer, documented).',
      'This fits a corporation or S-corp renting from the owner; a sole proprietor renting to themselves does not work (you cannot rent to yourself).',
    ],
    caveats: [
      'This estimates the income-tax benefit only, using the marginal rate you provided (or a 22% default). It does not model your full return.',
      'Aggressive or undocumented Augusta deductions are challenged; the fair-market rate and business-purpose documentation are what make it defensible.',
    ],
  };

  const summary = qualifies
    ? `Renting your home to your business ${eligibleDays} day(s) at ${usd(rate)}/day is about ${usd(annualDeduction)} the business deducts and you receive TAX-FREE under the Augusta rule (IRC 280A(g)) - roughly ${usd(taxSaving)} in tax saved at a ${Math.round(marginalRate * 100)}% rate. Keep it to ${AUGUSTA_MAX_DAYS} days and document a fair rate plus a real business purpose.`
    : `At ${requestedDays} days you EXCEED the ${AUGUSTA_MAX_DAYS}-day Augusta-rule limit, so the whole rent would become taxable. Keep it to ${AUGUSTA_MAX_DAYS} days or fewer: ${eligibleDays} days at ${usd(rate)}/day would be about ${usd(annualDeduction)} deductible and tax-free.`;

  return output(summary, fields, SOURCE.taxPlanning, NEXT_STEP);
}

export const estimateAugustaRule: ToolDef<typeof input> = {
  name: 'estimate_augusta_rule',
  title: 'Estimate the Augusta rule (home rental to your business)',
  description:
    'Use this when a business owner asks about the "Augusta rule," renting their home to their own S-corp or C-corp, or the 14-day tax-free home rental (IRC 280A(g)). Given a fair daily rate and number of days, estimates the business deduction and tax-free income, warns about the 14-day limit, and lists the documentation needed to make it defensible.',
  input,
  annotations: { title: 'Estimate the Augusta rule', readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  logEnums: (args) => ({
    within_limit: args.days_rented <= AUGUSTA_MAX_DAYS,
    has_marginal_rate: args.marginal_tax_rate_pct !== undefined,
  }),
  run,
};
