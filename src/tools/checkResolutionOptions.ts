import { z } from 'zod';
import { dollars } from '../lib/schemas';
import { output } from '../lib/response';
import { SOURCE, GO } from '../lib/config';
import { usd } from '../pricing';
import { OIC_APPLICATION_FEE } from '../rates';
import type { NextStep, ToolDef } from '../lib/types';

/*
 * IRS PROGRAM THRESHOLDS AND STATUTES - not service prices (those live in
 * pricing.ts). These are tax-law figures, kept as literals like the penalty
 * rates in estimateIrsPenalty.ts.
 */
const STREAMLINED_IA_CEILING = 50_000; // balance at/under which a streamlined installment agreement needs no financial-disclosure statement
const SHORT_TERM_PLAN_DAYS = 180;      // IRS short-term payment plan window (no setup fee)
const CSED_YEARS = 10;                 // Collection Statute Expiration Date - IRS generally has 10 years from assessment to collect (IRC 6502)

const input = z.object({
  balance_owed_usd: dollars().describe(
    'Total amount owed to the IRS including tax, penalties, and interest (a rough figure is fine).',
  ),
  all_required_returns_filed: z
    .boolean()
    .optional()
    .describe(
      'Whether every required tax return has actually been FILED (even if the tax was not paid). The IRS will not approve any installment agreement, Offer in Compromise, or hardship status until you are filing-compliant. Defaults to false.',
    ),
  ability_to_pay: z
    .enum([
      'can_pay_in_full_soon',
      'can_make_monthly_payments',
      'can_pay_little',
      'cannot_pay_basic_living',
    ])
    .describe(
      'Your realistic ability to pay. can_pay_in_full_soon = you can clear the balance within about 120-180 days; can_make_monthly_payments = a monthly amount but not in full; can_pay_little = only a very small monthly amount; cannot_pay_basic_living = paying the IRS would leave you unable to cover basic living expenses (financial hardship).',
    ),
  balance_includes_penalties: z
    .boolean()
    .optional()
    .describe(
      'Whether the balance includes failure-to-file or failure-to-pay penalties, so penalty abatement may reduce it. Defaults to true.',
    ),
  brief: z
    .boolean()
    .optional()
    .describe('Set true for a shorter answer: options come back as path + fit only, without the descriptions.'),
});

/**
 * Handoff follows the actual blocking step. No prices in labels - published
 * fee ranges live in get_fee_quote and on the site (directory anti-upsell
 * rules on both ChatGPT and Claude).
 */
function nextStep(filed: boolean): NextStep {
  return filed
    ? {
        label: 'Have an Enrolled Agent pull your IRS transcripts (Form 8821) and map your options - free 15-minute call',
        url: GO.book15min,
      }
    : {
        label: 'First step: get the missing returns filed. An Enrolled Agent can prepare them and then map your options - free 15-minute call',
        url: GO.book15min,
      };
}

type Path = {
  path: string;
  fits: 'likely' | 'possible' | 'not_a_fit';
  what_it_is: string;
  what_is_needed: string;
};

