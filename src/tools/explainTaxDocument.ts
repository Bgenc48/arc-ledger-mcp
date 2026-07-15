import { z } from 'zod';
import { output } from '../lib/response';
import { sanitizeNoticeCodeEcho } from '../lib/sanitize';
import { SOURCE, GO } from '../lib/config';
import { lookupTaxDocument, normalizeDocCode, COVERED_DOCUMENTS } from '../data/taxDocuments';
import type { NextStep, ToolDef } from '../lib/types';

const input = z.object({
  document: z
    .string()
    .min(1)
    .max(40)
    .describe(
      'The tax form or document name as printed on it, e.g. "W-2", "1099-K", "1099-NEC", "Schedule K-1 (Form 1065)", "1042-S", "1098-T", "SSA-1099", "1095-A", "W-9".',
    ),
  brief: z
    .boolean()
    .optional()
    .describe('Set true for a shorter answer: skips the box-by-box guide and the pre-filing checklist.'),
});

/**
 * The handoff is the FREE 15-minute call (same shape as get_document_checklist):
 * no price in the label, no checkout link, compliant with both directories'
 * advertising rules.
 */
const NEXT_STEP: NextStep = {
  label: 'Questions about how this form lands on your return? Free 15-minute call with an Enrolled Agent',
  url: GO.book15min,
};

/**
 * source_url per document: the on-site page that best backs the answer.
 * Documents without a specialized page fall back to the individual-tax page.
 */
const SOURCE_OVERRIDES: Record<string, string> = {
  '1099K': SOURCE.ecommerce,
  K11065: SOURCE.llcScorp,
  K11120S: SOURCE.llcScorp,
  '1042S': SOURCE.international,
  W8BEN: SOURCE.international,
};

const GENERIC_HOW_TO_READ = [
  'Find the form number in the top corner (W-2, 1099-something, 1098-something, K-1) and the tax year it covers.',
  'Identify who issued it; their copy also went to the IRS, so the numbers will be matched against your return.',
  'Compare every dollar figure against your own records before filing; issuer errors are common and correctable.',
  'A missing form does not make income disappear: report what you actually received, and a form you did not expect usually means someone reported a payment under your taxpayer ID.',
  'Keep every information form with that year\'s tax records.',
];

function run(args: z.infer<typeof input>) {
  const profile = lookupTaxDocument(args.document);
  // Unrecognized names are caller-controlled text that gets echoed into the
  // response, so restrict the echo to a plausible code shape (A-Z0-9 only).
  const canonical = profile?.code ?? sanitizeNoticeCodeEcho(normalizeDocCode(args.document));

  if (!profile) {
    const fields = {
      document: canonical,
      recognized: false,
      message:
        'We do not have a specific profile for this document, but here is how to read any US tax form. If it is an IRS letter or notice (a CP or LT code), use the decode_irs_notice tool instead.',
      ...(args.brief ? {} : { how_to_read_any_tax_form: GENERIC_HOW_TO_READ, covered_documents: COVERED_DOCUMENTS }),
    };
    const summary =
      `We do not have a specific profile for "${canonical}". General rule for any US tax form: the issuer sent the IRS a copy, ` +
      `so verify every figure against your records and report the income even when a form never arrives. ` +
      `If it is an IRS letter (CP or LT code), use decode_irs_notice. An Enrolled Agent can review the exact document with you.`;
    return output(summary, fields, SOURCE.individualTax, NEXT_STEP);
  }

  const sourceUrl = SOURCE_OVERRIDES[profile.id] ?? SOURCE.individualTax;

  const fields = {
    document: profile.code,
    recognized: true,
    title: profile.title,
    what_it_is: profile.whatItIs,
    who_sends_it_and_when: profile.whoSendsIt,
    where_it_goes_on_your_return: profile.whereItGoes,
    ...(args.brief ? {} : { key_boxes: profile.keyBoxes, check_before_filing: profile.checkBeforeFiling }),
    if_wrong_or_missing: profile.ifWrongOrMissing,
    how_the_irs_uses_it: profile.howIrsUsesIt,
    ...(profile.professionalHelpWhen && !args.brief
      ? { professional_help_common_when: profile.professionalHelpWhen }
      : {}),
    related_tools:
      'For an IRS letter about this form (a CP2000 mismatch, a 12C information request), use decode_irs_notice. For what to gather for a filing, use get_document_checklist.',
  };

  const summary =
    `${profile.code}: ${profile.title}. ${profile.whatItIs} ` +
    `Where it goes on your return: ${profile.whereItGoes} ` +
    `If it is wrong or missing: ${profile.ifWrongOrMissing}`;

  return output(summary, fields, sourceUrl, NEXT_STEP);
}

export const explainTaxDocument: ToolDef<typeof input> = {
  name: 'explain_tax_document',
  title: 'Explain a tax document',
  description:
    'Use this when a user receives a US tax form or information document and wants to know what it is, why they got it, which boxes matter, where it goes on their return, what to double-check, or what to do if it is wrong, duplicated, or never arrived. Covers W-2, W-2G, the 1099 family (NEC, MISC, K, INT, DIV, B, DA, R, G, C, S, SA, Q), Schedule K-1 (partnership 1065, S-corp 1120-S, estate/trust 1041), SSA-1099, 1042-S, 5498, 1098, 1098-T, 1098-E, 1095-A/B/C, and W-9 / W-8BEN requests. For IRS letters and notices (CP or LT codes) use decode_irs_notice instead. Set brief:true for a shorter answer.',
  input,
  annotations: { title: 'Explain a tax document', readOnlyHint: true, openWorldHint: false },
  logEnums: (args) => {
    const p = lookupTaxDocument(args.document);
    return {
      document: p?.id ?? 'unknown',
      recognized: !!p,
      brief: args.brief ?? false,
    };
  },
  run,
};
