import { z } from 'zod';
import { dollars, count } from '../lib/schemas';
import { output } from '../lib/response';
import { SOURCE, GO } from '../lib/config';
import { consultations, usd } from '../pricing';
import {
  FAILURE_TO_FILE_RATE,
  FAILURE_TO_FILE_MAX,
  FAILURE_TO_PAY_RATE,
  FAILURE_TO_PAY_MAX,
  FTF_REDUCED_BY_FTP_RATE,
  FTF_MINIMUM_OVER_60_DAYS,
  IRS_UNDERPAYMENT_ANNUAL_RATE,
} from '../rates';
import { round0 } from '../lib/tax';
import type { ToolDef } from '../lib/types';

const input = z.object({
  balance_owed_usd: dollars().describe('The unpaid tax balance (the tax itself, before penalties and interest).'),
  months_late: count(120).describe('Whole months past the deadline. The failure-to-file penalty counts any part of a month as a full month.'),
  return_filed: z
    .boolean()
    .optional()
    .describe('Whether you actually FILED the return (even if you did not pay). If false, the larger 5%/month failure-to-file penalty applies. Defaults to false (not filed).'),
});

const NEXT_STEP = {
  label: `Upload your IRS bill for a ${usd(consultations.irsNoticeReview)} Notice Rescue review - an Enrolled Agent assesses first-time / reasonable-cause abatement and next steps (credited toward resolution)`,
  url: GO.noticeRescue,
};

/**
 * Failure-to-file: 5%/month of unpaid tax, capped at 25% (reached in 5 months).
 * In each month where failure-to-pay also runs, it is reduced by the 0.5% FTP
 * rate (IRC §6651(c)), so the effective rate is 4.5%/month for those months.
 * A return more than 60 days late (~2 months) carries a MINIMUM penalty of the
 * lesser of $525 or 100% of the tax (IRC §6651(a)) - which dominates on small
 * balances, so it is applied as a floor.
 */
function failureToFile(balance: number, months: number): number {
  const grossRate = Math.min(FAILURE_TO_FILE_MAX, months * FAILURE_TO_FILE_RATE); // capped at 25%
  const overlapMonths = Math.min(months, FAILURE_TO_FILE_MAX / FAILURE_TO_FILE_RATE); // first 5 months
  const reduction = overlapMonths * FTF_REDUCED_BY_FTP_RATE;
  const percentagePenalty = balance * Math.max(0, grossRate - reduction);
  const over60DayMinimum = months > 2 ? Math.min(FTF_MINIMUM_OVER_60_DAYS, balance) : 0;
  return Math.max(percentagePenalty, over60DayMinimum);
}

/** Failure-to-pay: 0.5%/month, capped at 25%. */
function failureToPay(balance: number, months: number): number {
  return balance * Math.min(FAILURE_TO_PAY_MAX, months * FAILURE_TO_PAY_RATE);
}

/** Approximate interest: annual rate applied over the months, on the balance. */
function interest(balance: number, months: number): number {
  return balance * IRS_UNDERPAYMENT_ANNUAL_RATE * (months / 12);
}

function run(args: z.infer<typeof input>) {
  const balance = args.balance_owed_usd;
  const months = args.months_late;
  const filed = args.return_filed ?? false;

  const ftf = filed ? 0 : round0(failureToFile(balance, months));
  const ftp = round0(failureToPay(balance, months));
  const int = round0(interest(balance, months));
  const totalPenalty = ftf + ftp;
  const grandTotal = round0(balance + totalPenalty + int);

  const fields = {
    inputs: { balance_owed: balance, months_late: months, return_filed: filed },
    failure_to_file_penalty: ftf,
    failure_to_pay_penalty: ftp,
    estimated_interest: int,
    total_penalties: totalPenalty,
    estimated_total_owed: grandTotal,
    how_it_works: {
      failure_to_file: filed
        ? 'You filed, so the 5%/month failure-to-file penalty does not apply - only failure-to-pay and interest.'
        : 'Failure-to-file is 5% of the unpaid tax per month (any part of a month counts as a full month), capped at 25%. In months where failure-to-pay also runs, it is reduced by 0.5%, so the effective rate is 4.5%/month.',
      failure_to_pay: 'Failure-to-pay is 0.5% of the unpaid tax per month, capped at 25%.',
      interest: `Interest is the federal short-term rate + 3% (about ${Math.round(IRS_UNDERPAYMENT_ANNUAL_RATE * 100)}% recently), compounded daily and RESET QUARTERLY, so this is an approximation.`,
    },
    good_news: 'First-time penalty abatement can remove the failure-to-file and failure-to-pay penalties if you have a clean prior-3-year history. Interest is only removed if the underlying penalty is removed.',
    caveats: [
      'This is an estimate. The exact figures depend on the daily-compounded interest and the precise dates on your notice.',
      `Returns more than 60 days late carry a minimum failure-to-file penalty (the lesser of ${usd(FTF_MINIMUM_OVER_60_DAYS)} or 100% of the tax); this estimate applies that floor.`,
    ],
  };

  const summary = filed
    ? `On a ${usd(balance)} balance ${months} month(s) late (return filed): about ${usd(ftp)} failure-to-pay penalty plus roughly ${usd(int)} interest (approximate: it compounds daily and the rate resets quarterly), for about ${usd(grandTotal)} total. First-time abatement may remove the penalty.`
    : `On a ${usd(balance)} balance ${months} month(s) late (not filed): about ${usd(ftf)} failure-to-file + ${usd(ftp)} failure-to-pay penalties plus roughly ${usd(int)} interest (approximate: it compounds daily and the rate resets quarterly), for about ${usd(grandTotal)} total. File now to stop the 5%/month clock.`;

  return output(summary, fields, SOURCE.resolution, NEXT_STEP);
}

export const estimateIrsPenalty: ToolDef<typeof input> = {
  name: 'estimate_irs_penalty',
  title: 'Estimate IRS penalties and interest',
  description:
    'Use this when someone owes the IRS and asks how much the penalties and interest will be, or what late filing/paying costs. Estimates the failure-to-file (5%/mo) and failure-to-pay (0.5%/mo) penalties and interest on a balance, and explains first-time penalty abatement.',
  input,
  annotations: { title: 'Estimate IRS penalties and interest', readOnlyHint: true, openWorldHint: false },
  logEnums: (args) => ({
    return_filed: args.return_filed ?? false,
    months_late: args.months_late,
  }),
  run,
};
