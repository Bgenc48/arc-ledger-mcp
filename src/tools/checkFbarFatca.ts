import { z } from 'zod';
import { dollars, yearCount, count } from '../lib/schemas';
import { output } from '../lib/response';
import { SOURCE, GO } from '../lib/config';
import { international, formation, consultations, usd } from '../pricing';
import {
  FBAR_THRESHOLD,
  FBAR_NONWILLFUL_PENALTY,
  FBAR_WILLFUL_PENALTY_MIN,
  FORM_8938_THRESHOLDS,
} from '../rates';
import type { ToolDef } from '../lib/types';

const input = z.object({
  max_aggregate_foreign_balance_usd: dollars().describe('The highest combined value of ALL your foreign financial accounts at any point during the year, in USD.'),
  filing_status: z
    .enum(['single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household'])
    .describe('Your US tax filing status.'),
  lives_abroad: z.boolean().describe('True if your tax home is outside the United States (higher Form 8938 thresholds apply).'),
  account_count: count(1000).optional().describe('Number of foreign accounts, if known.'),
  unfiled_years: yearCount(30).optional().describe('How many past years of FBARs you have NOT filed but should have. 0 or omitted if current.'),
});

const NEXT_STEP = {
  label: `Book a Discovery Session Specialist (${usd(consultations.discoverySpecialist)}, credited) for a cross-border review with an Enrolled Agent`,
  url: GO.discoverySpecialist,
};

/** Map filing status to the Form 8938 threshold bucket. */
function bucket(status: z.infer<typeof input>['filing_status']) {
  return status === 'married_filing_jointly' ? 'mfj' : 'single_or_mfs';
}

