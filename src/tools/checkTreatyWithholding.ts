import { z } from 'zod';
import { output } from '../lib/response';
import { SOURCE, GO } from '../lib/config';
import {
  FDAP_DEFAULT_WITHHOLDING,
  SCHOLARSHIP_WITHHOLDING,
  TURKEY_TREATY_DIVIDEND_INDIVIDUAL,
  TURKEY_TREATY_DIVIDEND_CORPORATE,
  TURKEY_TREATY_INTEREST,
  TURKEY_TREATY_ROYALTY,
  W8BEN_VALIDITY_YEARS,
} from '../rates';
import type { ToolDef } from '../lib/types';

const INCOME_TYPES = ['dividends', 'interest', 'royalties', 'personal_services', 'scholarship_fellowship'] as const;

const input = z.object({
  income_type: z
    .enum(INCOME_TYPES)
    .describe(
      'The kind of US-source payment: "dividends" (from US stocks or a US corporation), "interest", "royalties" (software, content, IP licensing), "personal_services" (freelance/consulting work or wages), or "scholarship_fellowship".',
    ),
  payee_country: z
    .enum(['turkey', 'other_non_us', 'united_states'])
    .describe(
      'Country of TAX RESIDENCE of the person or company RECEIVING the payment. "turkey" returns the US-Turkey treaty rates this server carries; "other_non_us" returns the default statutory rates and how to check your own treaty; "united_states" covers US persons (who use Form W-9, not a treaty claim).',
    ),
  payee_type: z
    .enum(['individual', 'company'])
    .optional()
    .describe('Whether the payee is an individual or a company/entity. Defaults to individual. Determines the form (W-8BEN vs W-8BEN-E) and the treaty dividend rate.'),
});

const NEXT_STEP = {
  label: 'Confirm your treaty position and withholding documents with an Enrolled Agent - free 15-minute call',
  url: GO.book15min,
};

const pct = (rate: number): string => `${Math.round(rate * 100)}%`;

