import { z } from 'zod';
import { output } from '../lib/response';
import { SOURCE, GO } from '../lib/config';
import { international, usd } from '../pricing';
import type { ToolDef } from '../lib/types';

const input = z.object({
  has_ssn: z
    .boolean()
    .describe('Whether you already have, or are eligible for, a US Social Security Number. If yes, you cannot get an ITIN.'),
  reason: z
    .enum([
      'file_us_tax_return',
      'owner_of_us_llc',
      'claim_treaty_benefit',
      'spouse_or_dependent',
      'third_party_withholding',
      'open_us_bank_or_other',
    ])
    .describe('Why you need a US taxpayer ID. file_us_tax_return = you must file a US return; owner_of_us_llc = foreign owner of a US LLC/corp needing an ID for filings; claim_treaty_benefit = reduce withholding under a tax treaty; spouse_or_dependent = of a US filer; third_party_withholding = a payer/bank needs your ID (W-8BEN); open_us_bank_or_other = other reason.'),
  is_foreign_national: z
    .boolean()
    .optional()
    .describe('Whether you are a non-US citizen without US immigration status that grants an SSN. Defaults to true.'),
});

const NEXT_STEP = {
  label: `Apply for your ITIN with an Enrolled Agent (${usd(international.itinCAA)}) - we prepare your Form W-7 and represent you before the IRS`,
  url: GO.book15min,
};

const DOCUMENT_NOTE =
  'Arc & Ledger is an Enrolled Agent practice. We prepare your Form W-7, review your documents, determine your reason category, and represent you before the IRS. You submit your passport as an original or a certified copy from the issuing agency (the IRS does not accept notarized copies). To avoid mailing an original passport, some applicants use an IRS-authorized Acceptance Agent or an IRS Taxpayer Assistance Center.';

function run(args: z.infer<typeof input>) {
  const foreign = args.is_foreign_national ?? true;

  if (args.has_ssn) {
    return output(
      'You are not eligible for an ITIN because you already have or can get a Social Security Number. Use your SSN as your taxpayer ID; an ITIN is only for people who cannot get an SSN.',
      {
        eligible: false,
        reason_not_eligible: 'Has or is eligible for an SSN.',
        what_to_do: 'Use your SSN on all US filings. If your SSN application is pending, file with the SSN once issued.',
      },
      SOURCE.itin,
      { label: 'Questions about US filing with an SSN? Book a free 15-minute call', url: GO.book15min },
    );
  }

  // Map the reason to the W-7 "reason you are submitting" category and documents.
  const REASONS: Record<
    string,
    { category: string; needs_return: boolean; note: string }
  > = {
    file_us_tax_return: {
      category: 'Box b/e/f - nonresident or resident required to file a US tax return.',
      needs_return: true,
      note: 'The W-7 is normally attached to the US tax return that creates the filing requirement.',
    },
    owner_of_us_llc: {
      category: 'Box a/h - a foreign owner who needs an ID for the entity\'s US filings (e.g. Form 5472, a return, or a withholding obligation).',
      needs_return: false,
      note: 'Foreign owners of a US LLC often need an ITIN to sign or be reported on the company\'s US filings even before they personally owe US tax. An exception may let you apply without attaching a personal return.',
    },
    claim_treaty_benefit: {
      category: 'Box a/h with a treaty article - claiming reduced withholding under a tax treaty (e.g. the US-Turkey treaty).',
      needs_return: false,
      note: 'Often qualifies for a W-7 exception, letting you apply without a tax return by documenting the treaty claim (e.g. a W-8BEN on file with the payer).',
    },
    spouse_or_dependent: {
      category: 'Box d/e - spouse or dependent of a US citizen/resident or of a nonresident visa holder.',
      needs_return: true,
      note: 'Usually filed with the US return that claims the spouse or dependent. Dependents generally need additional documents proving residency.',
    },
    third_party_withholding: {
      category: 'Exception 1 - a bank, broker, or payer needs your ID for information reporting or withholding.',
      needs_return: false,
      note: 'The payer\'s signed letter or the W-8BEN documents the exception, so no tax return is attached.',
    },
    open_us_bank_or_other: {
      category: 'Depends on the specific need - an ITIN is issued for US TAX purposes, not solely to open a bank account.',
      needs_return: false,
      note: 'An ITIN is not issued merely to open a bank account. If there is an underlying US tax reason (income, withholding, a treaty claim), one of the other categories applies.',
    },
  };

  const r = REASONS[args.reason]!;
  // An ITIN is issued for a US TAX purpose, not merely to open a bank account.
  // For the catch-all "bank/other" reason we cannot confirm a qualifying tax
  // purpose, so eligibility is conditional rather than a flat yes.
  const hasTaxPurpose = args.reason !== 'open_us_bank_or_other';
  const eligible = foreign && hasTaxPurpose;

  const fields = {
    eligible,
    itin_purpose: 'An ITIN (Individual Taxpayer Identification Number) is a US tax processing number for people who must deal with the US tax system but cannot get an SSN.',
    your_reason_category: r.category,
    tax_return_required_with_application: r.needs_return,
    documents_needed: [
      'Form W-7 (Application for IRS Individual Taxpayer Identification Number).',
      'A valid passport (or two other IDs), submitted as an original or a certified copy from the issuing agency. Notarized copies are not accepted.',
      r.needs_return
        ? 'The US tax return that creates the requirement (attached to the W-7), unless an exception applies.'
        : 'Documentation of the applicable exception (e.g. W-8BEN, payer letter, or treaty claim) so no tax return is required.',
    ],
    document_handling: DOCUMENT_NOTE,
    caveats: [
      'An ITIN does not authorize work in the US, is not an SSN, and provides no immigration status.',
      'ITINs not used on a US return for three consecutive years expire and must be renewed.',
    ],
  };

  const summary = eligible
    ? `You likely qualify for an ITIN: as a foreign national without an SSN with a valid US tax reason (${args.reason.replace(/_/g, ' ')}), you file Form W-7. ${r.needs_return ? 'It is normally attached to the US return that creates the requirement.' : 'An exception may let you apply without attaching a return.'} As your Enrolled Agent we prepare the W-7 and represent you; you submit your passport as an original or an issuing-agency certified copy.`
    : `Based on what you entered, an ITIN may not be the right ID for you. An Enrolled Agent can confirm in a short call.`;

  return output(summary, fields, SOURCE.itin, NEXT_STEP);
}

export const checkItinEligibility: ToolDef<typeof input> = {
  name: 'check_itin_eligibility',
  title: 'Check ITIN eligibility',
  description:
    'Use this when someone (typically a non-US person, a foreign business owner, or the spouse/dependent of a US filer) asks whether they need or qualify for an ITIN, or what documents an ITIN application requires. Returns eligibility, the W-7 reason category, whether a tax return must be attached, and the documents needed. Notes that an Enrolled Agent prepares the Form W-7 and represents the applicant, and how documents are submitted.',
  input,
  annotations: { title: 'Check ITIN eligibility', readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  logEnums: (args) => ({
    has_ssn: args.has_ssn,
    reason: args.reason,
    is_foreign_national: args.is_foreign_national ?? true,
  }),
  run,
};