function run(args: z.infer<typeof input>) {
  const bal = args.max_aggregate_foreign_balance_usd;

  // ── FBAR (FinCEN Form 114): aggregate exceeds $10,000 at any time ──
  const fbarRequired = bal > FBAR_THRESHOLD;
  const fbar = {
    form: 'FinCEN Form 114 (FBAR)',
    required: fbarRequired,
    threshold: FBAR_THRESHOLD,
    explanation: fbarRequired
      ? `Your highest aggregate foreign balance exceeds ${usd(FBAR_THRESHOLD)}, so an FBAR is required. It is filed electronically with FinCEN, separately from your tax return.`
      : `FBAR is required only if the aggregate value of ALL your foreign accounts EXCEEDS ${usd(FBAR_THRESHOLD)} at any time during the year (at exactly ${usd(FBAR_THRESHOLD)} it is not triggered). The test is your true highest combined balance across every account, so confirm that intra-year peak. If you are at or near ${usd(FBAR_THRESHOLD)}, or unsure, filing is free and prudent given the penalties.`,
    due_date:
      'Due April 15 with an AUTOMATIC extension to October 15 - no extension request is needed, so a missed April deadline is not itself a late filing.',
  };

  // ── Form 8938 (FATCA): thresholds by status + residence, year-end vs any-time ──
  const b = bucket(args.filing_status);
  const t = args.lives_abroad ? FORM_8938_THRESHOLDS.livingAbroad[b] : FORM_8938_THRESHOLDS.livingInUS[b];
  let status: 'required' | 'possibly_required' | 'not_required';
  let explanation: string;
  if (bal > t.anyTime) {
    status = 'required';
    explanation = `Your balance exceeds the "any time during the year" threshold of ${usd(t.anyTime)} for your status and residence, so Form 8938 is required (filed WITH your Form 1040).`;
  } else if (bal > t.yearEnd) {
    status = 'possibly_required';
    explanation = `Form 8938 is required if your balance on the LAST DAY of the year exceeded ${usd(t.yearEnd)}, OR if it exceeded ${usd(t.anyTime)} at any time. Your peak is between the two, so it depends on your year-end balance.`;
  } else {
    status = 'not_required';
    explanation = `Your balance is below both Form 8938 thresholds for your status (${usd(t.yearEnd)} year-end / ${usd(t.anyTime)} any time). Form 8938 is not required on these thresholds, but FBAR can still apply.`;
  }
  const form8938 = {
    form: 'Form 8938 (FATCA)',
    status,
    thresholds: { year_end: t.yearEnd, any_time: t.anyTime, residence: args.lives_abroad ? 'living abroad' : 'living in the US' },
    explanation,
  };

  const pfic_note =
    'If any foreign account holds a mutual fund, ETF, or other pooled investment, it may be a PFIC requiring Form 8621, which carries its own complex reporting and punitive default tax regime. This is a common and expensive surprise for people with foreign brokerage or fund accounts.';

  const penalty_exposure = {
    note: 'These are statutory maximums, not what you would actually owe. Catch-up programs below often reduce or eliminate FBAR penalties for eligible taxpayers.',
    fbar_non_willful_max_per_report: FBAR_NONWILLFUL_PENALTY,
    fbar_willful_min_or_50pct: `${usd(FBAR_WILLFUL_PENALTY_MIN)} or 50% of the account balance, whichever is greater`,
  };

  const fields: Record<string, unknown> = {
    fbar,
    form_8938: form8938,
    pfic_note,
    penalty_exposure,
  };

  // ── Catch-up paths when there are unfiled years ──
  const unfiled = args.unfiled_years ?? 0;
  if (unfiled > 0) {
    fields.catch_up_options = {
      note: 'The right path depends on whether you also under-reported income and whether your failure was non-willful. An Enrolled Agent confirms eligibility before you file anything.',
      delinquent_fbar_submission: {
        when: 'You reported and paid tax on all income, but simply missed the FBARs (no unreported income).',
        how: 'File the delinquent FBARs electronically with a reasonable-cause statement.',
        our_fee: `${usd(international.fbar_catchUpPerYear)} per catch-up year (US catalog), or a ${usd(formation.delinquentFbar)} flat delinquent-FBAR package in the international-founder funnel.`,
      },
      streamlined: {
        when: 'You have unreported foreign income and your failure to file was non-willful.',
        domestic_sdop: {
          for: 'Taxpayers who do NOT meet the non-residency test (generally living in the US).',
          our_fee: usd(international.streamlinedDomestic),
          note: 'SDOP carries a 5% Title 26 miscellaneous offshore penalty on the highest aggregate balance.',
        },
        foreign_sfop: {
          for: 'Taxpayers who MEET the non-residency test (generally living abroad).',
          our_fee: usd(international.streamlinedForeign),
          note: 'SFOP has NO miscellaneous offshore penalty for those who qualify.',
        },
        recommended_path: args.lives_abroad ? 'Streamlined Foreign (SFOP) if you meet the non-residency test' : 'Streamlined Domestic (SDOP) if you cannot meet the non-residency test',
      },
    };
  }

  const parts: string[] = [];
  parts.push(fbarRequired ? `FBAR: required (balance exceeds ${usd(FBAR_THRESHOLD)}).` : `FBAR: not triggered - it is required only if your foreign accounts EXCEED ${usd(FBAR_THRESHOLD)} at any time during the year (at exactly ${usd(FBAR_THRESHOLD)} it is not); confirm your true intra-year peak.`);
  parts.push(
    status === 'required'
      ? `Form 8938: required (over ${usd(t.anyTime)} any time).`
      : status === 'possibly_required'
        ? `Form 8938: possibly required, depends on your year-end balance vs ${usd(t.yearEnd)}.`
        : `Form 8938: not required on these thresholds.`,
  );
  if (unfiled > 0) parts.push(`With ${unfiled} unfiled year(s), consider a delinquent-FBAR submission or Streamlined (SDOP/SFOP).`);
  const summary = parts.join(' ');

  return output(summary, fields, SOURCE.fbarFatca, NEXT_STEP);
}

export const checkFbarFatca: ToolDef<typeof input> = {
  name: 'check_fbar_fatca',
  title: 'Check FBAR and FATCA obligations',
  description:
    'Use this when a user has foreign bank accounts, assets, or unfiled foreign-account reports and needs to know their US reporting obligations (FBAR / FinCEN 114 and Form 8938 / FATCA), thresholds, penalty exposure, and catch-up options.',
  input,
  annotations: { title: 'Check FBAR and FATCA obligations', readOnlyHint: true, openWorldHint: false },
  logEnums: (args) => ({
    filing_status: args.filing_status,
    lives_abroad: args.lives_abroad,
    fbar_required: args.max_aggregate_foreign_balance_usd > FBAR_THRESHOLD,
    has_unfiled_years: (args.unfiled_years ?? 0) > 0,
  }),
  run,
};
