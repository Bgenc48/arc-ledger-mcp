/**
 * IRS notice profiles for decode_irs_notice - tool-optimized (crisp structured
 * fields), covering the common notice codes plus those with a dedicated
 * landing page on arcandledger.com. Content is kept in sync with those pages
 * (a drift test in the source monorepo guards the deadline days). Everything
 * here is GENERAL information (Circular 230 safe): no guaranteed outcomes,
 * "Enrolled Agent" phrasing only.
 *
 * `deadlineDays` is measured from the date printed on the notice. The tool warns
 * that this clock runs from the notice date, not the day the letter arrived.
 */

export type Urgency = 'low' | 'moderate' | 'high' | 'critical';

export interface NoticeProfile {
  code: string;
  /** Extra normalized spellings that should resolve to this profile. */
  aliases?: string[];
  title: string;
  meaning: string;
  /** Days from the NOTICE date to the response deadline; null when there is no single statutory clock. */
  deadlineDays: number | null;
  deadlineDescription: string;
  /** What the deadline is a deadline *for*. */
  deadlineFor: string;
  ifIgnored: string;
  options: string[];
  commonErrors: string[];
  urgency: Urgency;
  /** True when a dedicated /irs-notices/<slug>/ page exists. */
  hasLandingPage: boolean;
  slug?: string;
}

