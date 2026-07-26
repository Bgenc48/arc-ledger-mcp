import { z } from 'zod';
import { output } from '../lib/response';
import { SOURCE, GO } from '../lib/config';
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
    .describe('Why you think a US taxpayer ID may be needed. file_us_tax_return = you must file a US return; owner_of_us_llc = you own a US LLC or corporation, which does not by itself establish a personal ITIN need; claim_treaty_benefit = a treaty claim may require a TIN; spouse_or_dependent = a US return may need a spouse or dependent TIN; third_party_withholding = a payer has a reporting or withholding requirement; open_us_bank_or_other = another reason.'),
  is_foreign_national: z
    .boolean()
    .optional()
    .describe('Whether you are a non-US citizen without US immigration status that grants an SSN. Defaults to true.'),
});

const NEXT_STEP = {
  label: 'Review whether a federal tax purpose supports Form W-7 - free 15-minute call with an Enrolled Agent',
  url: GO.book15min,
};

const DOCUMENT_NOTE =
  'Arc & Ledger is an Enrolled Agent practice. We prepare your Form W-7, review your documents, determine your reason category, and represent you before the IRS. You submit a passport or other permitted identification as an original or a certified copy from the issuing agency; ordinary notarized copies are not accepted. To avoid mailing an original passport, an eligible applicant may use an IRS-authorized Certifying Acceptance Agent (CAA) or a designated IRS Taxpayer Assistance Center. An ordinary Acceptance Agent helps prepare the application but must send the required originals or issuing-agency certified copies to the IRS.';

