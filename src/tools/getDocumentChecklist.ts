import { z } from 'zod';
import { output } from '../lib/response';
import { SOURCE, GO } from '../lib/config';
import type { NextStep, ToolDef } from '../lib/types';

const SERVICES = [
  'individual_return',
  'self_employed_return',
  'foreign_owned_llc_5472',
  's_corp_return',
  'partnership_return',
  'fbar_streamlined_catchup',
  'itin_application',
] as const;

const input = z.object({
  service: z
    .enum(SERVICES)
    .describe(
      'What the documents are for: "individual_return" (Form 1040), "self_employed_return" (1040 with Schedule C), "foreign_owned_llc_5472" (pro-forma 1120 + Form 5472 for a foreign-owned single-member US LLC), "s_corp_return" (Form 1120-S), "partnership_return" (Form 1065), "fbar_streamlined_catchup" (late FBARs / Streamlined offshore procedures), or "itin_application" (Form W-7).',
    ),
  first_year_client: z
    .boolean()
    .optional()
    .describe('Whether this is your first year working with the firm. Adds the one-time onboarding documents (prior returns, IDs, authorizations).'),
});

/** Per-service checklist content. Static and deterministic on purpose. */
const CHECKLISTS: Record<
  (typeof SERVICES)[number],
  { label: string; documents: string[]; source: string; next: NextStep }
> = {
  individual_return: {
    label: 'Individual tax return (Form 1040)',
    documents: [
      'Every W-2, and every 1099 you received (1099-NEC, 1099-K, 1099-INT, 1099-DIV, 1099-B, 1099-R, SSA-1099).',
      'Form 1098 (mortgage interest) and property-tax amounts if you own a home.',
      'Form 1098-T plus tuition/fee records for education credits; Form 1098-E for student-loan interest.',
      'Childcare provider name, address, tax ID, and amount paid (for the childcare credit).',
      'HSA forms (1099-SA and 5498-SA) if you have a health savings account.',
      'Records of estimated-tax payments you already made (dates and amounts).',
      'Marketplace health insurance Form 1095-A if you had exchange coverage.',
      'If you have foreign accounts or assets: each institution, account number, and the highest balance during the year.',
    ],
    source: SOURCE.pricing,
    next: { label: 'Send your documents and get a fixed quote - free 15-minute call with an Enrolled Agent', url: GO.book15min },
  },
  self_employed_return: {
    label: 'Self-employed return (Form 1040 with Schedule C)',
    documents: [
      'All 1099-NEC and 1099-K forms, plus a full-year income summary from each platform or bank (Stripe, PayPal, Amazon, Upwork, etc.).',
      'Business expenses totaled by category (software, supplies, contractors, advertising, fees, travel, meals).',
      'Home-office details: square footage of the office and of the home, plus rent/mortgage interest, utilities, and insurance totals.',
      'Mileage log or total business miles for the year (and the vehicle if you want actual-cost comparison).',
      'Any equipment or asset purchases over a few hundred dollars (date and amount).',
      'Health-insurance premiums you paid yourself, and any retirement-plan contributions (SEP/Solo 401k).',
      'Records of estimated-tax payments you already made (dates and amounts).',
      'Everything from the individual-return list that applies to you (W-2s from a day job, 1098, etc.).',
    ],
    source: SOURCE.pricing,
    next: { label: 'Send your documents and get a fixed quote - free 15-minute call with an Enrolled Agent', url: GO.book15min },
  },
  foreign_owned_llc_5472: {
    label: 'Foreign-owned single-member US LLC (pro-forma Form 1120 + Form 5472)',
    documents: [
      'EIN confirmation letter (CP 575 or 147C).',
      'Formation documents: articles of organization and the state where the LLC was formed.',
      'Owner details: full legal name, foreign address, country of tax residence, and ITIN or foreign tax ID if any.',
      'Every money movement between you and the LLC during the year: capital you put in, distributions you took out, loans either way, and anything the LLC paid on your behalf (these are the reportable transactions Form 5472 exists for).',
      'US bank/payment account statements for the year (Mercury, Wise, Payoneer, Stripe payouts).',
      'The prior year Form 5472 if one was filed.',
      'Registered-agent name and address.',
    ],
    source: SOURCE.international,
    next: { label: 'The 5472 penalty is $25,000 per missed form - have an Enrolled Agent handle the filing. Free 15-minute call', url: GO.book15min },
  },
  s_corp_return: {
    label: 'S-corporation return (Form 1120-S)',
    documents: [
      'Prior-year Form 1120-S with the depreciation schedules (first year with us).',
      'The S-election acceptance letter (CP261) if this is the first S-corp year.',
      'Year-end profit and loss statement and balance sheet, or bookkeeping file access (QuickBooks/Xero), or full-year bank statements if there are no books yet.',
      'Payroll reports for the year: W-2/W-3 and the quarterly 941s (plus state filings).',
      'Each shareholder: name, address, SSN/ITIN, and ownership percentage.',
      'Distributions taken by each shareholder (dates and amounts).',
      'Accountable-plan reimbursements paid to owners, if any.',
      'Any 1099s the company issued to contractors.',
    ],
    source: SOURCE.llcScorp,
    next: { label: 'Send your documents and get a fixed quote - free 15-minute call with an Enrolled Agent', url: GO.book15min },
  },
  partnership_return: {
    label: 'Partnership return (Form 1065)',
    documents: [
      'Operating agreement (and any amendments) plus the EIN letter.',
      'Year-end profit and loss statement and balance sheet, or bookkeeping file access, or full-year bank statements.',
      'Each partner: name, address, SSN/ITIN or foreign status, and profit/loss/capital percentages.',
      'Capital contributions and distributions by partner (dates and amounts).',
      'Prior-year Form 1065 with K-1s (first year with us).',
      'Any 1099s the partnership issued, and any foreign partners flagged early (withholding rules apply).',
    ],
    source: SOURCE.llcScorp,
    next: { label: 'Send your documents and get a fixed quote - free 15-minute call with an Enrolled Agent', url: GO.book15min },
  },
  fbar_streamlined_catchup: {
    label: 'FBAR / Streamlined offshore catch-up',
    documents: [
      'Every foreign financial account: institution name and address, account number, and the type of account (bank, brokerage, pension, crypto exchange if custodial).',
      'The HIGHEST balance in each account for EACH year being filed (statements or screenshots; note the currency).',
      'Foreign income records per year: interest, dividends, rental income, capital gains, and any foreign tax already paid.',
      'Your last 3 years of filed US returns (Streamlined amends or files 3 years of returns and 6 years of FBARs).',
      'A plain, honest written account in your own words of why the filings were missed (the non-willfulness narrative is the heart of a Streamlined submission).',
      'Any foreign pension or investment-fund details (these can be PFICs with their own forms).',
    ],
    source: SOURCE.fbarFatca,
    next: { label: 'Catch-up options are time-sensitive and eligibility matters - review your years with an Enrolled Agent', url: SOURCE.discovery },
  },
  itin_application: {
    label: 'ITIN application (Form W-7)',
    documents: [
      'Valid passport, submitted as the original or a certified copy from the issuing agency (the IRS does not accept notarized copies). Without a passport, two other approved identity documents.',
      'The document that proves WHY you need an ITIN: the US tax return being filed with the W-7, or the exception evidence (a W-8BEN and payer letter, a bank letter, or the treaty claim).',
      'US visa pages if you have one, and your foreign address.',
      'For a spouse or dependent of a US filer: proof of the relationship and, for dependents, proof of US residency where required.',
    ],
    source: SOURCE.itin,
    next: { label: 'Apply with an Enrolled Agent - we prepare the W-7 and represent you before the IRS. Free 15-minute call', url: GO.book15min },
  },
};

