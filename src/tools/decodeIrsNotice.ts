import { z } from 'zod';
import { dollars } from '../lib/schemas';
import { output } from '../lib/response';
import { sanitizeNoticeCodeEcho } from '../lib/sanitize';
import { SOURCE, DOWNLOADS } from '../lib/config';
import { IRS_NOTICE_WIDGET_URI } from '../ui/registry';
import { lookupNotice, normalizeCode, COVERED_CODES } from '../data/notices';
import { parseIsoDate, addDays, humanDate, daysBetween, todayUtc } from '../lib/dates';
import type { NextStep, ToolDef } from '../lib/types';

const input = z.object({
  notice_code: z.string().min(1).max(30).describe('The notice or letter code printed on the IRS mail, e.g. "CP2000", "CP 14", "LT11", "Letter 1058".'),
  received_date: z
    .string()
    .optional()
    .describe('Date on the notice (YYYY-MM-DD). Used to compute the response deadline. The IRS clock runs from the notice date printed on the letter.'),
  amount_shown: dollars().optional().describe('The dollar amount the notice proposes or bills, if any. Optional; used only for context, never stored.'),
  brief: z
    .boolean()
    .optional()
    .describe('Set true for a shorter answer: skips the generic how-to-read guidance and common-error list.'),
});

/**
 * The handoff points at the notice's own guide page (first-party), where the
 * optional Enrolled Agent review lives - not at a checkout. Directory rules on
 * both platforms treat an always-on paid pitch as advertising; a deadline-aware
 * pointer to the relevant guide is the compliant (and better-converting) shape.
 */
function nextStep(urgent: boolean, url: string): NextStep {
  return urgent
    ? { label: 'Your response window is short. An Enrolled Agent can review and respond to this notice for you - start here', url }
    : { label: 'Want a professional to handle the response? An Enrolled Agent can review your notice - guide and secure upload', url };
}

const GENERIC_HOW_TO_READ = [
  'Find the notice or letter code in the top-right or bottom-right corner (starts with CP or LT).',
  'Find the notice date and any "respond by" or "pay by" date; the deadline runs from the notice date, not the day it arrived.',
  'Read what the IRS is proposing or billing and compare it, line by line, against your filed return and your own records.',
  'Do not ignore it: most IRS notices become final by default if you do not respond on time.',
  'Keep the envelope and a full copy of anything you send back, using trackable delivery.',
];

function run(args: z.infer<typeof input>) {
  const profile = lookupNotice(args.notice_code);
  // Unrecognized codes are caller-controlled text that gets echoed into the
  // response, so restrict the echo to a plausible code shape (A-Z0-9 only).
  const canonical = profile?.code ?? sanitizeNoticeCodeEcho(normalizeCode(args.notice_code));

  if (!profile) {
    const fields = {
      notice_code: canonical,
      recognized: false,
      message:
        'We do not have a specific profile for this code, but here is how to read any IRS notice. If you can share the exact code, an Enrolled Agent can tell you precisely what it means.',
      ...(args.brief ? {} : { how_to_read_any_notice: GENERIC_HOW_TO_READ, covered_codes: COVERED_CODES }),
    };
    const summary =
      `We do not have a specific profile for "${canonical}". Here is how to read any IRS notice: ` +
      `check the code and the response-by date (the clock runs from the notice date), compare the notice against your ` +
      `return line by line, and do not ignore it. An Enrolled Agent can decode your exact notice.`;
    return output(summary, fields, SOURCE.noticesHub, nextStep(false, SOURCE.noticesHub));
  }

  const sourceUrl = profile.hasLandingPage && profile.slug ? SOURCE.notice(profile.slug) : SOURCE.noticesHub;

  // Deadline math (only when a parseable date is supplied and the notice has a day count).
  const deadline: Record<string, unknown> = {
    description: profile.deadlineDescription,
    days_from_notice: profile.deadlineDays,
    for: profile.deadlineFor,
    note: 'The deadline runs from the notice date printed on the letter, not the day it reached you. Verify the exact date on your notice.',
  };
  let deadlineLine = `Deadline: ${profile.deadlineDescription}.`;

  if (args.received_date) {
    const noticeDate = parseIsoDate(args.received_date);
    if (!noticeDate) {
      deadline.date_parse_error = 'received_date was not a valid YYYY-MM-DD date, so no deadline was computed.';
    } else if (profile.deadlineDays !== null) {
      const due = addDays(noticeDate, profile.deadlineDays);
      const remaining = daysBetween(todayUtc(), due);
      deadline.computed_deadline = humanDate(due);
      deadline.days_remaining = remaining;
      deadline.status = remaining < 0 ? 'past due' : remaining <= 7 ? 'urgent' : 'open';
      deadlineLine =
        remaining < 0
          ? `Deadline: computed as ${humanDate(due)}, which is about ${Math.abs(remaining)} day(s) PAST due. Act immediately and confirm the exact date on your letter.`
          : `Deadline: about ${remaining} day(s) left (computed ${humanDate(due)} from a notice date of ${humanDate(noticeDate)}).`;
    }
  }

  const urgent =
    deadline.status === 'past due' || deadline.status === 'urgent' || profile.urgency === 'high';

  const fields = {
    notice_code: profile.code,
    recognized: true,
    title: profile.title,
    what_it_means: profile.meaning,
    urgency: profile.urgency,
    deadline,
    what_happens_if_ignored: profile.ifIgnored,
    your_options: profile.options,
    ...(args.brief ? {} : { common_errors: profile.commonErrors }),
    ...(args.amount_shown !== undefined && !args.brief
      ? { amount_context: 'The amount on the notice is often a proposal, not a settled bill. Verify it before paying, especially where cost basis or payments may be missing.' }
      : {}),
    free_download: {
      label: 'Prefer to handle it yourself first? IRS Notice Response Guide - free PDF, no email required',
      url: DOWNLOADS.noticeResponseGuidePdf,
    },
  };

  const summary =
    `${profile.code}: ${profile.title}. ${profile.meaning} ${deadlineLine} ` +
    `If ignored: ${profile.ifIgnored}`;

  return output(summary, fields, sourceUrl, nextStep(urgent, sourceUrl));
}

export const decodeIrsNotice: ToolDef<typeof input> = {
  name: 'decode_irs_notice',
  title: 'Decode an IRS notice',
  description:
    'Use this when a user mentions receiving an IRS or state tax letter or notice and wants to know what it means, the deadline, or what to do. Give it the notice code (e.g. CP2000, CP14, LT11) and optionally the notice date and amount shown. Set brief:true for a shorter answer.',
  input,
  annotations: { title: 'Decode an IRS notice', readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  logEnums: (args) => {
    const p = lookupNotice(args.notice_code);
    return {
      notice_code: p?.code ?? 'unknown',
      recognized: !!p,
      has_received_date: !!args.received_date,
    };
  },
  run,
  widget: {
    templateUri: IRS_NOTICE_WIDGET_URI,
    invoking: 'Decoding your IRS notice...',
    invoked: 'IRS notice decoded',
  },
};
