import { z } from 'zod';
import { output } from '../lib/response';
import { SOURCE, GO, OFFICE } from '../lib/config';
import { consultations, resolution, usd, usdRange } from '../pricing';
import { ACTION_PLAN_WIDGET_URI } from '../ui/registry';
import type { NextStep, ToolDef } from '../lib/types';

/*
 * IRS PROGRAM THRESHOLDS AND POLICY NORMS - not service prices (those live in
 * pricing.ts). These are tax-law figures, kept as literals like the penalty
 * rates in estimateIrsPenalty.ts.
 */
const SIMPLE_PAYMENT_PLAN_CEILING = 50_000;                // current general ceiling for eligible individual and non-trust-fund accounts
const BUSINESS_TRUST_FUND_SIMPLE_PLAN_CEILING = 25_000;    // current ceiling for eligible business trust-fund accounts
const FILING_COMPLIANCE_YEARS = 6;                         // IRS Policy Statement 5-133 - delinquent-return enforcement generally covers the last six years
const CDP_WINDOW_DAYS = 30;                                // Collection Due Process hearing window after a final notice of intent to levy (IRC 6330)

const input = z.object({
  problem: z
    .enum([
      'irs_notice',
      'back_taxes_owed',
      'unfiled_returns',
      'levy_or_garnishment',
      'audit_or_exam',
      'penalties',
      'identity_verification',
      'payroll_tax_941',
      'state_tax',
      'not_sure',
    ])
    .describe(
      'The tax problem, as close as it maps. irs_notice = any IRS or state letter; back_taxes_owed = a balance that cannot be paid in full; unfiled_returns = one or more years never filed; levy_or_garnishment = a bank levy, wage garnishment, or a final intent-to-levy letter; audit_or_exam = an IRS audit or examination letter; penalties = penalty charges on an account; identity_verification = a 5071C/4883C identity letter or suspected refund identity theft; payroll_tax_941 = unpaid or late employer payroll taxes; state_tax = a state tax agency problem; not_sure = anything else.',
    ),
  amount_band: z
    .enum(['under_10k', 'from_10k_to_50k', 'over_50k', 'not_sure'])
    .optional()
    .describe(
      'Roughly how much is at stake, if known. Bands only, never an exact figure. Current IRS Simple Payment Plan balance criteria generally use a $50,000 ceiling for eligible individual and non-trust-fund accounts and a $25,000 ceiling for eligible business trust-fund accounts.',
    ),
  years_behind: z
    .enum(['one', 'two_to_three', 'four_to_six', 'more_than_six'])
    .optional()
    .describe(
      'For unfiled returns: how many years are unfiled. The IRS generally looks for the last six years filed to restore filing compliance.',
    ),
  has_deadline_soon: z
    .boolean()
    .optional()
    .describe(
      'True if a letter shows a response or payment date within about two weeks. Raises the urgency. No dates are computed here; use decode_irs_notice for exact deadline math.',
    ),
  brief: z
    .boolean()
    .optional()
    .describe('Set true for a shorter answer: urgency, this-week actions, and the matching service only.'),
});

type Input = z.infer<typeof input>;
type Problem = Input['problem'];
type Urgency = 'act_now' | 'act_this_week' | 'plan_this_month';

interface Profile {
  base_urgency: Urgency;
  /** One-sentence top action used in the plain-text summary. */
  summary_line: string;
  what_this_usually_is: string;
  this_week: string[];
  this_month: string[];
  what_not_to_do: string[];
  recommended_tools: Array<{ tool: string; why: string }>;
  matching_service: { service: string; published_fee: string; note: string };
  source_url: string;
  next_step: NextStep;
  /** Used instead of next_step when the situation resolves to act_now. */
  urgent_next_step?: NextStep;
}

const TRANSCRIPTS_CALL: NextStep = {
  label: 'Have an Enrolled Agent pull your IRS transcripts (Form 8821) and map the plan - free 15-minute call',
  url: GO.book15min,
};

const HOW_A_PROFESSIONAL_HELPS =
  'With Form 8821 an Enrolled Agent can pull your IRS transcripts to see the real balances, years, and deadlines on your account; with Form 2848 (Power of Attorney) the Enrolled Agent can represent you before the IRS so you do not face it alone.';

