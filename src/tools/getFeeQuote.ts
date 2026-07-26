import { z } from 'zod';
import { count, yearCount } from '../lib/schemas';
import { output } from '../lib/response';
import { SOURCE, GO } from '../lib/config';
import {
  taxReturns,
  modifiers,
  international,
  bookkeeping,
  bookkeepingPrice,
  resolution,
  formation,
  consultations,
  terms,
  bundles,
  usd,
  usdRange,
} from '../pricing';
import { INFO_RETURN_PENALTIES } from '../rates';
import type { ToolDef, NextStep } from '../lib/types';

const details = z
  .object({
    states: count(50).optional().describe('Number of states to file BEYOND the first (each additional state).'),
    rentals: count(50).optional().describe('Number of rental properties (Schedule E).'),
    k1s: count(100).optional().describe('Number of K-1s received (individual) or issued (business).'),
    crypto_txn_count: count(1_000_000).optional().describe('Approximate number of crypto transactions.'),
    foreign_accounts: count(1000).optional().describe('Number of foreign financial accounts (triggers FBAR/FATCA and cross-border scoping).'),
    entity_type: z.enum(['s_corp', 'partnership', 'c_corp', 'llc', 'sole_prop']).optional().describe('Entity type for a business return or formation.'),
    unfiled_years: yearCount(30).optional().describe('Number of past-due / unfiled years (triggers multi-year scoping).'),
  })
  .optional();

const input = z.object({
  service: z
    .enum(['individual_return', 'business_return', 'formation', 'bookkeeping', 'resolution', 'international_form', 'other'])
    .describe('The kind of work you want priced.'),
  details,
});

type Details = NonNullable<z.infer<typeof details>>;

interface Line {
  item: string;
  amount: number | string;
}

interface Built {
  lines: Line[];
  from: number; // itemized subtotal (the "starting at" figure)
  included: string[];
  crossBorder: boolean;
  multiYear: boolean;
  extra?: string[];
}

const cryptoFee = (n: number): number =>
  n <= 0 ? 0 : n <= 50 ? modifiers.crypto.upTo50 : n <= 500 ? modifiers.crypto.from50to500 : modifiers.crypto.over500_from;

function buildIndividual(d: Details): Built {
  const lines: Line[] = [{ item: 'Form 1040 base return (federal, e-file, one state)', amount: taxReturns.form1040 }];
  let from: number = taxReturns.form1040;
  if (d.states) { lines.push({ item: `${d.states} additional state(s)`, amount: modifiers.additionalState * d.states }); from += modifiers.additionalState * d.states; }
  if (d.rentals) { lines.push({ item: `${d.rentals} rental property Schedule E`, amount: modifiers.rentalScheduleE * d.rentals }); from += modifiers.rentalScheduleE * d.rentals; }
  if (d.k1s) { lines.push({ item: `${d.k1s} K-1(s)`, amount: modifiers.k1Received * d.k1s }); from += modifiers.k1Received * d.k1s; }
  if (d.crypto_txn_count) { const c = cryptoFee(d.crypto_txn_count); lines.push({ item: 'Crypto transaction reporting', amount: c }); from += c; }
  const crossBorder = (d.foreign_accounts ?? 0) > 0;
  if (crossBorder) {
    lines.push({ item: 'FBAR (first year)', amount: international.fbar_firstYear });
    lines.push({ item: 'Form 8938 (FATCA)', amount: international.form8938_fatca });
    from += international.fbar_firstYear + international.form8938_fatca;
  }
  return {
    lines,
    from,
    included: ['Federal Form 1040 and e-file', 'One state return', 'Standard review and support during the season'],
    crossBorder,
    multiYear: (d.unfiled_years ?? 0) > 0,
  };
}

function buildBusiness(d: Details): Built {
  const isC = d.entity_type === 'c_corp';
  const base = isC ? taxReturns.cCorp1120 : taxReturns.sCorp1120S_or_1065;
  const lines: Line[] = [{ item: isC ? 'Form 1120 (C-corp) return' : 'Form 1120-S / 1065 return (up to 2 K-1s, CA 100S/565, reasonable-comp memo)', amount: base }];
  let from: number = base;
  if (d.k1s && d.k1s > 2 && !isC) { const extra = modifiers.k1IssuedOver2 * (d.k1s - 2); lines.push({ item: `${d.k1s - 2} K-1(s) beyond the 2 included`, amount: extra }); from += extra; }
  if (d.states) { lines.push({ item: `${d.states} additional state(s)`, amount: modifiers.additionalState * d.states }); from += modifiers.additionalState * d.states; }
  return {
    lines,
    from,
    included: isC ? ['Federal Form 1120', 'Standard federal + CA filing'] : ['Federal Form 1120-S or 1065', 'Up to 2 K-1s issued', 'CA Form 100S / 565', 'S-corp reasonable-compensation memo'],
    crossBorder: (d.foreign_accounts ?? 0) > 0,
    multiYear: (d.unfiled_years ?? 0) > 0,
  };
}