function run(args: z.infer<typeof input>) {
  const foreign = args.is_foreign_national ?? true;

  if (args.has_ssn) {
    return output(
      'You are not eligible for an ITIN because you already have or can get a Social Security Number. Use your SSN as your taxpayer ID; an ITIN is only for people who cannot get an SSN.',
      {
        eligibility_status: 'not_eligible_ssn_available',
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
    {
      category: string;
      status:
        | 'likely_eligible_with_required_return'
        | 'possible_exception_requires_documentation'
        | 'not_established_by_entity_ownership'
        | 'not_eligible_on_reason_alone';
      needs_return: boolean;
      note: string;
    }
  > = {
    file_us_tax_return: {
      category: 'Usually box b or c, depending on whether the applicant is a nonresident or resident alien required to file a US return.',
      status: 'likely_eligible_with_required_return',
      needs_return: true,
      note: 'A person who cannot obtain an SSN and must file a US federal tax return generally attaches Form W-7 to the return that creates the need.',
    },
    owner_of_us_llc: {
      category: 'Entity ownership alone does not select a Form W-7 box or establish a personal ITIN requirement.',
      status: 'not_established_by_entity_ownership',
      needs_return: false,
      note: 'A foreign-owned US entity generally needs its own EIN. Form 5472 can use a consistently assigned reference ID for a foreign owner when no US identifying number is entered. A personal ITIN requires a separate federal tax purpose supported by the current Form W-7 rules.',
    },
    claim_treaty_benefit: {
      category: 'Usually box a for a nonresident alien claiming an applicable treaty benefit.',
      status: 'possible_exception_requires_documentation',
      needs_return: false,
      note: 'A current Form W-7 exception may allow an application without a tax return when the treaty claim and withholding or reporting requirement are documented. The treaty article, payer documentation, and TIN rules must be checked.',
    },
    spouse_or_dependent: {
      category: 'Box d, e, or g may apply, depending on the filer, immigration category, and allowed federal tax benefit.',
      status: 'possible_exception_requires_documentation',
      needs_return: true,
      note: 'The application is generally attached to the return that creates the allowable spouse or dependent TIN need. Current eligibility for the claimed tax benefit and any residency documentation must be checked.',
    },
    third_party_withholding: {
      category: 'A Form W-7 exception may apply when a valid third-party reporting or withholding requirement creates a federal tax purpose.',
      status: 'possible_exception_requires_documentation',
      needs_return: false,
      note: 'A payer request alone is not enough. The current exception table controls the required payer letter, withholding certificate, partnership record, or other supporting evidence.',
    },
    open_us_bank_or_other: {
      category: 'Depends on the specific need - an ITIN is issued for US TAX purposes, not solely to open a bank account.',
      status: 'not_eligible_on_reason_alone',
      needs_return: false,
      note: 'An ITIN is not issued merely to open a bank account. If there is an underlying US tax reason (income, withholding, a treaty claim), one of the other categories applies.',
    },
  };

  const r = REASONS[args.reason]!;
  const status = foreign ? r.status : 'needs_ssn_eligibility_review';

  const fields = {
    eligibility_status: status,
    itin_purpose: 'An ITIN (Individual Taxpayer Identification Number) is a US tax processing number for people who have a federal tax purpose but cannot get an SSN.',
    your_reason_category: r.category,
    reason_screen: r.note,
    tax_return_required_with_application: r.needs_return,
    documents_needed: [
      'Form W-7 after a qualifying federal tax purpose and the correct reason box are confirmed.',
      'A valid passport, or the permitted combination of other identification listed in the current Form W-7 instructions, submitted as originals or issuing-agency certified copies. Ordinary notarized copies are not accepted.',
      r.needs_return
        ? 'The US tax return that creates the requirement (attached to the W-7), unless an exception applies.'
        : 'The exact documentation required by the applicable current Form W-7 exception, if an exception applies.',
    ],
    document_handling: DOCUMENT_NOTE,
    official_sources: [
      'https://www.irs.gov/instructions/iw7',
      'https://www.irs.gov/tin/itin/itin-supporting-documents',
      ...(args.reason === 'owner_of_us_llc' ? ['https://www.irs.gov/instructions/i5472'] : []),
    ],
    caveats: [
      'An ITIN does not authorize work in the US, is not an SSN, and provides no immigration status.',
      'ITINs not used on a US return for three consecutive years expire and must be renewed.',
      'This screen does not approve an ITIN application. The IRS decides eligibility from the current Form W-7, the attached return or exception evidence, and the identification submitted.',
    ],
  };

  const summary =
    status === 'likely_eligible_with_required_return'
      ? 'A person who cannot obtain an SSN and must file a US federal tax return can generally apply for an ITIN on Form W-7 attached to that return. This screen does not approve eligibility; verify the correct W-7 reason and current document requirements.'
      : status === 'not_established_by_entity_ownership'
        ? 'Foreign ownership of a US LLC does not by itself establish a personal ITIN requirement. The entity generally needs its own EIN, and Form 5472 can use a reference ID for a foreign owner when no US identifying number is entered. Confirm a separate federal tax purpose before preparing Form W-7.'
        : status === 'not_eligible_on_reason_alone'
          ? 'Opening a bank account or another non-tax purpose does not by itself qualify someone for an ITIN. A separate federal filing, reporting, withholding, or treaty purpose must be documented.'
          : 'This reason may support a Form W-7 exception, but the current exception table and supporting evidence control. Verify the federal tax purpose, reason box, and required documentation before applying.';

  return output(summary, fields, SOURCE.itin, NEXT_STEP);
}

export const checkItinEligibility: ToolDef<typeof input> = {
  name: 'check_itin_eligibility',
  title: 'Screen an ITIN reason and application path',
  description:
    'Use this when someone asks whether a federal tax purpose may support an ITIN application or what a Form W-7 path generally requires. Returns a reason-specific screen, whether a return is commonly attached, current document-handling cautions, and official sources. Entity ownership or a bank request alone does not establish personal ITIN eligibility.',
  input,
  annotations: { title: 'Screen an ITIN reason', readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  logEnums: (args) => ({
    has_ssn: args.has_ssn,
    reason: args.reason,
    is_foreign_national: args.is_foreign_national ?? true,
  }),
  run,
};