const CAVEATS = [
  'This is a general-information triage, not advice or a case evaluation; the exact letter, transcripts, and facts decide the real plan.',
  'No specific IRS outcome can be promised; deadlines and program fits depend on your account.',
  'Published fee ranges for every service: use the get_fee_quote tool or see the pricing page.',
];

const PROFILES: Record<Problem, Profile> = {
  irs_notice: {
    base_urgency: 'act_this_week',
    summary_line: 'Find the code on the letter and decode it before the printed response date.',
    what_this_usually_is:
      'An IRS or state letter states an issue, an amount, and a response window. Most notices are resolvable when answered by the deadline, and the letter code (upper or lower right corner) says exactly what is being asked.',
    this_week: [
      'Find the notice code (for example CP2000, CP14, LT11) and the response date printed on the letter.',
      'Run the decode_irs_notice tool with that code for the meaning, the deadline math, and your options.',
      'Pull the return and records for the tax year the letter references.',
      'Respond by the printed date, or have a professional respond for you; silence is what escalates a notice.',
    ],
    this_month: [
      'If you agree with the notice, arrange payment or a payment plan before penalties grow.',
      'If you disagree, assemble documentation and reply in writing by the deadline.',
      'Set a reminder a week before the response date so it cannot slip past.',
    ],
    what_not_to_do: [
      'Do not ignore the letter; most IRS notices escalate automatically when unanswered.',
      'Do not pay an amount you do not understand or agree with before the notice math is checked.',
      'Do not share your SSN or bank details in a chat; the notice code alone is enough here.',
    ],
    recommended_tools: [
      { tool: 'decode_irs_notice', why: 'The exact meaning, deadline, and options for your letter code.' },
      { tool: 'estimate_irs_penalty', why: 'Size the penalties and interest if the notice involves a balance.' },
      { tool: 'check_resolution_options', why: 'Screen payment paths if you agree but cannot pay in full.' },
    ],
    matching_service: {
      service: 'IRS Notice Review',
      published_fee: usd(consultations.irsNoticeReview),
      note: `An Enrolled Agent reads the letter and maps the response. A full written response, when needed, is ${usdRange(resolution.noticeResponseOneIssue_low, resolution.noticeResponseOneIssue_high)} depending on scope (published fees).`,
    },
    source_url: SOURCE.noticesHub,
    next_step: {
      label: 'Have an Enrolled Agent review the letter and map the response - IRS Notice Review',
      url: GO.noticeReview,
    },
    urgent_next_step: {
      label: 'The response window is short - have an Enrolled Agent review the letter now, IRS Notice Review',
      url: GO.noticeReview,
    },
  },
  back_taxes_owed: {
    base_urgency: 'plan_this_month',
    summary_line: 'Confirm the real balance from transcripts, then pick the payment path that fits.',
    what_this_usually_is:
      'A balance with the IRS grows through failure-to-pay penalties and daily compounding interest, but the IRS runs structured paths (payment plans, hardship status, penalty abatement) for balances that cannot be paid at once.',
    this_week: [
      'Confirm the real balance: an IRS online account or transcripts show tax, penalties, and interest by year.',
      'Run the check_resolution_options tool with your rough balance and ability to pay to see which paths fit.',
      'Confirm every required return is filed; the IRS approves no agreement until you are filing-compliant.',
    ],
    this_month: [
      'Pick a resolution path and start it; many payment plans can be set up online once returns are filed.',
      'Ask about penalty abatement if the balance includes failure-to-file or failure-to-pay penalties.',
      'Keep current-year withholding or estimated payments on track so new debt does not undo the plan.',
    ],
    what_not_to_do: [
      'Do not wait for the balance to fix itself; interest compounds daily and collection letters escalate.',
      'Do not drain retirement accounts or take high-interest debt before comparing IRS payment plans.',
      'Do not agree to a monthly payment you cannot sustain; a defaulted agreement is harder to replace.',
    ],
    recommended_tools: [
      { tool: 'check_resolution_options', why: 'Screens payment plan, Offer in Compromise fit, hardship status, and abatement.' },
      { tool: 'estimate_irs_penalty', why: 'Shows how much of the balance is penalty and interest.' },
      { tool: 'get_fee_quote', why: 'Published fee ranges for professional help on each path.' },
    ],
    matching_service: {
      service: 'IRS Health Check - transcript and account review',
      published_fee: usd(resolution.irsHealthCheck),
      note: 'An Enrolled Agent pulls IRS transcripts (Form 8821) and maps balances, years, deadlines, and options before you commit to a path.',
    },
    source_url: SOURCE.resolution,
    next_step: TRANSCRIPTS_CALL,
  },
  unfiled_returns: {
    base_urgency: 'plan_this_month',
    summary_line: 'Rebuild the missing years from transcripts and file them; filing unblocks everything else.',
    what_this_usually_is:
      `Unfiled years block every IRS resolution path and can trigger substitute-for-return assessments that overstate the tax. The IRS generally looks for the last ${FILING_COMPLIANCE_YEARS} years filed to restore compliance (IRS Policy Statement 5-133), and your transcripts show exactly which years it wants.`,
    this_week: [
      'List the years you believe are unfiled and gather the income records you still have.',
      'Run the get_document_checklist tool for the return type involved to see what to collect.',
      'Order wage-and-income transcripts, or have an Enrolled Agent pull them with Form 8821; they rebuild missing W-2s and 1099s.',
    ],
    this_month: [
      'Prepare and file the missing years; refunds generally lapse three years after the original due date, so refund years go first.',
      'If a balance results, screen payment paths with the check_resolution_options tool.',
      'If the IRS already filed a substitute return for a year, a correct original return usually replaces its higher assessment.',
    ],
    what_not_to_do: [
      'Do not skip filing because you cannot pay; the failure-to-file penalty runs about ten times the failure-to-pay penalty.',
      'Do not guess at missing income; IRS transcripts list what was reported under your SSN or EIN.',
      'Do not file only the newest year when several are open; compliance is judged across the recent years together.',
    ],
    recommended_tools: [
      { tool: 'deadline_calendar', why: 'The filing dates and penalty exposure for the forms involved.' },
      { tool: 'get_document_checklist', why: 'Exactly what to gather for each unfiled return.' },
      { tool: 'estimate_irs_penalty', why: 'Sizes failure-to-file and failure-to-pay exposure per year.' },
      { tool: 'check_resolution_options', why: 'Payment paths for any balance the filings create.' },
    ],
    matching_service: {
      service: 'IRS Health Check - transcript and account review',
      published_fee: usd(resolution.irsHealthCheck),
      note: 'Transcripts show exactly which years the IRS wants filed and what income it already has on record for each.',
    },
    source_url: SOURCE.resolution,
    next_step: TRANSCRIPTS_CALL,
  },
  levy_or_garnishment: {
    base_urgency: 'act_now',
    summary_line: 'Check the letter code today; a final notice carries a short window that preserves your hearing rights.',
    what_this_usually_is:
      `A bank levy, a wage garnishment, or a Final Notice of Intent to Levy (LT11 or Letter 1058) is the collection stage with the shortest clocks. A final notice generally carries a ${CDP_WINDOW_DAYS}-day window to request a Collection Due Process hearing (IRC 6330), and a timely request pauses levy action while it is heard.`,
    this_week: [
      'Find the letter code and date today: LT11 and Letter 1058 carry an appeal window that preserves rights.',
      'Run the decode_irs_notice tool with that code for the exact deadline math.',
      'Engage help now; getting a resolution or hearing request in before the deadline is what can pause collection.',
      'If a levy already hit your bank or wages, keep the levy notice and note your basic living costs; releases exist for economic hardship.',
    ],
    this_month: [
      'Get a resolution path in place (payment agreement or hardship status); an accepted arrangement generally stops new levies.',
      'Bring any unfiled years current; they block every resolution path.',
    ],
    what_not_to_do: [
      'Do not let a Collection Due Process window lapse; the hearing right is time-limited.',
      'Do not shuffle money between accounts to dodge a levy; resolving the account is what ends it.',
      'Do not treat a levy as final; releases and payment arrangements exist even after one lands.',
    ],
    recommended_tools: [
      { tool: 'decode_irs_notice', why: 'LT11 and Letter 1058 deadline math and options, from the code on your letter.' },
      { tool: 'check_resolution_options', why: 'The resolution paths that stop active collection.' },
      { tool: 'book_consultation', why: 'Direct line to an Enrolled Agent while the window is open.' },
    ],
    matching_service: {
      service: 'IRS representation for collection matters',
      published_fee: `from ${usd(resolution.irsRepresentationResolution_from)}`,
      note: 'An Enrolled Agent under Form 2848 deals with IRS collection directly and works the levy release or agreement.',
    },
    source_url: SOURCE.resolution,
    next_step: TRANSCRIPTS_CALL,
    urgent_next_step: {
      label: 'A levy can often be paused once you engage - talk to an Enrolled Agent now, free 15-minute call',
      url: GO.book15min,
    },
  },
  audit_or_exam: {
    base_urgency: 'act_this_week',
    summary_line: 'Read the letter for the year and items under review, then build the document file before replying.',
    what_this_usually_is:
      'An audit or examination letter names the tax year, the items under review, and how the exam runs (mail, office, or field). Most audits are correspondence audits about specific line items, and organized documentation is what carries them.',
    this_week: [
      'Read the letter for the tax year, the specific items questioned, and the response date.',
      'Run the get_document_checklist tool to start assembling records for the items under review.',
      'Make copies of everything; originals stay with you.',
    ],
    this_month: [
      'Reply by the stated date, or request more time in writing before it passes.',
      'Consider representation: under Form 2848 an Enrolled Agent handles the exam so you do not meet the IRS alone.',
    ],
    what_not_to_do: [
      'Do not volunteer years or items the letter did not ask about.',
      'Do not answer substantive questions in a phone call; get questions and answers in writing.',
      'Do not miss the response date; an unanswered audit closes with the IRS figures.',
    ],
    recommended_tools: [
      { tool: 'get_document_checklist', why: 'What to gather for the return type under exam.' },
      { tool: 'decode_irs_notice', why: 'If the letter carries a notice code, this maps its exact track.' },
      { tool: 'book_consultation', why: 'Representation decisions are best made before the first reply.' },
    ],
    matching_service: {
      service: 'IRS audit representation',
      published_fee: `from ${usd(resolution.irsRepresentationResolution_from)}`,
      note: 'An Enrolled Agent under Form 2848 manages the exam, the document flow, and the IRS contact end to end.',
    },
    source_url: SOURCE.resolution,
    next_step: TRANSCRIPTS_CALL,
  },
  penalties: {
    base_urgency: 'plan_this_month',
    summary_line: 'Itemize the penalties on the account, then check first-time and reasonable-cause abatement before paying.',
    what_this_usually_is:
      'IRS penalties (late filing, late payment, estimated tax) are often reducible: first-time abatement rewards a clean prior three-year history, and reasonable-cause relief exists for events outside your control. Interest comes off only when the penalty it rides on is removed.',
    this_week: [
      'Identify which penalties are on the account; the notice or your transcripts itemize them by type and year.',
      'Run the estimate_irs_penalty tool to size the exposure and see how the pieces interact.',
      'Check the first-time abatement profile: no penalties in the prior three years, all returns filed, current on payments or a plan.',
    ],
    this_month: [
      'Request abatement by phone or on Form 843 with the facts documented.',
      'If a balance remains after abatement, screen payment paths with the check_resolution_options tool.',
    ],
    what_not_to_do: [
      'Do not pay a penalty you may qualify to remove before abatement is checked.',
      'Do not confuse interest with penalties; interest is statutory and falls only with its penalty.',
      'Do not miss the underlying response deadline while pursuing abatement.',
    ],
    recommended_tools: [
      { tool: 'estimate_irs_penalty', why: 'Failure-to-file, failure-to-pay, and interest math on your numbers.' },
      { tool: 'check_resolution_options', why: 'Includes the abatement path plus payment options for what remains.' },
    ],
    matching_service: {
      service: 'Penalty abatement request',
      published_fee: `from ${usd(resolution.penaltyAbatementFirstTime_from)}`,
      note: 'An Enrolled Agent documents the abatement case (first-time or reasonable cause) and files it with the IRS.',
    },
    source_url: SOURCE.resolution,
    next_step: TRANSCRIPTS_CALL,
  },
  identity_verification: {
    base_urgency: 'act_this_week',
    summary_line: 'Verify through the official channel printed on the letter; the paused return stays frozen until you do.',
    what_this_usually_is:
      'A 5071C or 4883C letter means the IRS paused a return until you verify identity. It is time-sensitive but routine; verification goes only through the official IRS channel or phone number printed on the letter itself.',
    this_week: [
      'Find the letter code (5071C, 4883C, or similar) and the verification instructions printed on it.',
      'Verify through the channel on the letter, with last year\'s return and this year\'s return details at hand.',
      'Run the decode_irs_notice tool with the code for what the letter means and how its timing works.',
      'If you did NOT file the return in question, say so during verification; that flags it as identity theft.',
    ],
    this_month: [
      'If identity theft is confirmed, consider an Identity Protection PIN for future filings and review your other financial accounts.',
      'Watch for the refund or a follow-up letter; processing resumes only after verification.',
    ],
    what_not_to_do: [
      'Do not verify through links in emails or texts; the IRS starts identity verification by letter.',
      'Do not set it aside; the paused return and any refund stay frozen until you verify.',
      'Do not share verification codes with anyone who calls you.',
    ],
    recommended_tools: [
      { tool: 'decode_irs_notice', why: 'The exact track for 5071C, 4883C, and related identity letters.' },
    ],
    matching_service: {
      service: 'IRS Notice Review',
      published_fee: usd(consultations.irsNoticeReview),
      note: 'An Enrolled Agent confirms the letter is genuine, what it needs, and what happens after verification.',
    },
    source_url: SOURCE.noticesHub,
    next_step: TRANSCRIPTS_CALL,
  },
  payroll_tax_941: {
    base_urgency: 'act_this_week',
    summary_line: 'Get current on this quarter\'s deposits first; the trust-fund portion can become personal liability.',
    what_this_usually_is:
      'Unpaid employment taxes are the IRS\'s most aggressive collection lane. The trust-fund portion (withheld income tax plus the employee share of Social Security and Medicare) can be assessed personally against owners and responsible officers as the Trust Fund Recovery Penalty (IRC 6672).',
    this_week: [
      'Get current on THIS quarter\'s federal tax deposits first; new compliance is what stops the exposure from growing.',
      'Run the deadline_calendar tool for the employment-tax filing dates that apply to you.',
      'Gather the Form 941 filings and the deposit history for the affected quarters.',
    ],
    this_month: [
      'Address the back quarters with a payment arrangement; business and trust-fund balances are handled differently.',
      'Get representation before any Trust Fund Recovery Penalty interview (Form 4180); personal exposure is decided there.',
    ],
    what_not_to_do: [
      'Do not use withheld employee taxes to float the business; that is exactly the portion that becomes personal.',
      'Do not attend a trust-fund interview unrepresented.',
      'Do not fall behind on current deposits while negotiating the old balance.',
    ],
    recommended_tools: [
      { tool: 'deadline_calendar', why: 'The employment-tax deposit and filing dates that apply.' },
      { tool: 'get_fee_quote', why: 'Published fee ranges for payroll cleanup and representation.' },
      { tool: 'book_consultation', why: 'Trust-fund exposure decisions need a professional early.' },
    ],
    matching_service: {
      service: 'IRS representation for payroll tax matters',
      published_fee: `from ${usd(resolution.irsRepresentationResolution_from)}`,
      note: 'An Enrolled Agent under Form 2848 handles the quarters, the arrangement, and any trust-fund interview.',
    },
    source_url: SOURCE.resolution,
    next_step: TRANSCRIPTS_CALL,
  },
  state_tax: {
    base_urgency: 'plan_this_month',
    summary_line: 'Identify the agency and letter type; states run their own faster-moving collection systems.',
    what_this_usually_is:
      'State tax agencies run their own collection systems with their own deadlines, penalties, and payment plans; California\'s Franchise Tax Board, for example, often moves faster than the IRS. The response pattern is the same: read the letter, verify the number, respond by the date.',
    this_week: [
      'Identify the agency and the letter type; state notices carry their own codes and response windows.',
      'Verify the amount against your state return for that year.',
      'Check whether the state issue traces back to a federal change; IRS adjustments flow through to states.',
    ],
    this_month: [
      'Set up the state\'s payment plan if you agree with the balance but cannot pay at once.',
      'If the state assessed without a return (California does this for registered entities), filing the actual return usually corrects the balance.',
    ],
    what_not_to_do: [
      'Do not assume a state balance follows IRS rules; each state\'s programs differ.',
      'Do not ignore state letters; states move to bank levies and license holds quickly.',
      'Do not pay the same adjustment twice; if the IRS changed the year, reconcile before paying the state.',
    ],
    recommended_tools: [
      { tool: 'get_fee_quote', why: 'Published fee ranges for state notice and resolution work.' },
      { tool: 'book_consultation', why: 'State strategy depends on the agency and letter specifics.' },
    ],
    matching_service: {
      service: 'State tax representation and resolution',
      published_fee: `from ${usd(resolution.irsRepresentationResolution_from)}`,
      note: 'The firm handles IRS and state matters together, so a federal change and its state echo are resolved once.',
    },
    source_url: SOURCE.resolution,
    next_step: TRANSCRIPTS_CALL,
  },
  not_sure: {
    base_urgency: 'plan_this_month',
    summary_line: 'Gather whatever the IRS or your state sent; the letter code usually names the problem precisely.',
    what_this_usually_is:
      'Tax problems fall into a few buckets: a letter, a balance, missing filings, or active collection. A few minutes of triage usually shows which bucket you are in and what the first step is.',
    this_week: [
      'Gather anything the IRS or your state has sent; letter codes identify the situation precisely.',
      'If you have a letter, run the decode_irs_notice tool with its code. If a tax form confuses you, run explain_tax_document.',
      'If it is a balance you cannot pay, run the check_resolution_options tool with your rough numbers.',
    ],
    this_month: [
      'Once the problem has a name, run this triage again with the matching category for the specific plan.',
    ],
    what_not_to_do: [
      'Do not ignore mail from the IRS or your state; every path is easier before a deadline lapses.',
      'Do not share your SSN, bank details, or documents in a chat.',
    ],
    recommended_tools: [
      { tool: 'decode_irs_notice', why: 'If any letter is involved, the code decodes the situation.' },
      { tool: 'explain_tax_document', why: 'If a form you received is the confusion, this explains it.' },
      { tool: 'check_resolution_options', why: 'If a balance is the problem, this screens the paths.' },
      { tool: 'book_consultation', why: 'Describing it to a human for fifteen minutes costs nothing.' },
    ],
    matching_service: {
      service: 'Free 15-minute consultation',
      published_fee: 'free',
      note: 'Describe the situation to an Enrolled Agent and get pointed the right way; there is no charge for the call.',
    },
    source_url: SOURCE.resolution,
    next_step: {
      label: 'Not sure where to start? Describe it to an Enrolled Agent - free 15-minute call',
      url: GO.book15min,
    },
  },
};

