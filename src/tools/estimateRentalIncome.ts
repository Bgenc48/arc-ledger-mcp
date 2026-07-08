import { z } from 'zod';
import { dollars, count } from '../lib/schemas';
import { output } from '../lib/response';
import { SOURCE, GO } from '../lib/config';
import { bookkeeping, usd } from '../pricing';
import {
  RESIDENTIAL_DEPRECIATION_YEARS,
  PASSIVE_LOSS_SPECIAL_ALLOWANCE,
  PASSIVE_LOSS_PHASEOUT_START,
  PASSIVE_LOSS_PHASEOUT_END,
  SHORT_TERM_PERSONAL_USE_EXEMPT_DAYS,
  STANDARD_DEDUCTION_SINGLE,
  STANDARD_DEDUCTION_MFJ,
  TAX_BRACKETS_SINGLE,
  TAX_BRACKETS_MFJ,
  calculateFederalTax,
} from '../rates';
import { round0 } from '../lib/tax';
import type { ToolDef } from '../lib/types';

const input = z.object({
  annual_rental_income_usd: dollars().describe('Gross rent received this year, before expenses.'),
  operating_expenses_usd: dollars().optional().describe('Deductible operating expenses: mortgage interest, property tax, insurance, HOA, repairs, management, utilities, supplies. Excludes depreciation (computed for you).'),
  property_purchase_price_usd: dollars().optional().describe('What you paid for the property (building + land). Used to compute straight-line depreciation.'),
  land_percent: count(100).optional().describe('Percent of the purchase price attributable to non-depreciable land (default 20). The building is depreciated over 27.5 years.'),
  other_income_usd: dollars().optional().describe('Your other taxable income (e.g. wages, business) for the year. Sets the marginal rate applied to net rental income, and gates the passive-loss allowance.'),
  filing_status: z.enum(['single', 'married_filing_jointly']).optional().describe('Federal filing status. Defaults to single.'),
  real_estate_professional: z.boolean().optional().describe('Whether you materially participate as a real-estate professional under IRC 469(c)(7). If true, rental losses are not passive-limited.'),
  rental_type: z.enum(['long_term', 'short_term']).optional().describe('long_term (standard residential lease) or short_term (Airbnb/VRBO-style). Defaults to long_term.'),
  personal_use_days: count(366).optional().describe('Days YOU used the property personally (short-term only). Triggers the 14-day tax-free rule when a stay is rented 14 days or fewer and used more personally.'),
  rental_days: count(366).optional().describe('Days the property was rented at fair value (short-term only).'),
});

// Use the published regular monthly rate (not the promo rate) so the cited fee
// is time-independent inside the stateless Worker.
const NEXT_STEP = {
  label: `Have an Enrolled Agent handle your Schedule E - bookkeeping from ${usd(bookkeeping.essentials.regular)}/mo, or a free 15-minute call`,
  url: GO.book15min,
};

const brackets = (status: string) => (status === 'married_filing_jointly' ? TAX_BRACKETS_MFJ : TAX_BRACKETS_SINGLE);
const stdDeduction = (status: string) => (status === 'married_filing_jointly' ? STANDARD_DEDUCTION_MFJ : STANDARD_DEDUCTION_SINGLE);

/** Straight-line depreciation on the building portion (land is not depreciable). */
export function annualDepreciation(purchasePrice: number, landPercent: number): number {
  const building = purchasePrice * (1 - landPercent / 100);
  return building / RESIDENTIAL_DEPRECIATION_YEARS;
}

/** §469(i) special allowance: up to $25k, phased out $1 per $2 of MAGI over $100k, gone at $150k. */
export function passiveLossAllowance(loss: number, magi: number, reProfessional: boolean): number {
  if (loss <= 0) return 0;
  if (reProfessional) return loss;
  if (magi <= PASSIVE_LOSS_PHASEOUT_START) return Math.min(loss, PASSIVE_LOSS_SPECIAL_ALLOWANCE);
  if (magi >= PASSIVE_LOSS_PHASEOUT_END) return 0;
  const reduced = PASSIVE_LOSS_SPECIAL_ALLOWANCE - (magi - PASSIVE_LOSS_PHASEOUT_START) / 2;
  return Math.min(loss, Math.max(0, reduced));
}

/** Marginal federal tax attributable to an added (or subtracted) amount of income. */
function marginalTax(otherIncome: number, delta: number, status: string): number {
  const std = stdDeduction(status);
  const b = brackets(status);
  const withDelta = calculateFederalTax(Math.max(0, otherIncome + delta - std), b);
  const without = calculateFederalTax(Math.max(0, otherIncome - std), b);
  return withDelta - without;
}