export const NOTICES: Record<string, NoticeProfile> = {
  CP2000: {
    code: 'CP2000',
    aliases: ['AUR'],
    title: 'Proposed changes from the Automated Underreporter (not an audit)',
    meaning:
      'A computer at the IRS Automated Underreporter system compared a third-party form filed under your SSN (W-2, 1099-NEC, 1099-K, 1099-B, 1099-DA) against your return and found a mismatch. It proposes additional tax. It is not an audit and not a final bill.',
    deadlineDays: 30,
    deadlineDescription: '30 days from the notice date (60 days if your address is outside the US)',
    deadlineFor: 'agreeing to or disputing the proposed change',
    ifIgnored:
      'If you do not respond, the proposal can become an assessment by default, and the IRS can issue a CP3219A Statutory Notice of Deficiency, which starts a non-extendable 90-day Tax Court clock.',
    options: [
      'Compare the notice line by line against your return and the third-party forms',
      'Gather cost-basis records (missing basis is the usual reason the amount is overstated)',
      'Agree, partially agree, or disagree in writing with documentation and request your appeal rights',
      'Do not file a Form 1040-X just to answer a CP2000; use the response form',
    ],
    commonErrors: [
      'Broker reports gross proceeds without cost basis, so a stock or crypto sale looks like pure profit',
      '1099-K totals include sales tax, refunds, or non-taxable transfers',
      'Legitimate business deductions against 1099-NEC income are ignored',
    ],
    urgency: 'high',
    hasLandingPage: true,
    slug: 'cp2000',
  },

  CP2501: {
    code: 'CP2501',
    title: 'Early underreporter notice (a step before CP2000)',
    meaning:
      'An initial Automated Underreporter notice sent when your return does not match third-party forms. Like a CP2000 it proposes no final bill, but it is often issued earlier or when the IRS needs your input before proposing a specific change.',
    deadlineDays: 30,
    deadlineDescription: '30 days from the notice date',
    deadlineFor: 'responding with an explanation or documentation',
    ifIgnored: 'Silence typically leads to a CP2000 proposing a specific additional tax, then the deficiency sequence.',
    options: [
      'Compare the flagged income against your return and the forms the IRS received',
      'Respond with documentation explaining the difference (for example, cost basis or a duplicate report)',
      'Request your appeal rights if you disagree',
    ],
    commonErrors: [
      'Income reported on a different line or schedule than the IRS expected',
      'Missing cost basis on securities or digital assets',
    ],
    urgency: 'high',
    hasLandingPage: false,
  },

  CP14: {
    code: 'CP14',
    title: 'Your first IRS bill (balance due)',
    meaning:
      'The first notice in the collection sequence. The IRS processed your return and its records show an unpaid balance, including any penalties and interest so far. It is a bill, not an audit, and it is frequently triggered by a payment that was applied to the wrong year or account.',
    deadlineDays: 21,
    deadlineDescription: 'the pay-by date on the notice, typically 21 days from the notice date',
    deadlineFor: 'paying or responding before further penalties and interest accrue',
    ifIgnored:
      'The IRS escalates through CP501, CP503, and CP504, then LT11 (Final Notice of Intent to Levy). Failure-to-pay penalty adds 0.5% per month up to 25%, plus interest.',
    options: [
      'Verify the balance against your return and payment records before paying',
      'Check your IRS account transcript for payments applied to the wrong year or spouse',
      'Set up a short-term plan (up to 180 days) or an installment agreement if you cannot pay in full',
      'Ask about first-time penalty abatement or reasonable-cause relief',
    ],
    commonErrors: [
      'Estimated or extension payment credited to the wrong tax year',
      'Payment under one spouse SSN not showing on a joint account',
      'Payment still processing when the notice generated',
    ],
    urgency: 'moderate',
    hasLandingPage: true,
    slug: 'cp14',
  },

  CP501: {
    code: 'CP501',
    aliases: ['CP501H'],
    title: 'Reminder of a balance due (second notice)',
    meaning:
      'A reminder that you still have an unpaid balance on an account. It follows the CP14 and restates the amount owed with updated penalties and interest.',
    deadlineDays: 21,
    deadlineDescription: 'the pay-by date on the notice, typically 21 days from the notice date',
    deadlineFor: 'paying or arranging a payment plan before the next escalation',
    ifIgnored: 'The IRS sends CP503, then CP504, then LT11, moving toward levy authority.',
    options: [
      'Confirm the balance is correct against your transcript',
      'Pay, or request an installment agreement or short-term plan online',
      'Ask about penalty relief if you have a clean history',
    ],
    commonErrors: [
      'A pending payment or payment plan not yet reflected',
      'Penalties and interest built on an underlying balance that was already wrong',
    ],
    urgency: 'moderate',
    hasLandingPage: true,
    slug: 'cp501',
  },

  CP503: {
    code: 'CP503',
    title: 'Urgent reminder of a balance due',
    meaning:
      'A more urgent reminder that your balance is still unpaid after CP14 and CP501. The IRS is signaling that collection action is approaching.',
    deadlineDays: 21,
    deadlineDescription: 'the date on the notice, typically 21 days (sometimes 10) from the notice date',
    deadlineFor: 'paying or arranging a plan before CP504 and levy notices',
    ifIgnored: 'The next notice is usually CP504 (which can seize your state tax refund), then LT11 for a full levy.',
    options: [
      'Verify the balance and check for misapplied payments on your transcript',
      'Set up an installment agreement or request currently-not-collectible status if you cannot pay',
      'Consider penalty abatement',
    ],
    commonErrors: [
      'Assuming the earlier notices resolved automatically',
      'Underlying assessment errors carried forward from CP14',
    ],
    urgency: 'high',
    hasLandingPage: true,
    slug: 'cp503',
  },

  CP504: {
    code: 'CP504',
    title: 'Notice of Intent to Levy (can take your state refund)',
    meaning:
      'A Notice of Intent to Levy. If the balance stays unpaid, the IRS can levy your state income tax refund and can begin searching for other assets to levy. It is a serious step, but it is not yet the final levy notice that grants a Collection Due Process hearing.',
    deadlineDays: 30,
    deadlineDescription: '30 days from the notice date',
    deadlineFor: 'paying or resolving the balance before the state-refund levy and the LT11',
    ifIgnored:
      'The IRS can seize your state tax refund and then issue LT11 or CP90 (Final Notice of Intent to Levy) with Collection Due Process rights, opening the door to bank and wage levies.',
    options: [
      'Verify the balance and pull your account transcript',
      'Pay or set up an installment agreement to stop the escalation',
      'Prepare financial information in case a collection alternative is needed',
    ],
    commonErrors: [
      'Treating CP504 as the final levy notice (the CDP hearing right comes with LT11 or CP90)',
      'Ignoring a balance that includes abatable penalties',
    ],
    urgency: 'high',
    hasLandingPage: true,
    slug: 'cp504',
  },

  CP3219A: {
    code: 'CP3219A',
    aliases: ['3219A', 'NOTICEOFDEFICIENCY', '90DAYLETTER'],
    title: 'Statutory Notice of Deficiency (the 90-day letter)',
    meaning:
      'The formal legal step the IRS must take before assessing additional tax you have not agreed to, usually following an unresolved CP2000. It states the additional tax, penalties, and interest and explains your right to petition the U.S. Tax Court before paying.',
    deadlineDays: 90,
    deadlineDescription: '90 days from the notice date (150 days if addressed outside the US), and it cannot be extended',
    deadlineFor: 'filing a petition with the U.S. Tax Court to dispute the tax before paying',
    ifIgnored:
      'After the window closes the IRS assesses the tax and begins collection. Disputing it afterward means audit reconsideration or refund claims, which are slower and weaker.',
    options: [
      'Find the last day to petition printed on the notice and calendar it',
      'Compare each adjustment to your records; sign Form 5564 only if it is fully correct',
      'Send documentation to the IRS, but file the Tax Court petition before day 90 if the issue is not resolved in writing',
      'Small-case procedures exist for amounts of $50,000 or less per year',
    ],
    commonErrors: [
      'The deficiency inherits bad numbers from the original CP2000 (gross proceeds, no basis)',
      'Assuming correspondence with the IRS pauses the petition deadline (it does not)',
    ],
    urgency: 'critical',
    hasLandingPage: true,
    slug: 'cp3219a',
  },

  LT11: {
    code: 'LT11',
    aliases: ['L1058', 'LETTER1058', '1058'],
    title: 'Final Notice of Intent to Levy and your right to a hearing',
    meaning:
      'The last notice the IRS must send before it can levy your property (bank accounts, wages, receivables). Sometimes issued as Letter 1058 by a revenue officer. It carries the right to a Collection Due Process (CDP) hearing.',
    deadlineDays: 30,
    deadlineDescription: '30 days from the notice date',
    deadlineFor: 'requesting a Collection Due Process hearing on Form 12153',
    ifIgnored:
      'After 30 days the IRS can levy bank accounts and garnish wages. A bank levy holds funds for 21 days before they go to the IRS; wage garnishments continue each payday until resolved.',
    options: [
      'File Form 12153 within 30 days to request a CDP hearing (this generally pauses levy action)',
      'Verify the balance behind the levy for misapplied payments or abatable penalties',
      'Get current on any unfiled returns (required for most collection alternatives)',
      'Prepare Form 433-series financials for an installment agreement, offer in compromise, or hardship status',
    ],
    commonErrors: [
      'Missing the 30-day window, which forfeits the pause on levies and Tax Court review',
      'Draining accounts in a panic instead of using the hearing right',
    ],
    urgency: 'critical',
    hasLandingPage: true,
    slug: 'lt11',
  },

  LT38: {
    code: 'LT38',
    title: 'Reminder of overdue balance (automated reminders resumed)',
    meaning:
      'A reminder notice the IRS resumed sending after pausing automated reminders. It tells you a balance is still overdue and that penalties and interest continue to accrue. It restarts communication rather than starting a new deadline clock.',
    deadlineDays: null,
    deadlineDescription: 'no single statutory clock; pay or respond promptly to stop penalties and interest from growing',
    deadlineFor: 'resolving the overdue balance before the collection sequence resumes',
    ifIgnored: 'The regular collection sequence (CP501/CP503/CP504, then LT11) can resume, moving toward levy authority.',
    options: [
      'Pull your account transcript to confirm the balance and how payments posted',
      'Pay in full, set up an installment agreement, or request currently-not-collectible status',
      'Ask about first-time penalty abatement',
    ],
    commonErrors: [
      'Assuming a paused-reminder balance was forgiven',
      'Interest and penalties accrued during the reminder pause that inflate the total',
    ],
    urgency: 'moderate',
    hasLandingPage: false,
  },

  CP161: {
    code: 'CP161',
    title: 'Balance due (underpaid tax, penalty, or interest)',
    meaning:
      'A balance-due notice, common for businesses, saying the IRS received your return but you did not pay the full amount owed. It is a request for payment of the unpaid tax plus any penalty and interest, not an audit.',
    deadlineDays: 21,
    deadlineDescription: 'the pay-by date on the notice, typically within 21 days (10 days for some balances)',
    deadlineFor: 'paying or disputing the balance before penalties and interest grow',
    ifIgnored: 'The balance enters the collection sequence with reminder and levy notices, and penalties and interest continue.',
    options: [
      'Compare the balance to your filed return and payment records',
      'Check for a payment credited to the wrong period or entity',
      'Pay, or request an installment agreement; ask about penalty abatement',
    ],
    commonErrors: [
      'A federal tax deposit or payment applied to the wrong quarter',
      'A penalty that qualifies for first-time abatement',
    ],
    urgency: 'moderate',
    hasLandingPage: false,
  },

  CP90: {
    code: 'CP90',
    aliases: ['CP297'],
    title: 'Final Notice of Intent to Levy and your right to a hearing',
    meaning:
      'A Final Notice of Intent to Levy (the business equivalent is CP297). Like LT11, it is the last notice before the IRS can levy, and it carries Collection Due Process hearing rights.',
    deadlineDays: 30,
    deadlineDescription: '30 days from the notice date',
    deadlineFor: 'requesting a Collection Due Process hearing on Form 12153',
    ifIgnored: 'The IRS can levy bank accounts, wages, and other assets after the 30-day window closes.',
    options: [
      'File Form 12153 within 30 days to request a CDP hearing',
      'Verify the underlying balance and check for abatable penalties',
      'Prepare financials for a collection alternative',
    ],
    commonErrors: [
      'Confusing CP90 with the earlier CP504 (only the final notice grants CDP rights and a levy pause)',
      'Missing the 30-day hearing window',
    ],
    urgency: 'critical',
    hasLandingPage: false,
  },

  CP11: {
    code: 'CP11',
    title: 'Math-error change that created a balance due',
    meaning:
      'The IRS made a change to your return because of a miscalculation and the change resulted in tax owed. You have the right to dispute the change; if you do not, it stands.',
    deadlineDays: 60,
    deadlineDescription: '60 days from the notice date to dispute the change (pay-by date may be sooner)',
    deadlineFor: 'disputing the math-error adjustment before it becomes final',
    ifIgnored: 'The adjustment becomes final, the balance is assessed, and normal collection begins.',
    options: [
      'Compare the IRS change against your return to see which line was recomputed',
      'If you disagree, contact the IRS within 60 days to preserve your dispute rights',
      'If you agree, pay or set up a plan',
    ],
    commonErrors: [
      'A credit (such as a stimulus, CTC, or EITC amount) the IRS recalculated differently',
      'A dependent or filing-status entry that changed the math',
    ],
    urgency: 'moderate',
    hasLandingPage: false,
  },

  CP12: {
    code: 'CP12',
    title: 'Math-error change that adjusted your refund',
    meaning:
      'The IRS corrected one or more mistakes on your return and the correction changed your refund (up or down). It is not an audit. You can accept it or dispute it.',
    deadlineDays: 60,
    deadlineDescription: '60 days from the notice date to dispute the change',
    deadlineFor: 'disputing the correction if you believe your original figures were right',
    ifIgnored: 'The corrected refund stands; if you disagree and miss the window, reversing it is harder.',
    options: [
      'Compare the corrected figures against your return',
      'If you disagree, contact the IRS within 60 days with your support',
      'If you agree, no action is needed and the adjusted refund is issued',
    ],
    commonErrors: [
      'A recovery-rebate, CTC, or EITC amount recomputed by the IRS',
      'A transposed number or a credit claimed on the wrong line',
    ],
    urgency: 'low',
    hasLandingPage: false,
  },
};