function run(args: z.infer<typeof input>) {
  const balance = args.balance_owed_usd;
  const filed = args.all_required_returns_filed ?? false;
  const hasPenalties = args.balance_includes_penalties ?? true;
  const ability = args.ability_to_pay;
  const streamlined = balance <= STREAMLINED_IA_CEILING;

  const paths: Path[] = [];

  // 1. Short-term full pay (up to 180 days) - only when they can clear it soon.
  paths.push({
    path: 'Short-term payment plan',
    fits: ability === 'can_pay_in_full_soon' ? 'likely' : 'not_a_fit',
    what_it_is: `Pay in full within ${SHORT_TERM_PLAN_DAYS} days. No setup fee; penalties and interest accrue until paid.`,
    what_is_needed: 'Set up online or by phone once all returns are filed. No financial-disclosure form.',
  });

  // 2. Installment agreement - streamlined vs. financial-disclosure track.
  paths.push({
    path: streamlined ? 'Streamlined installment agreement' : 'Installment agreement (with financial disclosure)',
    fits: ability === 'can_make_monthly_payments' || ability === 'can_pay_little' ? 'likely' : 'possible',
    what_it_is: streamlined
      ? `A monthly plan for balances of ${usd(STREAMLINED_IA_CEILING)} or less, generally paid within 72 months. No detailed financial disclosure.`
      : `A monthly plan for balances above ${usd(STREAMLINED_IA_CEILING)}. The IRS reviews income, expenses, and assets to set the payment; can be partial-pay if the statute runs out first.`,
    what_is_needed: streamlined
      ? 'Form 9465 (or the IRS online application) and all returns filed.'
      : 'Form 433-F or 433-A collection information statement, plus all returns filed.',
  });

  // 3. Offer in Compromise - a FIT-CHECK only. Never a promise of acceptance.
  const oicFit = ability === 'can_pay_little' || ability === 'cannot_pay_basic_living' ? 'possible' : 'not_a_fit';
  paths.push({
    path: 'Offer in Compromise (fit-check only)',
    fits: oicFit,
    what_it_is:
      'Settling for less than the full balance when your realistic ability to pay over the remaining collection period is below what you owe. The IRS evaluates your full financial picture and accepts only a portion of offers; this is a screen for whether it is worth pursuing, NOT a prediction or promise that an offer will be accepted.',
    what_is_needed: `Form 656 plus Form 433-A(OIC)/433-B(OIC), a ${usd(OIC_APPLICATION_FEE)} application fee and an initial payment (both waived if you qualify for the low-income certification), and full filing compliance.`,
  });

  // 4. Currently Not Collectible - hardship pause.
  paths.push({
    path: 'Currently Not Collectible (hardship)',
    fits: ability === 'cannot_pay_basic_living' ? 'likely' : 'not_a_fit',
    what_it_is:
      'If paying anything would leave you unable to meet basic living expenses, the IRS can pause active collection. Penalties and interest keep accruing, but levies stop while it is in place.',
    what_is_needed: 'Form 433-F collection information statement showing income and necessary expenses.',
  });

  // 5. Penalty abatement - a parallel path that shrinks the balance itself.
  if (hasPenalties) {
    paths.push({
      path: 'Penalty abatement',
      fits: 'possible',
      what_it_is:
        'First-time abatement (clean prior 3-year history) or reasonable-cause abatement can remove failure-to-file and failure-to-pay penalties. Interest is removed only if the underlying penalty is removed.',
      what_is_needed: 'Requested by phone or on Form 843, with the reasonable-cause facts documented.',
    });
  }

  const options = args.brief ? paths.map(({ path, fits }) => ({ path, fits })) : paths;

  const fields = {
    inputs: {
      balance_owed: balance,
      all_required_returns_filed: filed,
      ability_to_pay: ability,
      balance_includes_penalties: hasPenalties,
    },
    filing_compliance_gate: filed
      ? 'All required returns filed - that is the precondition for every path below.'
      : 'FIRST STEP: the IRS will not approve any installment agreement, Offer in Compromise, or hardship status until all required returns are filed.',
    options,
    ...(args.brief
      ? {}
      : {
          representation_note:
            'Form 8821 lets an Enrolled Agent pull your IRS transcripts to see the real balance and deadlines; Form 2848 (Power of Attorney) lets the Enrolled Agent negotiate with the IRS on your behalf.',
          collection_statute_context: `The IRS generally has ${CSED_YEARS} years from assessment to collect (the Collection Statute Expiration Date, IRC 6502). Some resolution steps pause or extend that clock; your actual dates are on your transcripts.`,
          fee_context: 'Published fee ranges for professional help with any of these paths: use the get_fee_quote tool or see the pricing page.',
        }),
    caveats: [
      'This screens which IRS paths may fit; it does not apply for anything or guarantee the IRS will accept any particular resolution.',
      'Keep current-year filings and estimated payments up to date, or the IRS can default an approved agreement.',
    ],
  };

  const recommended =
    !filed
      ? 'file any missing returns first, then choose a path'
      : ability === 'can_pay_in_full_soon'
        ? 'a short-term payment plan is usually the simplest fit'
        : ability === 'can_make_monthly_payments'
          ? streamlined
            ? 'a streamlined installment agreement is usually the simplest fit'
            : 'an installment agreement with a financial-disclosure review'
          : ability === 'can_pay_little'
            ? 'an installment agreement, with an Offer in Compromise worth a fit-check'
            : 'Currently Not Collectible status, with an Offer in Compromise worth a fit-check';

  const summary = `On about ${usd(balance)} owed, ${recommended}. ${
    filed
      ? ''
      : 'Note: the IRS requires all returns filed before it approves any resolution. '
  }${
    hasPenalties ? 'Penalty abatement may also shrink the balance itself. ' : ''
  }An Enrolled Agent can pull your transcripts (Form 8821) to confirm the real balance and your options.`;

  return output(summary, fields, SOURCE.resolution, nextStep(filed));
}

export const checkResolutionOptions: ToolDef<typeof input> = {
  name: 'check_resolution_options',
  title: 'Check IRS resolution options',
  description:
    'Use this when someone owes the IRS back taxes and asks how to settle, get on a payment plan, lower what they owe, or stop collection. Screens which IRS paths may fit - short-term payment plan, streamlined or financial-disclosure installment agreement, Offer in Compromise (a fit-check only, never a promise of acceptance), Currently Not Collectible hardship status, and penalty abatement - and lists the forms needed (9465, 433-F/A, 656, 843, 8821, 2848) plus collection-statute context. Never guarantees an IRS outcome. Set brief:true for a shorter answer.',
  input,
  annotations: { title: 'Check IRS resolution options', readOnlyHint: true, openWorldHint: false },
  logEnums: (args) => ({
    all_required_returns_filed: args.all_required_returns_filed ?? false,
    ability_to_pay: args.ability_to_pay,
    balance_includes_penalties: args.balance_includes_penalties ?? true,
  }),
  run,
};