function run(args: z.infer<typeof input>) {
  const shortTerm = args.rental_type === 'short_term';
  const status = args.filing_status ?? 'single';
  const gross = args.annual_rental_income_usd;

  // 14-day rule (§280A(g)): income is tax-free only if the unit is rented
  // fewer than 15 days AND used by the taxpayer AS A RESIDENCE. Under
  // §280A(d)(1) a residence means personal use exceeding the greater of 14 days
  // or 10% of rental days; when rented <= 14 days that reduces to "personal use
  // over 14 days". (This is stricter than the website's personal>rental proxy.)
  const personalDays = args.personal_use_days ?? 0;
  const rentalDays = args.rental_days ?? 0;
  const exemptShortStay =
    shortTerm &&
    rentalDays > 0 &&
    rentalDays <= SHORT_TERM_PERSONAL_USE_EXEMPT_DAYS &&
    personalDays > SHORT_TERM_PERSONAL_USE_EXEMPT_DAYS;

  if (exemptShortStay) {
    const fields = {
      rental_type: 'short_term',
      fourteen_day_rule: {
        applies: true,
        explanation: `You rented ${rentalDays} day(s) (14 or fewer) and used the property more personally, so under IRC 280A(g) the rental income is TAX-FREE and you do not report it or deduct rental expenses.`,
      },
      gross_rental_income: gross,
      taxable: 0,
    };
    return output(
      `Under the 14-day rule your ${usd(gross)} of short-term rental income is tax-free and not reported. Keep records showing 14 or fewer rental days.`,
      fields,
      SOURCE.rental,
      NEXT_STEP,
    );
  }

  const landPercent = Math.min(args.land_percent ?? 20, 100);
  const depreciation =
    args.property_purchase_price_usd !== undefined
      ? annualDepreciation(args.property_purchase_price_usd, landPercent)
      : 0;
  const operating = args.operating_expenses_usd ?? 0;
  const totalDeductions = operating + depreciation;
  const netRental = round0(gross - totalDeductions);

  const otherIncome = args.other_income_usd ?? 0;
  const reProfessional = args.real_estate_professional ?? false;

  let taxableRental: number;
  let passiveLossUsed = 0;
  let passiveLossCarryforward = 0;
  if (netRental >= 0) {
    taxableRental = netRental;
  } else {
    const loss = Math.abs(netRental);
    passiveLossUsed = round0(passiveLossAllowance(loss, otherIncome, reProfessional));
    passiveLossCarryforward = round0(loss - passiveLossUsed);
    taxableRental = -passiveLossUsed; // deductible loss reduces other income
  }

  const federalTaxEffect = round0(marginalTax(otherIncome, taxableRental, status));

  const fields = {
    rental_type: shortTerm ? 'short_term' : 'long_term',
    inputs: {
      gross_rental_income: gross,
      operating_expenses: operating,
      filing_status: status,
      real_estate_professional: reProfessional,
    },
    depreciation: {
      annual_depreciation: round0(depreciation),
      basis: args.property_purchase_price_usd !== undefined
        ? `Building portion (${100 - landPercent}% of ${usd(args.property_purchase_price_usd)}) divided over ${RESIDENTIAL_DEPRECIATION_YEARS} years.`
        : 'Not computed - provide property_purchase_price_usd to include depreciation, a major rental deduction.',
      note: 'Depreciation is recaptured at up to 25% when you sell; it lowers tax now but is not free.',
    },
    net_rental_income: netRental,
    is_loss: netRental < 0,
    passive_loss_treatment:
      netRental < 0
        ? {
            deductible_against_other_income_this_year: passiveLossUsed,
            carried_forward: passiveLossCarryforward,
            rule: reProfessional
              ? 'As a real-estate professional your rental losses are not passive-limited and are fully deductible against other income.'
              : `Up to ${usd(PASSIVE_LOSS_SPECIAL_ALLOWANCE)} of rental loss is deductible against other income if you actively participate, phased out between ${usd(PASSIVE_LOSS_PHASEOUT_START)} and ${usd(PASSIVE_LOSS_PHASEOUT_END)} of income. Losses you cannot use carry forward.`,
          }
        : { applies: false, note: 'Net rental income is positive, so passive-loss limits do not apply this year.' },
    estimated_federal_tax_effect: federalTaxEffect,
    estimate_note: 'Federal only, at your marginal rate. State income tax, net investment income tax (3.8%), and QBI are not included.',
    caveats: [
      'Depreciation is mandatory, not optional: gain is recaptured on the depreciation "allowed or allowable" even if you never claimed it.',
      'The passive-loss allowance assumes you actively participate and uses your income as a proxy for MAGI (which has add-backs).',
      ...(shortTerm
        ? [
            'Short-term rentals (average stay of 7 days or fewer) are generally NOT "rental activities" for the $25,000 passive-loss allowance; loss treatment turns on material participation instead. Have this reviewed.',
            'If you provide substantial hotel-like services, a short-term rental is reported on Schedule C and owes self-employment tax, which this estimate does not add.',
          ]
        : []),
    ],
  };

  const summary =
    netRental >= 0
      ? `Estimated net rental income ${usd(netRental)} after ${usd(round0(totalDeductions))} of deductions (including ${usd(round0(depreciation))} depreciation). Federal tax on it is roughly ${usd(federalTaxEffect)} at your marginal rate.`
      : `Your rental shows a ${usd(Math.abs(netRental))} loss after depreciation. About ${usd(passiveLossUsed)} is deductible against other income this year${passiveLossCarryforward > 0 ? ` and ${usd(passiveLossCarryforward)} carries forward` : ''}, cutting federal tax by roughly ${usd(Math.abs(federalTaxEffect))}.`;

  return output(summary, fields, SOURCE.rental, NEXT_STEP);
}

export const estimateRentalIncome: ToolDef<typeof input> = {
  name: 'estimate_rental_income',
  title: 'Estimate rental property taxes',
  description:
    'Use this when someone asks how much tax they owe on rental income (Airbnb/short-term or long-term), or whether a rental loss is deductible. Computes net rental income after operating expenses and straight-line depreciation, the passive-loss allowance and carryforward, the short-term 14-day rule, and the marginal federal tax effect.',
  input,
  annotations: { title: 'Estimate rental property taxes', readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  logEnums: (args) => ({
    rental_type: args.rental_type ?? 'long_term',
    filing_status: args.filing_status ?? 'single',
    re_professional: args.real_estate_professional ?? false,
    has_purchase_price: args.property_purchase_price_usd !== undefined,
  }),
  run,
};