const URGENCY_PHRASE: Record<Urgency, string> = {
  act_now: 'Act now.',
  act_this_week: 'Act this week.',
  plan_this_month: 'Plan this month.',
};

function run(args: Input) {
  const problem = args.problem;
  const p = PROFILES[problem];
  const deadlineSoon = args.has_deadline_soon ?? false;

  const urgency: Urgency =
    problem === 'levy_or_garnishment' || deadlineSoon ? 'act_now' : p.base_urgency;
  const next = urgency === 'act_now' && p.urgent_next_step ? p.urgent_next_step : p.next_step;

  // A near-term printed date outranks everything; levy guidance already leads with it.
  const thisWeek =
    deadlineSoon && problem !== 'levy_or_garnishment'
      ? [
          'A dated response window is about to close: treat the date printed on your letter as the controlling deadline.',
          ...p.this_week,
        ]
      : p.this_week;

  const balanceNote =
    args.amount_band === 'over_50k'
      ? `Above ${usd(SIMPLE_PAYMENT_PLAN_CEILING)}, the current IRS Simple Payment Plan balance criteria generally do not apply. The IRS ordinarily requires a Collection Information Statement for a payment agreement outside the simple-plan criteria.`
      : args.amount_band === 'under_10k' || args.amount_band === 'from_10k_to_50k'
        ? `Current IRS Simple Payment Plan criteria generally use a ${usd(SIMPLE_PAYMENT_PLAN_CEILING)} ceiling for eligible individual and non-trust-fund accounts and a ${usd(BUSINESS_TRUST_FUND_SIMPLE_PLAN_CEILING)} ceiling for eligible business trust-fund accounts. Account type, the collection expiration date, and current compliance determine whether a financial statement is required.`
        : args.amount_band === 'not_sure'
          ? 'Your IRS transcripts show the exact assessed balance by year; that number drives which paths fit.'
          : undefined;

  const filingNote =
    args.years_behind === 'one'
      ? 'One missing year is usually a contained catch-up: file it, then address any balance it creates.'
      : args.years_behind === 'two_to_three' || args.years_behind === 'four_to_six'
        ? `The IRS generally looks for the last ${FILING_COMPLIANCE_YEARS} years filed to treat you as filing-compliant (IRS Policy Statement 5-133).`
        : args.years_behind === 'more_than_six'
          ? `The IRS generally looks for the last ${FILING_COMPLIANCE_YEARS} years filed (IRS Policy Statement 5-133); older years are handled case by case, usually starting from your transcripts.`
          : undefined;

  const fields = {
    inputs: {
      problem,
      ...(args.amount_band ? { amount_band: args.amount_band } : {}),
      ...(args.years_behind ? { years_behind: args.years_behind } : {}),
      has_deadline_soon: deadlineSoon,
    },
    urgency,
    ...(urgency === 'act_now'
      ? {
          urgent_contact: {
            note: 'A short collection window moves faster by phone than by calendar. Call or message during office hours and say an IRS deadline is running.',
            phone: OFFICE.phone,
            whatsapp: OFFICE.whatsapp,
            hours: OFFICE.hours,
          },
        }
      : {}),
    what_this_usually_is: p.what_this_usually_is,
    this_week: thisWeek,
    ...(balanceNote ? { balance_note: balanceNote } : {}),
    ...(filingNote ? { filing_note: filingNote } : {}),
    ...(args.brief
      ? {}
      : {
          this_month: p.this_month,
          what_not_to_do: p.what_not_to_do,
          recommended_tools: p.recommended_tools,
          how_a_professional_helps: HOW_A_PROFESSIONAL_HELPS,
        }),
    matching_service: p.matching_service,
    caveats: CAVEATS,
  };

  const urgentLine =
    urgency === 'act_now'
      ? ` Short deadline: calling the office reaches an Enrolled Agent faster than a calendar slot - ${OFFICE.phone} (WhatsApp ${OFFICE.whatsapp}).`
      : '';
  const summary = `${URGENCY_PHRASE[urgency]} ${p.summary_line} Matching published-fee service: ${p.matching_service.service} (${p.matching_service.published_fee}). An Enrolled Agent can pull your IRS transcripts (Form 8821) and turn this into an exact plan.${urgentLine}`;

  return output(summary, fields, p.source_url, next);
}

export const triageTaxProblem: ToolDef<typeof input> = {
  name: 'triage_tax_problem',
  title: 'Triage a tax problem',
  description:
    'Use this when someone has a tax problem and does not know where to start; call it FIRST, before the specific tools. Covers an IRS or state letter, back taxes they cannot pay, unfiled years, a levy or wage garnishment, an audit, penalties, an identity-verification letter, and payroll tax trouble. Returns an urgency level, a this-week and this-month action plan, what not to do, which tool to run next for the specifics, and the matching published-fee service. General information only; never a guaranteed IRS outcome. Set brief:true for a shorter answer.',
  input,
  annotations: { title: 'Triage a tax problem', readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  logEnums: (args) => ({
    problem: args.problem,
    band: args.amount_band ?? 'not_provided',
    years_behind: args.years_behind ?? 'not_provided',
    has_deadline_soon: args.has_deadline_soon ?? false,
  }),
  run,
  widget: {
    templateUri: ACTION_PLAN_WIDGET_URI,
    invoking: 'Building your action plan...',
    invoked: 'Action plan ready',
  },
};
