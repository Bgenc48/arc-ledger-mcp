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
const SIMPLE_PLAN_CEILING = 50_000;                // current IRS Simple Payment Plan ceiling for eligible IMF and BMF non-trust-fund accounts
const BUSINESS_TRUST_FUND_SIMPLE_CEILING = 25_000; // current IRS Simple Payment Plan (Business Trust Fund) ceiling
const SHORT_TERM_ONLINE_CEILING = 100_000;          // individual online short-term plan requires a balance below this amount
const SHORT_TERM_PLAN_DAYS = 180;                  // IRS short-term payment plan window (no setup fee)
const CSED_YEARS = 10;                             // Collection Statute Expiration Date - IRS generally has 10 years from assessment to collect (IRC 6502)

const input = z.object({
  balance_owed_usd: dollars().describe(
    'Total amount owed to the IRS including tax, penalties, and interest (a rough figure is fine).',
  ),
  all_required_returns_filed: z
    .boolean()
    .optional()
    .describe(
      'Whether every required tax return has actually been FILED (even if the tax was not paid). Filing compliance is generally required before the IRS formalizes a collection alternative, but the exact account requirements control. Defaults to false.',
    ),
  tax_account_type: z
    .enum([
      'individual_income_tax',
      'business_non_trust_fund_or_out_of_business',
      'business_trust_fund',
      'unknown',
    ])
    .optional()
    .describe(
      'Coarse, nonidentifying IRS account type. individual_income_tax includes Form 1040 income-tax balances, including a sole proprietor whose balance is on Form 1040. business_non_trust_fund_or_out_of_business covers non-trust-fund business tax or an out-of-business sole proprietor account. business_trust_fund covers in-business payroll or other trust-fund tax. Use unknown when unsure. Defaults to unknown.',
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
  const accountType = args.tax_account_type ?? 'unknown';
  const simplePlanCeiling =
    accountType === 'business_trust_fund'
      ? BUSINESS_TRUST_FUND_SIMPLE_CEILING
      : SIMPLE_PLAN_CEILING;
  const withinSimplePlanBalance = balance <= simplePlanCeiling;
  const accountTypeKnown = accountType !== 'unknown';
  const simplePlanName =
    accountType === 'business_trust_fund'
      ? 'Simple Payment Plan (Business Trust Fund)'
      : 'Simple Payment Plan';

  const paths: Path[] = [];

  // 1. Short-term full pay (up to 180 days). The public online threshold is
  // for individual accounts below $100,000; other accounts need confirmation.
  const individualOnlineShortTerm =
    accountType === 'individual_income_tax' &&
    balance < SHORT_TERM_ONLINE_CEILING;
  paths.push({
    path: 'Short-term payment plan',
    fits:
      ability !== 'can_pay_in_full_soon'
        ? 'not_a_fit'
        : individualOnlineShortTerm
          ? 'likely'
          : 'possible',
    what_it_is: `The IRS individual online short-term plan generally covers balances below ${usd(SHORT_TERM_ONLINE_CEILING)} that can be paid in ${SHORT_TERM_PLAN_DAYS} days or less. It has no setup fee, but penalties and interest accrue until paid. Other account types or balances require direct IRS confirmation.`,
    what_is_needed:
      individualOnlineShortTerm
        ? 'All required returns filed, then use the IRS Online Payment Agreement or call the IRS. No Collection Information Statement is generally required.'
        : 'Confirm the account type, balance, filing compliance, and available short-term channel with the IRS before relying on this path.',
  });

  // 2. Installment agreement - current Simple Payment Plan vs. financial-review track.
  // The IRS replaced the former blanket 72-month streamlined calculation. A
  // qualifying simple plan must now full-pay, including accruals, by the CSED.
  const simplePlanFit: Path['fits'] =
    ability === 'cannot_pay_basic_living'
      ? 'not_a_fit'
      : ability === 'can_make_monthly_payments' && accountTypeKnown
        ? 'likely'
        : 'possible';

  const simplePlanDescription =
    accountType === 'individual_income_tax'
      ? `For an eligible individual income-tax account with an unpaid balance of assessment of ${usd(SIMPLE_PLAN_CEILING)} or less, a monthly plan that must fully pay the balance, including accruals, by the Collection Statute Expiration Date. A qualifying plan generally requires no Collection Information Statement or mandatory direct debit.`
      : accountType === 'business_non_trust_fund_or_out_of_business'
        ? `For an eligible non-trust-fund business or out-of-business sole proprietor account with an unpaid balance of assessment of ${usd(SIMPLE_PLAN_CEILING)} or less, a monthly plan that must fully pay the balance, including accruals, by the Collection Statute Expiration Date. A qualifying plan generally requires no Collection Information Statement.`
        : accountType === 'business_trust_fund'
          ? `For an eligible business trust-fund account with an unpaid balance of assessment of ${usd(BUSINESS_TRUST_FUND_SIMPLE_CEILING)} or less, a monthly plan that must fully pay the balance, including accruals, by the Collection Statute Expiration Date. A qualifying plan generally requires no Collection Information Statement, subject to IRS exceptions.`
          : `Current IRS Simple Payment Plan criteria generally use a ${usd(SIMPLE_PLAN_CEILING)} ceiling for eligible individual and non-trust-fund accounts and a ${usd(BUSINESS_TRUST_FUND_SIMPLE_CEILING)} ceiling for eligible business trust-fund accounts. A qualifying plan must fully pay, including accruals, by the Collection Statute Expiration Date and generally requires no Collection Information Statement. Confirm the account type before relying on this screen.`;

  const simplePlanRequirements =
    accountType === 'individual_income_tax'
      ? 'All required returns filed, current payment compliance, and a proposed payment sufficient to full-pay by the CSED. Use the IRS Online Payment Agreement or Form 9465.'
      : accountType === 'unknown'
        ? 'First confirm the IRS account type, unpaid balance of assessment, CSED, and required monthly payment. Individuals may apply online; business accounts use the IRS contact or form channel that applies to the account.'
        : 'All required returns and required current tax deposits or payments must be current, with a proposed payment sufficient to full-pay by the CSED. Business accounts cannot use the individual online application.';

  paths.push({
    path: withinSimplePlanBalance ? simplePlanName : 'Installment agreement with financial review',
    fits: withinSimplePlanBalance ? simplePlanFit : 'possible',
    what_it_is: withinSimplePlanBalance
      ? simplePlanDescription
      : `A monthly plan outside the current Simple Payment Plan balance criteria. The IRS generally reviews income, expenses, and assets to set the payment. A partial-payment agreement may be considered when full payment before the CSED is not feasible.`,
    what_is_needed: withinSimplePlanBalance
      ? simplePlanRequirements
      : 'A Collection Information Statement, generally Form 433-F, 433-A, or 433-B as applicable, plus filing and current-payment compliance.',
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
      'If paying anything would leave you unable to meet basic living expenses, the IRS may temporarily delay collection. Penalties and interest keep accruing, and the IRS may still file a Notice of Federal Tax Lien.',
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
      tax_account_type: accountType,
      ability_to_pay: ability,
      balance_includes_penalties: hasPenalties,
    },
    filing_compliance_gate: filed
      ? 'All required returns filed - that is the precondition for every path below.'
      : 'FIRST STEP: identify and address every required return. The IRS generally requires filing compliance before formalizing a payment plan, Offer in Compromise, or hardship status.',
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
      'Simple Payment Plan eligibility depends on the IRS account type, unpaid balance of assessment, the CSED, and current compliance. Current IRS guidance does not use a blanket 72-month payment calculation.',
      'Keep current-year filings and estimated payments up to date, or the IRS can default an approved agreement.',
    ],
  };

  const recommended =
    !filed
      ? 'file any missing returns first, then choose a path'
      : ability === 'can_pay_in_full_soon'
        ? 'a short-term payment plan is usually the simplest fit'
        : ability === 'can_make_monthly_payments'
          ? withinSimplePlanBalance
            ? accountTypeKnown
              ? `the ${simplePlanName} is the first path to screen, subject to the required payment and CSED`
              : 'a Simple Payment Plan may fit after the account type, required payment, and CSED are confirmed'
            : 'an installment agreement with a financial review'
          : ability === 'can_pay_little'
            ? 'an installment agreement, with an Offer in Compromise worth a fit-check'
            : 'Currently Not Collectible status, with an Offer in Compromise worth a fit-check';

  const summary = `On about ${usd(balance)} owed, ${recommended}. ${
    filed
      ? ''
      : 'Note: the IRS generally requires filing compliance before formalizing a collection alternative. '
  }${
    hasPenalties ? 'Penalty abatement may also shrink the balance itself. ' : ''
  }An Enrolled Agent can pull your transcripts (Form 8821) to confirm the real balance and your options.`;

  return output(summary, fields, SOURCE.resolution, nextStep(filed));
}

export const checkResolutionOptions: ToolDef<typeof input> = {
  name: 'check_resolution_options',
  title: 'Check IRS resolution options',
  description:
    'Use this when someone owes the IRS back taxes and asks how to settle, get on a payment plan, lower what they owe, or stop collection. Screens which IRS paths may fit - short-term payment plan, current Simple Payment Plan or an installment agreement with financial review, Offer in Compromise (a fit-check only, never a promise of acceptance), Currently Not Collectible hardship status, and penalty abatement - and lists the forms needed (9465, 433-F/A/B, 656, 843, 8821, 2848) plus collection-statute context. A coarse tax_account_type improves the screen without identifying the taxpayer. Never guarantees an IRS outcome. Set brief:true for a shorter answer.',
  input,
  annotations: { title: 'Check IRS resolution options', readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  logEnums: (args) => ({
    all_required_returns_filed: args.all_required_returns_filed ?? false,
    tax_account_type: args.tax_account_type ?? 'unknown',
    ability_to_pay: args.ability_to_pay,
    balance_includes_penalties: args.balance_includes_penalties ?? true,
  }),
  run,
};
