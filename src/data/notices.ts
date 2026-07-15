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

  CP05: {
    code: 'CP05',
    title: 'Your return is being reviewed and your refund is on hold',
    meaning:
      'The IRS is verifying items on your return (income, withholding, or credits claimed) before releasing your refund. It is a pre-refund review, not an audit, and the CP05 itself asks for nothing: it tells you to wait, typically up to 60 days.',
    deadlineDays: null,
    deadlineDescription: 'no response deadline on a CP05; the IRS asks you to allow up to 60 days for the review',
    deadlineFor: 'waiting out the review (respond only if a follow-up letter asks for documents)',
    ifIgnored:
      'There is nothing to ignore yet. If the review finds a mismatch you will get a follow-up (a CP05A asking for documents, or an adjustment notice); if you hear nothing after 60 days you can contact the IRS or the Taxpayer Advocate Service.',
    options: [
      'Verify the return you filed matches your W-2s and 1099s so a follow-up holds no surprises',
      'Watch for a CP05A, which DOES have a deadline and asks for proof of income and withholding',
      'After 60 days with no letter and no refund, call the IRS or engage the Taxpayer Advocate Service',
      'Check your IRS account transcript for a refund-freeze code update instead of calling',
    ],
    commonErrors: [
      'An employer that filed W-2s late, so the IRS cannot verify your withholding yet',
      'Withholding or estimated payments that do not match IRS records',
    ],
    urgency: 'low',
    hasLandingPage: true,
    slug: 'cp05',
  },

  CP05A: {
    code: 'CP05A',
    title: 'The refund review now needs your documents',
    meaning:
      'A follow-up to the CP05 refund review: the IRS could not verify something (usually income or withholding) from third-party records and is asking YOU to prove it before the refund is released.',
    deadlineDays: 30,
    deadlineDescription: '30 days from the notice date to send the requested documentation',
    deadlineFor: 'sending proof of the income, withholding, or credits under review',
    ifIgnored:
      'The IRS can adjust the return without your input: the refund shrinks or disappears, and reversing that afterward is slower than answering the letter.',
    options: [
      'Send exactly what the notice lists: pay stubs, W-2s, 1099s, or a letter from the payer on letterhead',
      'Use the fax number or upload tool on the notice and keep proof of transmission',
      'If an employer never filed its W-2, get a wage letter from them; that is the usual sticking point',
      'An Enrolled Agent can assemble and submit the response and speak to the IRS for you',
    ],
    commonErrors: [
      'Withholding claimed from an employer whose payroll filings never reached the IRS',
      'A household employer or small payer that issued a W-2 but filed nothing with the SSA',
    ],
    urgency: 'high',
    hasLandingPage: false,
  },

  CP75: {
    code: 'CP75',
    aliases: ['CP75A', 'CP75D'],
    title: 'Credit audit: refund frozen until you send proof (EITC and related credits)',
    meaning:
      'A correspondence audit of credits on your return, most often the Earned Income Tax Credit, Child Tax Credit, American Opportunity Credit, or Head of Household status. The refund portion tied to the credits is frozen until you substantiate them (CP75A and CP75D are variants of the same audit).',
    deadlineDays: 30,
    deadlineDescription: '30 days from the notice date to send the documentation listed',
    deadlineFor: 'proving eligibility for the audited credits (the Form 886-H series lists acceptable documents)',
    ifIgnored:
      'The credits are disallowed, the refund is recalculated or reversed, and repeated disallowance can bar you from claiming the EITC for 2 to 10 years.',
    options: [
      'Match your documents to the Form 886-H checklists named in the notice (school, medical, or lease records proving a child lived with you; income proof for EITC)',
      'Send copies (never originals) by the method the notice specifies and keep proof of delivery',
      'If a document does not exist, send the closest substitute with a short explanation letter',
      'An Enrolled Agent can manage the audit correspondence and appeal a disallowance',
    ],
    commonErrors: [
      'A qualifying child claimed by two households (divorced or separated parents) without the tie-breaker rules applied',
      'School or medical records that show a different address than the return',
      'Self-employment income claimed for EITC without books or 1099s behind it',
    ],
    urgency: 'high',
    hasLandingPage: false,
  },

  '12C': {
    code: '12C',
    aliases: ['L12C', 'LETTER12C'],
    title: 'Letter 12C: your return is missing something (refund on hold until you reply)',
    meaning:
      'The IRS received your return but cannot finish processing it without more information. The most common trigger is marketplace health coverage: Form 1095-A was issued but the return is missing the Form 8962 premium tax credit reconciliation. Missing schedules, missing signatures, and unverified withholding are other classic causes.',
    deadlineDays: 20,
    deadlineDescription: '20 days from the letter date (the letter states the exact window)',
    deadlineFor: 'sending the missing form, schedule, or verification so processing can resume',
    ifIgnored:
      'The return sits unprocessed and any refund stays frozen; eventually the IRS adjusts or rejects the claimed items (for the 8962 case, the advance premium credit gets reconciled against you by default).',
    options: [
      'Read the checkbox list carefully: send ONLY what is requested, with the letter (or its cover sheet) on top',
      'For the 1095-A / 8962 case: pull your 1095-A from the marketplace account, complete Form 8962, and fax or upload both per the letter',
      'Do NOT file an amended return to answer a 12C; reply to the letter itself',
      'Keep proof of the fax or upload; processing typically resumes in 6 to 8 weeks',
    ],
    commonErrors: [
      'Filing without Form 8962 after a year with marketplace coverage (often because a dependent was on a marketplace policy)',
      'A blank or wrong second-lowest-cost-silver-plan column on the 1095-A carried into the 8962',
      'An unsigned paper return or a missing schedule the software dropped',
    ],
    urgency: 'high',
    hasLandingPage: false,
  },

  '5071C': {
    code: '5071C',
    aliases: ['L5071C', '5747C', 'L5747C', '6331C', 'L6331C'],
    title: 'Identity verification hold: confirm it was really you who filed',
    meaning:
      'The IRS flagged a return filed under your SSN as potentially not yours and will not process it until you verify your identity. Letter 5071C offers online or phone verification; the 5747C variant requires an in-person appointment; 6331C works like 5071C. Your refund does not move until this is done.',
    deadlineDays: null,
    deadlineDescription: 'no fixed statutory clock, but the return is NOT processed until you verify; act promptly',
    deadlineFor: 'verifying your identity (or reporting that the return is not yours)',
    ifIgnored:
      'The return is never processed: no refund, and a legitimate balance-due return counts as unfiled. If the return was a thief\'s, ignoring the letter also delays the identity-theft cleanup.',
    options: [
      'Use the IRS Identity Verification Service link in the letter (or the phone number it lists) with the letter, the tax return in question, and a prior-year return at hand',
      'For a 5747C, book the in-person Taxpayer Assistance Center appointment it requires',
      'If YOU did not file the return, say so during verification: the IRS pulls the fraudulent return and starts identity-theft procedures',
      'Consider an Identity Protection PIN (IP PIN) going forward so paper filings under your SSN stop',
    ],
    commonErrors: [
      'Treating the letter as a scam and ignoring it (verify through irs.gov, not links in emails or texts; the IRS letter arrives by postal mail)',
      'Trying to verify before having the exact return and prior-year return in front of you',
    ],
    urgency: 'high',
    hasLandingPage: true,
    slug: '5071c',
  },

  '4883C': {
    code: '4883C',
    aliases: ['L4883C'],
    title: 'Identity verification by phone: call before your return is processed',
    meaning:
      'Like the 5071C, the IRS suspects a return filed under your SSN may not be yours, but this letter requires you to CALL the toll-free number it lists (there is no online option for a 4883C). Processing and any refund are paused until the call happens.',
    deadlineDays: null,
    deadlineDescription: 'no fixed statutory clock, but nothing processes until you call; act promptly',
    deadlineFor: 'calling the number on the letter to confirm or deny the return',
    ifIgnored: 'The return stays unprocessed indefinitely: no refund, and a real balance-due return is treated as unfiled.',
    options: [
      'Call the number ON THE LETTER with the letter, the flagged return, a prior-year return, and supporting documents (W-2s, 1099s) in front of you',
      'If you did not file the return, tell the agent; the IRS removes it and begins identity-theft steps',
      'Lines are busiest Mondays and mornings; midweek afternoons connect faster',
      'An Enrolled Agent with authorization can work the identity and account issues with the IRS on your behalf',
    ],
    commonErrors: [
      'Calling the general IRS line instead of the dedicated number on the letter',
      'Not having the prior-year return available, which the agent uses for the quiz',
    ],
    urgency: 'high',
    hasLandingPage: false,
  },

  CP59: {
    code: 'CP59',
    aliases: ['CP515', 'CP516', 'CP518'],
    title: 'The IRS has no record of a required return (unfiled-return notice)',
    meaning:
      'The IRS believes you were required to file a return for the year shown and has no record of one. CP59 is the first notice; CP516 and CP518 are the escalating reminders. Third-party forms (W-2s, 1099s) under your SSN are usually what convinced the IRS a return is due.',
    deadlineDays: null,
    deadlineDescription: 'no single statutory clock; file or respond promptly, because the IRS can eventually file FOR you',
    deadlineFor: 'filing the missing return, proving you already filed, or explaining why you are not required to file',
    ifIgnored:
      'The IRS can prepare a Substitute for Return (SFR) from the third-party forms: single or married-filing-separately status, zero deductions, zero basis on asset sales, then assess the inflated tax and start collection. Any refund from the real return is forfeited 3 years after the original due date.',
    options: [
      'File the actual return, even years late: a real return almost always beats the SFR math and replaces it',
      'Already filed? Send a signed copy with proof of the original filing',
      'Below the filing threshold? Respond with the explanation form the notice includes',
      'Multiple unfiled years: pull IRS wage-and-income transcripts first so nothing reported is missed, then file them together (an Enrolled Agent can pull transcripts with authorization)',
    ],
    commonErrors: [
      'Assuming no refund means no need to file (the refund dies after 3 years, and the SFR risk remains)',
      'Filing the missing year without checking the other years the IRS also flagged',
      'A return that was mailed but never processed and needs to be re-sent',
    ],
    urgency: 'high',
    hasLandingPage: false,
  },

  CP80: {
    code: 'CP80',
    title: 'Payments are sitting on your account but no return was filed',
    meaning:
      'The IRS is holding credits for the year shown (withholding, estimated payments, or a payment you sent) but has no return on file to apply them to. Common after a mailed return went missing or was never processed.',
    deadlineDays: null,
    deadlineDescription:
      'file before the refund statute closes: generally 3 years from the original due date, or the credit is lost',
    deadlineFor: 'filing (or re-sending) the return so the credits are applied or refunded',
    ifIgnored:
      'The credit sits until the refund statute expires, then the money is forfeited even though the IRS is holding it. If a return was actually due, unfiled-return notices can follow too.',
    options: [
      'If you already filed, send a newly signed copy of the same return (write nothing changed) with proof of the original submission if you have it',
      'If you never filed, file now to claim the credit before the 3-year window closes',
      'Verify the credited amount against your own payment records and withholding',
      'Use certified mail or e-file so the re-filed return cannot vanish the same way',
    ],
    commonErrors: [
      'A paper return lost in processing while the payments posted',
      'An extension payment or estimated payments made, then the return itself forgotten',
    ],
    urgency: 'moderate',
    hasLandingPage: false,
  },

  CP21A: {
    code: 'CP21A',
    aliases: ['CP21B', 'CP21C', 'CP21E', 'CP21I'],
    title: 'The IRS changed your return (CP21 series): confirm it matches what you expected',
    meaning:
      'Confirmation that the IRS adjusted the year shown. The version letter tells the direction: CP21A means the change created a balance due, CP21B a refund, CP21C no net change, CP21E a change from a recent audit. Usually it follows an amended return or a response you sent.',
    deadlineDays: 21,
    deadlineDescription: 'if a balance is due, the pay-by date on the notice, typically 21 days from the notice date',
    deadlineFor: 'paying a resulting balance, or disputing the adjustment if it is not what you requested',
    ifIgnored:
      'A balance-due version rolls into the normal collection sequence (CP501, CP503, CP504) with growing penalties and interest. A refund version needs no action, but an unexpected adjustment left unchallenged becomes final.',
    options: [
      'Compare the adjustment line by line against the amended return or correspondence that triggered it',
      'If it matches: pay any balance, or expect the refund (typically 2 to 3 weeks behind the notice)',
      'If it does NOT match what you submitted, call the number on the notice or respond in writing with your copy',
      'Check that penalties and interest were recomputed correctly after the change',
    ],
    commonErrors: [
      'An amended return partially processed, so only some of the requested changes appear',
      'An IRS-initiated change riding along with the one you asked for',
    ],
    urgency: 'moderate',
    hasLandingPage: false,
  },

  CP22A: {
    code: 'CP22A',
    aliases: ['CP22E'],
    title: 'Your return was changed based on information you provided, and you owe',
    meaning:
      'The IRS processed a change to your return (from an amended return, a response, or in the CP22E version, an examination) and the result is a balance due of $5 or more. It is a bill for the adjusted amount, including recalculated penalties and interest.',
    deadlineDays: 21,
    deadlineDescription: 'the pay-by date on the notice, typically 21 days from the notice date',
    deadlineFor: 'paying the adjusted balance or disputing an adjustment you never requested',
    ifIgnored: 'The balance enters the collection sequence (CP501, CP503, CP504, then a final levy notice) while penalties and interest accrue.',
    options: [
      'Verify the adjustment against what you actually submitted before paying',
      'Pay online, or set up a short-term plan or installment agreement if you cannot pay in full',
      'If the change is not what you requested, respond with your documentation immediately',
      'Ask about first-time penalty abatement if you have a clean compliance history',
    ],
    commonErrors: [
      'An amendment keyed differently than submitted (transposed figures)',
      'Withholding or estimated payments dropped during the adjustment',
    ],
    urgency: 'moderate',
    hasLandingPage: false,
  },

  CP23: {
    code: 'CP23',
    title: 'Estimated-payment mismatch: the IRS shows fewer payments than your return claimed',
    meaning:
      'The estimated tax payments claimed on your return do not match the payments posted to your IRS account, and the difference (plus any related penalty and interest) is billed as a balance due.',
    deadlineDays: 21,
    deadlineDescription: 'the pay-by date on the notice, typically 21 days from the notice date',
    deadlineFor: 'paying the difference, or proving the missing payments were actually made',
    ifIgnored: 'The balance moves into the collection sequence while penalties and interest grow, even when the real problem is a misapplied payment.',
    options: [
      'Pull your IRS account transcript and list every payment with dates and confirmation numbers before paying anything',
      'The classic fix: a payment applied to the wrong tax YEAR or to the wrong SPOUSE\'s account on a joint return; ask the IRS to move it',
      'Send proof of the missing payments (bank statements, EFTPS or Direct Pay confirmations) with the notice stub',
      'If the notice is right, pay or set up a plan, and fix the estimated-payment schedule going forward',
    ],
    commonErrors: [
      'A January Q4 payment recorded in the wrong tax year',
      'Payments made under one spouse\'s SSN not credited to the joint return',
      'A fourth-quarter payment claimed on the return but never actually made',
    ],
    urgency: 'moderate',
    hasLandingPage: false,
  },

  CP49: {
    code: 'CP49',
    title: 'Your refund was applied to another tax debt you owe',
    meaning:
      'The IRS took some or all of this year\'s refund and applied it to a balance you owe for another tax year. The notice shows which year absorbed the money and any refund remainder being sent.',
    deadlineDays: null,
    deadlineDescription: 'no response deadline; informational unless you dispute the underlying debt',
    deadlineFor: 'reviewing whether the debt the refund was applied to is actually correct',
    ifIgnored: 'Nothing further happens from this notice itself, but an incorrect underlying balance keeps eating future refunds until challenged.',
    options: [
      'Check the year the refund was applied to: if that balance is wrong or already paid, dispute it with your records',
      'If the offset balance is real, consider resolving it (payment plan or penalty abatement) so future refunds stop disappearing',
      'Non-IRS offsets (state tax, child support, federal student loans) come through the Treasury Offset Program with a different notice; the dispute path runs through that agency',
      'Injured-spouse relief (Form 8379) can recover a joint refund taken for a debt that is only your spouse\'s',
    ],
    commonErrors: [
      'The underlying balance includes penalties that qualify for abatement',
      'A refund offset against a year that was later corrected but never refreshed',
    ],
    urgency: 'low',
    hasLandingPage: false,
  },

  CP523: {
    code: 'CP523',
    title: 'Your installment agreement is in default and the IRS intends to terminate it',
    meaning:
      'You have a payment plan with the IRS and something broke it: a missed installment, a new balance from a recent return, or an unfiled return. The IRS intends to terminate the agreement 30 days from the notice date, after which enforced collection (including levy) can resume.',
    deadlineDays: 30,
    deadlineDescription: '30 days from the notice date before the agreement terminates',
    deadlineFor: 'curing the default (catching up payments or fixing the new issue) or contacting the IRS to reinstate or restructure',
    ifIgnored:
      'The agreement terminates, the full balance is due at once, and levy action can follow. Reinstating after termination is harder than curing the default inside the 30 days.',
    options: [
      'Fix the specific default named on the notice: make up the missed payments, file the missing return, or address the new balance',
      'Call the number on the notice to reinstate or restructure the plan (a new balance can often be rolled into the existing agreement)',
      'If the payment amount became unaffordable, ask about restructuring or Currently Not Collectible status instead of silently defaulting',
      'You may have appeal rights (CAP) before termination takes effect; ask when you call',
    ],
    commonErrors: [
      'A new year\'s balance created while the plan was active (the most common default trigger)',
      'A direct-debit payment that failed after a bank change',
      'Assuming one missed payment cancels everything (it is usually curable inside the window)',
    ],
    urgency: 'high',
    hasLandingPage: true,
    slug: 'cp523',
  },

  CP71C: {
    code: 'CP71C',
    aliases: ['CP71', 'CP71A', 'CP71D'],
    title: 'Annual reminder of a balance you still owe',
    meaning:
      'The yearly statement the law requires the IRS to send while a balance remains: the amount owed for the year shown, updated with accrued penalties and interest. It is not a new assessment and usually not a new collection action.',
    deadlineDays: null,
    deadlineDescription: 'no new deadline; the balance simply continues to accrue penalties and interest',
    deadlineFor: 'reviewing the balance and choosing a resolution path if you have not already',
    ifIgnored:
      'Nothing new happens because of this notice, but the balance keeps growing and the regular collection notices can resume or continue. Balances certified as seriously delinquent can also affect passport eligibility.',
    options: [
      'Verify the figure against your transcript, especially the penalty and interest accruals',
      'If you are already in an installment agreement or Currently Not Collectible status, no action is needed; the reminder is statutory',
      'Use it as the annual prompt to re-check resolution options: payment plan, penalty abatement, or an Offer in Compromise fit-check',
      'Watch the collection statute: the IRS generally has 10 years from assessment to collect',
    ],
    commonErrors: [
      'Penalties in the balance that qualify for first-time abatement and were never requested',
      'Assuming the annual reminder means a levy is imminent (it is a statement, not a final notice)',
    ],
    urgency: 'low',
    hasLandingPage: false,
  },

  CP215: {
    code: 'CP215',
    aliases: ['CP15'],
    title: 'Civil penalty assessed (common for late or missing information returns)',
    meaning:
      'A civil penalty was charged to the business account for the year shown (CP15 is the individual version). Frequent causes: a late or incomplete Form 5472 for a foreign-owned US LLC or corporation ($25,000 per form), late Form 5471, late partnership or S-corp returns (a per-owner, per-month penalty), late W-2s or 1099s, and late Forms 3520/3520-A for foreign trusts and large foreign gifts.',
    deadlineDays: null,
    deadlineDescription:
      'the pay-by date on the notice (interest runs from the assessment); penalty-relief requests should move quickly, and some penalties carry a short window for a formal protest',
    deadlineFor: 'paying, or requesting abatement with a reasonable-cause statement (or appealing where the notice offers it)',
    ifIgnored:
      'The penalty enters normal collection (reminder notices, then levy notices) with interest accruing. International information-return penalties are actively assessed and do not fade with time.',
    options: [
      'Identify the exact penalty code and form behind it (the notice states the Internal Revenue Code section)',
      'File the missing or corrected form immediately if it is still outstanding; relief is rarely available while the form is missing',
      'Request abatement with a documented reasonable-cause statement (illness, disaster, reliance on wrong professional advice, first year of a new obligation)',
      'First-time abatement can apply to late-filing penalties on income returns (1120, 1120-S, 1065) but generally NOT to international information-return penalties like the 5472; those need reasonable cause',
      'These penalties are routinely contested: an Enrolled Agent can prepare the abatement case and represent the entity before the IRS',
    ],
    commonErrors: [
      'A foreign-owned single-member LLC that did not know the pro-forma 1120 + Form 5472 filing existed',
      'A partnership or S-corp return filed a few months late without an extension: the per-partner-per-month penalty multiplies fast',
      'Penalties assessed even though the form was filed: proof of timely filing reverses them',
    ],
    urgency: 'high',
    hasLandingPage: true,
    slug: 'cp215',
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
