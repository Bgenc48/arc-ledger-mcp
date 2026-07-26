/**
 * Directory-safe MCP surface for the OpenAI Plugins Directory and Anthropic
 * Software Directory.
 *
 * The primary /mcp endpoint remains the firm's complete public server. This
 * registry intentionally exposes only educational tools whose core result is
 * useful without buying a service. It also removes firm-specific handoffs,
 * contact details, fee data, downloads, and promotional copy from tool output.
 * The Worker writes no per-call application logs on either MCP surface.
 */
import { TOOLS } from './registry';
import { DISCLAIMER, RELAY_NOTE } from './lib/config';
import { DIRECTORY_ENVELOPE_OUTPUT_SCHEMA } from './lib/response';
import type { AnyToolDef, ToolOutput } from './lib/types';

export const DIRECTORY_NAME = 'Arc & Ledger Tax Reference';
export const DIRECTORY_DOCS_URL = 'https://www.arcandledger.com/mcp/directory/';
export const DIRECTORY_PRIVACY_URL = 'https://www.arcandledger.com/mcp/privacy/';

export const DIRECTORY_INSTRUCTIONS =
  'Educational US tax reference tools from Arc & Ledger Accounting. Use them to explain an IRS notice or tax document, screen general filing and reporting rules, and calculate clearly labeled estimates. The tools do not prepare or file a return, transmit data to a tax authority, create an engagement, sell a service, or replace review by a qualified tax professional. Do not ask for Social Security numbers, tax account numbers, bank details, passwords, or documents. Treat every result as general information and verify it against the cited official authority before the user acts.';

const DIRECTORY_TOOL_NAMES = [
  'decode_irs_notice',
  'check_resolution_options',
  'estimate_irs_penalty',
  'explain_tax_document',
  'deadline_calendar',
  'check_fbar_fatca',
  'check_treaty_withholding',
  'check_itin_eligibility',
  'check_5472_obligation',
  'estimate_quarterly_taxes',
  'estimate_accountable_plan',
  'estimate_augusta_rule',
  'estimate_rental_income',
] as const;

export type DirectoryToolName = (typeof DIRECTORY_TOOL_NAMES)[number];

const DIRECTORY_DESCRIPTIONS: Record<DirectoryToolName, string> = {
  decode_irs_notice:
    'Use when a user provides the code from an IRS notice or letter and wants a general explanation, the usual response window, or the next procedural step. Do not request the notice itself or any taxpayer identifier.',
  check_resolution_options:
    'Use to screen general IRS payment and collection alternatives from a rough balance, filing-compliance status, ability-to-pay category, and coarse tax-account type when known. This is an educational fit screen, not a promise that the IRS will approve an option.',
  estimate_irs_penalty:
    'Use to estimate selected federal failure-to-file, failure-to-pay, and underpayment amounts from nonidentifying figures. The result is an estimate and does not replace an IRS account transcript.',
  explain_tax_document:
    'Use when a user names a US tax form or information document and wants to understand its purpose, common fields, or usual return treatment. Do not request or accept the document itself.',
  deadline_calendar:
    'Use to return common federal filing and payment dates for a selected filer or entity type. The user must verify the date for weekends, holidays, extensions, fiscal years, and special facts.',
  check_fbar_fatca:
    'Use to screen general FBAR and Form 8938 thresholds from aggregate balance, filing status, residence, and account-count facts. Do not request account numbers, institution names, or statements.',
  check_treaty_withholding:
    'Use to explain general US withholding rules, documentation, and supported US-Turkey treaty rates for a payment category. Treaty eligibility and source rules depend on the full facts.',
  check_itin_eligibility:
    'Use to screen general ITIN reason categories, whether a return is commonly attached, and supporting-document requirements. Never request or process an actual ITIN, passport, or identity document.',
  check_5472_obligation:
    'Use to screen common Form 5472 triggers for a foreign-owned US disregarded entity or corporation. The result is a general filing screen and does not prepare or file the form.',
  estimate_quarterly_taxes:
    'Use to estimate federal quarterly tax payments from nonidentifying income, entity, withholding, and prior-year tax figures. Return the assumptions, safe-harbor context, and due dates.',
  estimate_accountable_plan:
    'Use to estimate potentially reimbursable business expenses under an accountable-plan scenario, including the split 2026 business-mileage rates. The result does not establish a plan or determine substantiation.',
  estimate_augusta_rule:
    'Use to screen the fewer-than-15-days home-rental rule under IRC 280A(g) and calculate conditional amounts. Keep the owner-side income exclusion separate from the business-side requirements for ordinary and necessary use and reasonable rent.',
  estimate_rental_income:
    'Use to estimate a basic rental-income result from nonidentifying figures and identify the modeled depreciation, passive-loss, and personal-use limitations.',
};