function run(args: z.infer<typeof input>) {
  const payeeType = args.payee_type ?? 'individual';
  const isTurkey = args.payee_country === 'turkey';

  // ── US person: no treaty claim, W-9 instead ──
  if (args.payee_country === 'united_states') {
    const fields = {
      inputs: { income_type: args.income_type, payee_country: args.payee_country, payee_type: payeeType },
      which_form: 'Form W-9',
      withholding: 'none by default',
      explanation:
        'A US citizen, US tax resident, or US entity gives the payer Form W-9, not a W-8. No flat 30% withholding applies; the income is simply reported (typically on a 1099) and taxed on your US return. If you fail to provide a correct TIN on the W-9, the payer must apply backup withholding.',
      caveats: [
        'Tax treaties generally cannot be used by US persons for US tax (the "saving clause"); they matter for foreign tax on the same income.',
        'If you hold a green card or meet the substantial-presence test, you are a US tax resident even while living abroad, and W-9 treatment applies.',
      ],
    };
    const summary =
      'As a US person you give the payer Form W-9 and no flat 30% withholding applies - the income is reported and taxed on your US return. Treaty rates are for non-US persons.';
    return output(summary, fields, SOURCE.international, NEXT_STEP);
  }

  const form =
    payeeType === 'company'
      ? 'Form W-8BEN-E'
      : args.income_type === 'personal_services'
        ? 'Form W-8BEN (or Form 8233 to claim a treaty exemption on personal-services income)'
        : 'Form W-8BEN';

  // ── Rate by income type ──
  let defaultRate: string;
  let turkeyRate: string | null = null;
  let typeNote: string;

  if (args.income_type === 'personal_services') {
    defaultRate = 'not the flat FDAP rate - see explanation';
    typeNote =
      'Compensation for personal services is treated differently from passive (FDAP) income. Services performed entirely OUTSIDE the US are generally FOREIGN-source income and not subject to US withholding at all - the most common situation for a freelancer working from abroad for US clients. Services performed IN the US are generally taxed on a net basis as effectively connected income (graduated rates on Form 1040-NR), with withholding rules that depend on employee vs contractor status; individuals claim any treaty exemption on Form 8233.';
  } else if (args.income_type === 'scholarship_fellowship') {
    defaultRate = `${pct(SCHOLARSHIP_WITHHOLDING)} on the taxable portion for F, J, M, or Q visa holders (${pct(FDAP_DEFAULT_WITHHOLDING)} otherwise)`;
    typeNote =
      'Qualified tuition and required fees for a degree candidate are excluded from income; withholding applies to the TAXABLE portion (e.g. stipends, room and board). Many treaties have a student/trainee article that can reduce the tax further - that is worth a professional look, not a calculator.';
  } else {
    defaultRate = pct(FDAP_DEFAULT_WITHHOLDING);
    if (args.income_type === 'dividends') {
      turkeyRate = isTurkey
        ? payeeType === 'company'
          ? `${pct(TURKEY_TREATY_DIVIDEND_CORPORATE)} when the receiving company owns at least 10% of the payer (${pct(TURKEY_TREATY_DIVIDEND_INDIVIDUAL)} otherwise)`
          : pct(TURKEY_TREATY_DIVIDEND_INDIVIDUAL)
        : null;
      typeNote = 'Dividends from US corporations are FDAP income, withheld at source by the payer or broker.';
    } else if (args.income_type === 'interest') {
      turkeyRate = isTurkey ? `${pct(TURKEY_TREATY_INTEREST)} generally (certain narrow categories differ)` : null;
      typeNote =
        'Many kinds of US interest are exempt from withholding by statute regardless of treaty (portfolio interest on registered obligations, and most US bank deposit interest). The treaty rate matters when a statutory exemption does not apply.';
    } else {
      turkeyRate = isTurkey ? `${pct(TURKEY_TREATY_ROYALTY)} general rate` : null;
      typeNote = 'Royalties (software licensing, content, IP) paid from US sources are FDAP income, withheld at source.';
    }
  }

  const fields = {
    inputs: { income_type: args.income_type, payee_country: args.payee_country, payee_type: payeeType },
    default_statutory_withholding: defaultRate,
    ...(isTurkey
      ? { us_turkey_treaty_rate: turkeyRate ?? 'no flat treaty rate for this income type - see explanation' }
      : {
          treaty_note:
            'This server carries the US-Turkey treaty table. Your own country may have a US income tax treaty with different rates - without a valid treaty claim, the default statutory rate applies.',
        }),
    which_form: form,
    how_it_works: typeNote,
    to_claim_a_treaty_rate: [
      `Give the payer (the withholding agent) a valid ${payeeType === 'company' ? 'Form W-8BEN-E' : 'Form W-8BEN'} BEFORE payment; the payer applies the reduced rate at source.`,
      'A treaty claim generally requires a US TIN (an SSN or ITIN for individuals, an EIN for entities) or, for most treaty claims on the W-8BEN, your foreign tax identification number.',
      `A W-8BEN generally stays valid for the year signed plus ${W8BEN_VALIDITY_YEARS} full calendar years, unless your circumstances change.`,
      'If too much was withheld, the fix is filing a US return (Form 1040-NR or 1120-F) to claim the refund - the payer cannot return it after year-end reporting.',
    ],
    caveats: [
      'Treaty rates shown are the general maximums as summarized here; specific articles, ownership tests, and the limitation-on-benefits rules decide what actually applies. Verify your article before relying on a rate.',
      'The payer decides what documentation it accepts and bears the withholding liability, so expect them to be strict about complete forms.',
      'State income tax is separate: treaties bind federal tax, and most states do not follow them.',
    ],
  };

  const summary = isTurkey
    ? `US-source ${args.income_type.replace(/_/g, ' ')} paid to a Turkish tax resident: default US withholding is ${defaultRate}, and the US-Turkey treaty rate is ${turkeyRate ?? 'not a flat rate for this income type (see the explanation)'} when claimed on a valid ${form} (a US TIN or foreign TIN is generally required). If too much is withheld, the refund path is a US return.`
    : `US-source ${args.income_type.replace(/_/g, ' ')} paid to a non-US ${payeeType}: the default statutory withholding is ${defaultRate}, claimed rates depend on your country's treaty, and the form to give the payer is ${form}.`;

  return output(summary, fields, SOURCE.international, NEXT_STEP);
}

export const checkTreatyWithholding: ToolDef<typeof input> = {
  name: 'check_treaty_withholding',
  title: 'Check US withholding and treaty rates (W-8BEN)',
  description:
    'Use this when a non-US person or company receiving US-source income (dividends, interest, royalties, freelance/personal services, or a scholarship) asks how much US tax will be withheld, whether a tax treaty reduces it, or which form to give the payer (W-8BEN, W-8BEN-E, W-9, Form 8233). Returns the default statutory rate, the US-Turkey treaty rate where one applies, the documentation a treaty claim needs (including a TIN/ITIN), and how refunds of over-withholding work.',
  input,
  annotations: { title: 'Check US withholding and treaty rates', readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  logEnums: (args) => ({
    income_type: args.income_type,
    payee_country: args.payee_country,
    payee_type: args.payee_type ?? 'individual',
  }),
  run,
};
