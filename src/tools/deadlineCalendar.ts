import { z } from 'zod';
import { output } from '../lib/response';
import { SOURCE, GO } from '../lib/config';
import { usd } from '../pricing';
import {
  FILING_DEADLINES,
  INFO_RETURN_PENALTIES,
  FBAR_THRESHOLD,
  CA_FRANCHISE_TAX_MINIMUM,
  TAX_YEAR,
} from '../rates';
import { todayUtc, parseIsoDate, humanDate, daysBetween, toIso, rollToBusinessDay } from '../lib/dates';
import type { ToolDef } from '../lib/types';

const input = z.object({
  entity_type: z
    .enum(['foreign_owned_llc', 'foreign_owned_c_corp', 'multi_member_llc', 's_corp', 'nonresident_individual'])
    .describe('Your US tax entity. foreign_owned_llc = a SINGLE-MEMBER US LLC owned by a non-US person (files pro-forma 1120 + 5472); a multi-member foreign-owned LLC is a partnership, use multi_member_llc. foreign_owned_c_corp = a US C-corp with foreign owners. nonresident_individual = a person filing Form 1040-NR.'),
  filing_year: z
    .number()
    .int()
    .min(2020)
    .max(2100)
    .optional()
    .describe('The tax year whose deadlines you want (the year being reported). Defaults to the prior calendar year.'),
  has_us_source_wages: z
    .boolean()
    .optional()
    .describe('Nonresident individuals only: whether you had US wages subject to withholding. Determines the 1040-NR due date (April 15 if yes, June 15 if no).'),
  has_foreign_bank_over_10k: z
    .boolean()
    .optional()
    .describe('Whether the aggregate of your foreign financial accounts exceeded $10,000 at any point (triggers FBAR).'),
  formed_in_us: z
    .boolean()
    .optional()
    .describe('Whether the entity was formed in the US (relevant to the BOI report, from which most US-formed companies are now exempt).'),
});

const NEXT_STEP = {
  label: 'Have an Enrolled Agent track every US deadline for your entity - free 15-minute call',
  url: GO.book15min,
};

interface DeadlineRow {
  form: string;
  what: string;
  due: string;
  extended?: string;
  penalty?: string;
  days_until?: number;
  status?: string;
}

/**
 * Resolve a {month, day} to an ISO date in the filing YEAR + 1 (returns are
 * filed the following year), rolled forward per IRC 7503 when the statutory
 * date lands on a weekend or legal holiday (e.g. TY2025 Form 1120-S is
 * statutorily March 15, 2026, a Sunday, so it becomes Monday March 16, 2026).
 */
function dueIso(year: number, md: { month: number; day: number }): string {
  const mm = String(md.month).padStart(2, '0');
  const dd = String(md.day).padStart(2, '0');
  const statutory = parseIsoDate(`${year + 1}-${mm}-${dd}`);
  if (!statutory) return `${year + 1}-${mm}-${dd}`;
  return toIso(rollToBusinessDay(statutory));
}

function withCountdown(row: DeadlineRow): DeadlineRow {
  const due = parseIsoDate(row.due);
  if (!due) return row;
  const days = daysBetween(todayUtc(), due);
  return {
    ...row,
    days_until: days,
    status: days < 0 ? 'past due - file as soon as possible' : days <= 30 ? 'due soon' : 'upcoming',
  };
}