const OFFICIAL_SOURCES: Record<DirectoryToolName, string> = {
  decode_irs_notice: 'https://www.irs.gov/individuals/understanding-your-irs-notice-or-letter',
  check_resolution_options: 'https://www.irs.gov/payments/online-payment-agreement-application',
  estimate_irs_penalty: 'https://www.irs.gov/payments/penalties',
  explain_tax_document: 'https://www.irs.gov/forms-instructions',
  deadline_calendar: 'https://www.irs.gov/filing',
  check_fbar_fatca:
    'https://www.irs.gov/businesses/comparison-of-form-8938-and-fbar-requirements',
  check_treaty_withholding:
    'https://www.irs.gov/businesses/international-businesses/united-states-income-tax-treaties-a-to-z',
  check_itin_eligibility: 'https://www.irs.gov/individuals/individual-taxpayer-identification-number',
  check_5472_obligation: 'https://www.irs.gov/forms-pubs/about-form-5472',
  estimate_quarterly_taxes:
    'https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes',
  estimate_accountable_plan: 'https://www.irs.gov/tax-professionals/standard-mileage-rates',
  estimate_augusta_rule: 'https://www.irs.gov/publications/p527',
  estimate_rental_income: 'https://www.irs.gov/publications/p527',
};

const SUPPLEMENTARY_OFFICIAL_SOURCES: Partial<Record<DirectoryToolName, string[]>> = {
  decode_irs_notice: [
    'https://www.irs.gov/individuals/understanding-your-irs-notice-or-letter',
    'https://www.irs.gov/payments/administrative-penalty-relief',
  ],
  check_resolution_options: [
    'https://www.irs.gov/payments/online-payment-agreement-application',
    'https://www.irs.gov/irm/part5/irm_05-014-001r',
    'https://www.irs.gov/payments/administrative-penalty-relief',
  ],
  estimate_irs_penalty: [
    'https://www.irs.gov/payments/penalties',
    'https://www.irs.gov/payments/quarterly-interest-rates',
    'https://www.irs.gov/newsroom/if-youve-filed-but-havent-paid',
    'https://www.irs.gov/payments/administrative-penalty-relief',
  ],
  check_fbar_fatca: [
    'https://www.irs.gov/businesses/comparison-of-form-8938-and-fbar-requirements',
    'https://www.fincen.gov/report-foreign-bank-and-financial-accounts',
  ],
};

const DROP_KEYS = new Set([
  'annual_compliance_set',
  'booking_url',
  'boi_report',
  'california',
  'complexity_routing',
  'credited',
  'engagement_fee',
  'expectations',
  'fee_context',
  'free_download',
  'how_we_help',
  'matching_service',
  'office',
  'our_compliance_fee',
  'our_total_annual_cost',
  'payment_link',
  'penalty_exposure',
  'price',
  'price_usd',
  'professional_help',
  'related_tools',
  'savings_notes',
  'secure_upload',
  'state_note',
  'urgent_contact',
  'what_happens_next',
]);

const PROMOTIONAL_SENTENCE =
  /Arc & Ledger|arcandledger\.com|free 15-minute|book (?:a|an|the|your)|published fee|get_fee_quote|book_consultation|pricing page|secure upload|send your documents|discovery session|notice rescue|engagement|calling the office|WhatsApp|we prepare|we file/i;

function isAllowedGovernmentUrl(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return (
      host === 'irs.gov' ||
      host.endsWith('.irs.gov') ||
      host === 'fincen.gov' ||
      host.endsWith('.fincen.gov') ||
      host === 'ftb.ca.gov' ||
      host.endsWith('.ftb.ca.gov')
    );
  } catch {
    return false;
  }
}