function buildFormation(d: Details): Built {
  const lines: Line[] = [{ item: 'US company formation - Starter tier (from)', amount: formation.starter }];
  let from: number = formation.starter;
  const extra: string[] = [
    `Higher tiers: E-commerce ${usd(formation.ecommerce)}, Business ${usd(formation.business)}/yr, Investor ${usd(formation.investor)}/yr.`,
    `Non-US founders: a foreign-owned single-member US LLC files Form 5472 every year, and the penalty for a missed filing is ${usd(INFO_RETURN_PENALTIES.form5472)} per form per year. Use the deadline_calendar tool for the exact dates.`,
  ];
  if (d.foreign_accounts !== undefined || d.entity_type) {
    lines.push({ item: 'ITIN via W-7 (optional add-on)', amount: formation.itinW7 });
    lines.push({ item: 'S-corp election Form 2553 (optional add-on)', amount: formation.sCorpElection2553 });
  }
  return {
    lines,
    from,
    included: ['State filing and registered agent (first year)', 'EIN application', 'Operating agreement / bylaws', 'BOIR guidance where applicable'],
    crossBorder: false,
    multiYear: false,
    extra,
  };
}

function buildBookkeeping(): Built {
  const essentials = bookkeepingPrice(bookkeeping.essentials);
  const growth = bookkeepingPrice(bookkeeping.growth);
  return {
    lines: [
      { item: `Essentials (${bookkeeping.essentials.volume})`, amount: `${usd(essentials)}/mo` },
      { item: `Growth (${bookkeeping.growth.volume})`, amount: `${usd(growth)}/mo` },
      { item: 'Enterprise (300+ txns / multi-entity)', amount: 'custom quote' },
    ],
    from: essentials,
    included: ['Monthly categorization and reconciliation', 'Financial statements', 'Annual prepay: 10% off and first Form 1099 filed free'],
    crossBorder: false,
    multiYear: false,
    extra: [`Monthly, billed as a plan. Range shown is Essentials to Growth (${usdRange(essentials, growth)}/mo).`],
  };
}

function buildResolution(d: Details): Built {
  const multiYear = (d.unfiled_years ?? 0) > 0;
  const lines: Line[] = [
    { item: 'Single IRS notice review (Enrolled Agent, credited)', amount: consultations.irsNoticeReview },
    { item: 'Notice response, one issue', amount: `${usd(resolution.noticeResponseOneIssue_low)} - ${usd(resolution.noticeResponseOneIssue_high)}` },
    { item: 'First-time penalty abatement (from)', amount: resolution.penaltyAbatementFirstTime_from },
    { item: 'Simple installment agreement (from)', amount: resolution.installmentAgreementSimple_from },
    { item: 'Full IRS representation / multi-year (from)', amount: resolution.irsRepresentationResolution_from },
  ];
  return {
    lines,
    from: multiYear ? resolution.irsRepresentationResolution_from : consultations.irsNoticeReview,
    included: ['Transcript and notice review', 'A clear written next step', 'Fee credited toward representation if you engage'],
    crossBorder: false,
    multiYear,
  };
}

function buildInternational(d: Details): Built {
  const streamlined = d.foreign_accounts !== undefined || (d.unfiled_years ?? 0) > 0;
  const lines: Line[] = [
    { item: 'ITIN application (Form W-7) prepared by an Enrolled Agent', amount: international.itinCAA },
    { item: 'FBAR (first year)', amount: international.fbar_firstYear },
    { item: 'Form 8938 (FATCA)', amount: international.form8938_fatca },
    { item: 'Form 5471 / 5472 (from)', amount: `${usd(international.form5471_base)} / ${usd(international.form5472_base)}` },
  ];
  let from: number = international.itinCAA;
  if (streamlined) {
    lines.push({ item: 'Streamlined Domestic (SDOP)', amount: international.streamlinedDomestic });
    lines.push({ item: 'Streamlined Foreign (SFOP)', amount: international.streamlinedForeign });
    from = international.streamlinedDomestic;
  }
  return {
    lines,
    from,
    included: ['Cross-border scoping', 'The specific international forms your facts require'],
    crossBorder: true,
    multiYear: (d.unfiled_years ?? 0) > 0,
    extra: [
      `Context on stakes: a missed Form 5472 carries a ${usd(INFO_RETURN_PENALTIES.form5472)} penalty per form per year - the preparation fee in the line items above is a small fraction of one missed filing.`,
    ],
  };
}