/**
 * Normalize a user-typed code: uppercase, drop all spaces/dashes/dots.
 * "CP 2000", "cp-2000" -> "CP2000"; "Notice of Deficiency" -> "NOTICEOFDEFICIENCY".
 * We do NOT strip a leading "NOTICE"/"LETTER" here so that multi-word aliases
 * (e.g. NOTICEOFDEFICIENCY) still match; the leading word is stripped separately
 * in lookupNotice for the "Notice CP2000" -> CP2000 case.
 */
export function normalizeCode(raw: string): string {
  let s = raw.toUpperCase().trim().replace(/[\s._-]/g, '');
  if (/^LTR\d/.test(s)) s = s.replace(/^LTR/, 'L'); // LTR1058 -> L1058
  return s;
}

/** Drop a leading NOTICE/LETTER word: "NOTICECP2000" -> "CP2000". */
function stripLeadingWord(norm: string): string {
  return norm.replace(/^(NOTICE|LETTER)/, '');
}

/** Resolve a normalized code (including aliases) to a profile, or null. */
export function lookupNotice(raw: string): NoticeProfile | null {
  const norm = normalizeCode(raw);
  const stripped = stripLeadingWord(norm);
  if (NOTICES[norm]) return NOTICES[norm];
  if (stripped !== norm && NOTICES[stripped]) return NOTICES[stripped];
  for (const profile of Object.values(NOTICES)) {
    if (profile.aliases?.some((a) => {
      const an = normalizeCode(a);
      return an === norm || an === stripped;
    })) {
      return profile;
    }
  }
  return null;
}

/** Every canonical code we cover (for docs/tests). */
export const COVERED_CODES = Object.keys(NOTICES);