function run(args: z.infer<typeof input>) {
  const today = todayUtc();
  const year = args.filing_year ?? today.getUTCFullYear() - 1;
  const rows: DeadlineRow[] = [];

  const D = FILING_DEADLINES;

  if (args.entity_type === 'foreign_owned_llc') {
    rows.push({
      form: 'Form 1120 + Form 5472',
      what: 'A SINGLE-MEMBER (disregarded) US LLC wholly owned by a non-US person must file a pro-forma Form 1120 with Form 5472 for reportable transactions with the foreign owner. NOTE: a MULTI-member foreign-owned LLC is instead a partnership and files Form 1065 (use entity_type multi_member_llc) - each member with US-source income may also owe a personal return.',
      due: dueIso(year, D.form1120_5472),
      extended: `Extendable to ${humanDate(parseIsoDate(dueIso(year, { month: D.form1120_5472.extendedMonth, day: D.form1120_5472.extendedDay }))!)} with Form 7004.`,
      penalty: `${usd(INFO_RETURN_PENALTIES.form5472)} per Form 5472 not filed, per year - the single most expensive miss for a foreign-owned single-member LLC.`,
    });
  } else if (args.entity_type === 'foreign_owned_c_corp') {
    rows.push({
      form: 'Form 1120 + Form 5472',
      what: 'A US C-corporation files Form 1120 (with Form 5472 for transactions with 25%+ foreign owners).',
      due: dueIso(year, D.form1120_5472),
      extended: `Extendable to ${humanDate(parseIsoDate(dueIso(year, { month: D.form1120_5472.extendedMonth, day: D.form1120_5472.extendedDay }))!)} with Form 7004.`,
      penalty: `${usd(INFO_RETURN_PENALTIES.form5472)} per Form 5472; corporate income tax is due by the original date even if the return is extended.`,
    });
  } else if (args.entity_type === 'multi_member_llc') {
    rows.push({
      form: 'Form 1065',
      what: 'A US multi-member LLC (default partnership) files Form 1065 and issues K-1s to members.',
      due: dueIso(year, D.form1065),
      extended: `Extendable to ${humanDate(parseIsoDate(dueIso(year, { month: D.form1065.extendedMonth, day: D.form1065.extendedDay }))!)} with Form 7004.`,
      penalty: 'Late-filing penalty accrues per partner, per month.',
    });
  } else if (args.entity_type === 's_corp') {
    rows.push({
      form: 'Form 1120-S',
      what: 'An S-corporation files Form 1120-S and issues K-1s to shareholders.',
      due: dueIso(year, D.form1120s),
      extended: `Extendable to ${humanDate(parseIsoDate(dueIso(year, { month: D.form1120s.extendedMonth, day: D.form1120s.extendedDay }))!)} with Form 7004.`,
      penalty: 'Late-filing penalty accrues per shareholder, per month.',
    });
  } else {
    // nonresident_individual
    const md = args.has_us_source_wages ? D.form1040nr_usWages : D.form1040nr_noUsWages;
    rows.push({
      form: 'Form 1040-NR',
      what: 'A nonresident individual reports US-source income on Form 1040-NR.',
      due: dueIso(year, md),
      extended: `Extendable to ${humanDate(parseIsoDate(dueIso(year, { month: md.extendedMonth, day: md.extendedDay }))!)} with Form 4868.`,
      penalty: args.has_us_source_wages
        ? 'Due April 15 because you had US wages subject to withholding.'
        : 'Due June 15 when you had no US wages subject to withholding.',
    });
  }

  // FBAR applies to any of these when foreign accounts cross the threshold.
  if (args.has_foreign_bank_over_10k) {
    rows.push({
      form: 'FBAR (FinCEN Form 114)',
      what: `Filed because your foreign accounts aggregated over ${usd(FBAR_THRESHOLD)}. Filed electronically with FinCEN, separate from the tax return.`,
      due: dueIso(year, { month: D.fbar.month, day: D.fbar.day }),
      extended: `AUTOMATIC extension to ${humanDate(parseIsoDate(dueIso(year, { month: D.fbar.extendedMonth, day: D.fbar.extendedDay }))!)} - no request needed, so an April 15 miss is not a late filing.`,
      penalty: 'Non-willful penalties can reach five figures per report; willful violations far more.',
    });
  }

  // BOI report: most US-formed companies are now exempt (FinCEN interim final
  // rule, March 2025). Only foreign-formed entities registered to do US business
  // still report.
  const boiForeign = args.formed_in_us === false && args.entity_type !== 'nonresident_individual';

  const withCountdowns = rows.map(withCountdown);
  const nextDue = withCountdowns
    .filter((r) => typeof r.days_until === 'number')
    .sort((a, b) => (a.days_until as number) - (b.days_until as number))[0];

  const fields = {
    tax_year: year,
    entity_type: args.entity_type,
    deadlines: withCountdowns,
    boi_report: boiForeign
      ? {
          applies: true,
          note: `As a foreign-formed entity registered to do business in the US, a FinCEN Beneficial Ownership Information report is generally still required. Penalty ${usd(INFO_RETURN_PENALTIES.boiReport)} per day of willful violation. New York adds its own state-level LLC disclosure (the NY LLC Transparency Act, effective 2026) for LLCs formed in or registered in New York.`,
          caveat:
            'The exemption rules come from a FinCEN interim final rule (March 2025); a final rule is pending and could change them. Being exempt from or subject to BOI does NOT change Form 5472 or any tax filing obligation - those are separate.',
        }
      : {
          applies: false,
          note:
            args.formed_in_us === true
              ? 'Your company was formed in the US, so it is exempt from the federal FinCEN BOI report under the March 2025 interim final rule. Foreign-formed entities registered to do US business may still report.'
              : 'The federal BOI exemption turns on WHERE the company was formed, not who owns it: companies FORMED IN THE US (for example a Wyoming or Delaware LLC with foreign owners) are exempt under the March 2025 interim final rule, while a FOREIGN-FORMED company registered to do business in a US state generally must still file. Set formed_in_us for a specific answer.',
          caveat:
            'The exemption rules come from a FinCEN interim final rule (March 2025); a final rule is pending and could change them. Being exempt from BOI does NOT change Form 5472 or any tax filing obligation - those are separate.',
        },
    state_note: `State filings are separate. For example, a California LLC or corporation owes the ${usd(CA_FRANCHISE_TAX_MINIMUM)} minimum franchise tax annually; Wyoming and New Mexico have their own annual-report rules.`,
    important: 'The dates above already roll to the next business day when the statutory deadline falls on a weekend or federal/DC holiday (IRC 7503). State deadlines are separate; verify each date for your specific situation.',
  };

  const summary = nextDue
    ? `For tax year ${year}, your next US deadline is ${nextDue.form} on ${humanDate(parseIsoDate(nextDue.due)!)}${typeof nextDue.days_until === 'number' && nextDue.days_until >= 0 ? ` (about ${nextDue.days_until} days away)` : ' (past due - act now)'}. ${args.entity_type.startsWith('foreign_owned') ? `Missing Form 5472 alone is a ${usd(INFO_RETURN_PENALTIES.form5472)}/year penalty.` : ''}`
    : `Deadlines for tax year ${year} are listed below.`;

  return output(summary, fields, SOURCE.formation, NEXT_STEP);
}

export const deadlineCalendar: ToolDef<typeof input> = {
  name: 'deadline_calendar',
  title: 'US filing deadlines for founders',
  description:
    'Use this when a US business owner or nonresident (especially a foreign founder of a US LLC or C-corp) asks what US forms they must file and when. Returns each required federal form, its due date and extension, and the penalty for missing it, including Form 5472, FBAR, and the BOI report. Especially useful for non-US founders of US companies.',
  input,
  annotations: { title: 'US filing deadlines for founders', readOnlyHint: true, openWorldHint: false },
  logEnums: (args) => ({
    entity_type: args.entity_type,
    has_fbar: args.has_foreign_bank_over_10k ?? false,
    filing_year: args.filing_year ?? TAX_YEAR - 1,
  }),
  run,
};