function buildOther(): Built {
  return {
    lines: [{ item: 'Scoped after a short conversation', amount: 'quote' }],
    from: consultations.discoverySession_from,
    included: ['A scoped, written quote after we understand your situation'],
    crossBorder: false,
    multiYear: false,
  };
}

function chooseNextStep(crossBorder: boolean, multiYear: boolean): { next: NextStep; complexity: string } {
  if (crossBorder) {
    return {
      next: { label: `Book a Discovery Session Specialist (${usd(consultations.discoverySpecialist)}, credited) - cross-border work routes here`, url: GO.discoverySpecialist },
      complexity: 'cross-border - routed to the Discovery Session Specialist per firm quoting rules',
    };
  }
  if (multiYear) {
    return {
      next: { label: `Book a Discovery Session (${usd(consultations.discoverySession_from)}, credited) - multi-year work is scoped here`, url: GO.discoveryStandard },
      complexity: 'multi-year - routed to a Discovery Session',
    };
  }
  return {
    next: { label: 'Book a free 15-minute call to confirm the quote', url: GO.book15min },
    complexity: 'standard - a free 15-minute call is enough to confirm scope',
  };
}

function run(args: z.infer<typeof input>) {
  const d: Details = args.details ?? {};
  const built =
    args.service === 'individual_return' ? buildIndividual(d)
    : args.service === 'business_return' ? buildBusiness(d)
    : args.service === 'formation' ? buildFormation(d)
    : args.service === 'bookkeeping' ? buildBookkeeping()
    : args.service === 'resolution' ? buildResolution(d)
    : args.service === 'international_form' ? buildInternational(d)
    : buildOther();

  // Range: itemized "from" to a soft scoping ceiling (final fee set in the engagement letter).
  const to = Math.max(Math.round(built.from * 1.35), built.from + 150);
  const { next, complexity } = chooseNextStep(built.crossBorder, built.multiYear);

  const fields = {
    service: args.service,
    estimated_range: usdRange(built.from, to),
    range_low: built.from,
    range_high: to,
    quoting_rule: 'Every quote is a range until the engagement letter. The final fee is set after a document review; the upper bound is a soft ceiling for added complexity.',
    line_items: built.lines,
    whats_included: built.included,
    engagement_fee: `A ${usdRange(terms.engagementFee_min, terms.engagementFee_max)} engagement deposit reserves the work and is credited in full to your final invoice.`,
    savings_notes: [
      `Early filing: ${terms.earlyFilingDiscountPct}% off returns when complete documents arrive before Feb 28.`,
      `New Business Starter bundle (EIN + S-corp election + setup): ${usd(bundles.newBusinessStarter.price)}.`,
    ],
    complexity_routing: complexity,
    ...(built.extra ? { notes: built.extra } : {}),
  };

  const summary =
    `${args.service.replace(/_/g, ' ')}: estimated ${usdRange(built.from, to)} (a range until the engagement letter; final fee scoped after a document review). ` +
    `Engagement deposit ${usdRange(terms.engagementFee_min, terms.engagementFee_max)}, credited in full. ` +
    `${complexity}.`;

  return output(summary, fields, SOURCE.pricing, next);
}

export const getFeeQuote: ToolDef<typeof input> = {
  name: 'get_fee_quote',
  title: 'Get a fixed-fee quote',
  description:
    'Use this when a user asks what Arc & Ledger charges, or wants a price estimate for tax preparation, bookkeeping, business formation, or IRS help. Returns a published price range and line items, never a single committed number, plus what is included and the next step by complexity.',
  input,
  annotations: { title: 'Get a fixed-fee quote', readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  logEnums: (args) => ({
    service: args.service,
    cross_border: (args.details?.foreign_accounts ?? 0) > 0 || args.service === 'international_form',
    multi_year: (args.details?.unfiled_years ?? 0) > 0,
  }),
  run,
};