const FIRST_YEAR_ADDITIONS = [
  'Your prior-year (ideally two years of) filed returns, federal and state.',
  'Government photo ID for each taxpayer (and SSN/ITIN cards or letters).',
  'IRS authorization (Form 8821 or 2848) so we can pull transcripts and speak to the IRS for you - we prepare it, you sign.',
  'For a business: EIN letter, formation documents, and any election letters (e.g. CP261 for an S-corp).',
];

const FORMAT_TIPS = [
  'PDF scans beat phone photos; one document per file, named plainly (e.g. "2025 W-2 employer.pdf").',
  'Totals in a simple spreadsheet are welcome for expense categories; we do not need every receipt up front, but keep them.',
  'Never email SSNs or account numbers: use the secure upload link we send you.',
];

function run(args: z.infer<typeof input>) {
  const list = CHECKLISTS[args.service];
  const firstYear = args.first_year_client ?? false;

  const fields = {
    inputs: { service: args.service, first_year_client: firstYear },
    checklist_for: list.label,
    documents: list.documents,
    ...(firstYear ? { first_year_additions: FIRST_YEAR_ADDITIONS } : {}),
    how_to_send: FORMAT_TIPS,
    caveats: [
      'This is the standard list; your situation may need more (or less). Missing items do not have to block the start - send what you have and note the gaps.',
    ],
  };

  const summary = `Document checklist for ${list.label}: ${list.documents.length} core items${firstYear ? ` plus ${FIRST_YEAR_ADDITIONS.length} first-year onboarding documents` : ''}, listed in full in this response. Send PDFs through the secure upload link (never email SSNs), and gaps are fine to start.`;

  return output(summary, fields, list.source, list.next);
}

export const getDocumentChecklist: ToolDef<typeof input> = {
  name: 'get_document_checklist',
  title: 'Get a document checklist',
  description:
    'Use this when someone asks what documents, statements, or records to gather for a US tax filing or engagement: an individual return, a self-employed Schedule C return, a foreign-owned single-member LLC (Form 5472) filing, an S-corp or partnership return, an FBAR/Streamlined offshore catch-up, or an ITIN application. Returns the service-specific document list, first-year onboarding extras, and how to send files securely.',
  input,
  annotations: { title: 'Get a document checklist', readOnlyHint: true, openWorldHint: false },
  logEnums: (args) => ({
    service: args.service,
    first_year_client: args.first_year_client ?? false,
  }),
  run,
};