function neutralizeCredentialReferences(value: string): string {
  return value
    .replace(/\bAs your Enrolled Agent\b/g, 'A qualified tax professional')
    .replace(/\bas your Enrolled Agent\b/g, 'a qualified tax professional')
    .replace(/\bYour Enrolled Agent\b/g, 'A qualified tax professional')
    .replace(/\byour Enrolled Agent\b/g, 'a qualified tax professional')
    .replace(/\bThe Enrolled Agent\b/g, 'The qualified tax professional')
    .replace(/\bthe Enrolled Agent\b/g, 'the qualified tax professional')
    .replace(/\bAn Enrolled Agent\b/g, 'A qualified tax professional')
    .replace(/\ban Enrolled Agent\b/g, 'a qualified tax professional')
    .replace(/\bEnrolled Agent\b/g, 'qualified tax professional')
    .replace(/\benrolled Agent\b/g, 'qualified tax professional');
}

/**
 * Remove complete promotional sentences while retaining tax-law sentences.
 * Tool summaries and notes are short prose, so sentence-level filtering avoids
 * trying to rewrite tax facts with brittle word substitutions.
 */
function scrubString(value: string): string | undefined {
  const urls: Array<{ token: string; value: string | null }> = [];
  const protectedValue = value.replace(/https:\/\/[^\s"'<>]+/gi, (raw) => {
    const trailing = raw.match(/[.,;:!?)}\]]+$/)?.[0] ?? '';
    const url = trailing ? raw.slice(0, -trailing.length) : raw;
    const token = `DIRECTORY_URL_${urls.length}_TOKEN`;
    urls.push({ token, value: isAllowedGovernmentUrl(url) ? url : null });
    return `${token}${trailing}`;
  });
  // Split only where punctuation is followed by whitespace. Splitting on every
  // period corrupts decimals such as 72.5 and abbreviations such as U.S.
  const sentences = protectedValue.split(/(?<=[.!?])\s+/g);
  const kept = sentences
    .map((sentence) => sentence.trim())
    .filter(
      (sentence) =>
        sentence.length > 0 &&
        !PROMOTIONAL_SENTENCE.test(sentence) &&
        !urls.some(({ token, value: url }) => url === null && sentence.includes(token)),
    )
    .map(neutralizeCredentialReferences)
    .map((sentence) => {
      let restored = sentence;
      for (const { token, value: url } of urls) {
        if (url) restored = restored.replaceAll(token, url);
      }
      return restored;
    });
  return kept.length > 0 ? kept.join(' ') : undefined;
}

function scrubValue(value: unknown): unknown {
  if (typeof value === 'string') return scrubString(value);
  if (Array.isArray(value)) {
    return value
      .map(scrubValue)
      .filter((entry) => entry !== undefined && entry !== null && entry !== '');
  }
  if (value && typeof value === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (DROP_KEYS.has(key)) continue;
      const scrubbed = scrubValue(entry);
      if (scrubbed !== undefined && scrubbed !== null && scrubbed !== '') clean[key] = scrubbed;
    }
    return clean;
  }
  return value;
}

function directoryOutput(name: DirectoryToolName, title: string, out: ToolOutput): ToolOutput {
  const source = OFFICIAL_SOURCES[name];
  const structured = (scrubValue(out.structured) ?? {}) as Record<string, unknown>;
  const summary =
    scrubString(out.summary) ??
    `${title} completed. Review the structured result and the cited official authority before relying on it.`;

  return {
    summary,
    structured: {
      ...structured,
      ...(SUPPLEMENTARY_OFFICIAL_SOURCES[name]
        ? { official_sources: SUPPLEMENTARY_OFFICIAL_SOURCES[name] }
        : {}),
      disclaimer: DISCLAIMER,
      relay: RELAY_NOTE,
      source_url: source,
      next_step: {
        label: 'Review the official guidance before relying on this result',
        url: source,
      },
    },
  };
}

const byName = new Map(TOOLS.map((tool) => [tool.name, tool]));

export const DIRECTORY_TOOLS: AnyToolDef[] = DIRECTORY_TOOL_NAMES.map((name) => {
  const tool = byName.get(name);
  if (!tool) throw new Error(`Directory tool is missing from the primary registry: ${name}`);
  return {
    name: tool.name,
    title: tool.title,
    description: DIRECTORY_DESCRIPTIONS[name],
    input: tool.input,
    annotations: {
      ...tool.annotations,
      readOnlyHint: true,
      destructiveHint: false,
    },
    outputSchema: DIRECTORY_ENVELOPE_OUTPUT_SCHEMA,
    logEnums: () => ({}),
    run: (input: unknown) => directoryOutput(name, tool.title, tool.run(input)),
    // Current widgets contain firm handoffs. The directory surface therefore
    // returns standard structured MCP results with no UI resource binding.
  };
});
