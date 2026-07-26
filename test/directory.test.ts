import { describe, expect, it, vi } from 'vitest';
import { dispatch } from '../src/lib/mcp';
import {
  DIRECTORY_INSTRUCTIONS,
  DIRECTORY_NAME,
  DIRECTORY_TOOLS,
} from '../src/directory';
import { COVERED_CODES } from '../src/data/notices';
import { COVERED_DOCUMENTS } from '../src/data/taxDocuments';

const reg = () => ({
  tools: DIRECTORY_TOOLS,
  prompts: [],
  version: '0.15.1',
  instructions: DIRECTORY_INSTRUCTIONS,
  serverTitle: DIRECTORY_NAME,
  resourceMode: 'none' as const,
});

const CASES: Record<string, Array<Record<string, unknown>>> = {
  decode_irs_notice: [
    ...COVERED_CODES.map((notice_code) => ({ notice_code, received_date: '2026-07-20' })),
    { notice_code: 'UNKNOWN' },
  ],
  check_resolution_options: [
    {
      balance_owed_usd: 30_000,
      ability_to_pay: 'can_make_monthly_payments',
      all_required_returns_filed: true,
      tax_account_type: 'individual_income_tax',
    },
    {
      balance_owed_usd: 75_000,
      ability_to_pay: 'cannot_pay_basic_living',
      all_required_returns_filed: false,
    },
  ],
  estimate_irs_penalty: [
    { balance_owed_usd: 10_000, months_late: 3, return_filed: true },
    { balance_owed_usd: 10_000, months_late: 8, return_filed: false },
  ],
  explain_tax_document: [
    ...COVERED_DOCUMENTS.map((document) => ({ document })),
    { document: 'UNKNOWN-FORM' },
  ],
  deadline_calendar: [
    {
      entity_type: 'foreign_owned_llc',
      filing_year: 2026,
      formed_in_us: true,
      has_foreign_bank_over_10k: true,
    },
    { entity_type: 's_corp', filing_year: 2025 },
    { entity_type: 'foreign_owned_c_corp', filing_year: 2026, formed_in_us: true },
    { entity_type: 'multi_member_llc', filing_year: 2026 },
    { entity_type: 'nonresident_individual', filing_year: 2026, has_us_source_wages: true },
  ],
  check_fbar_fatca: [
    {
      max_aggregate_foreign_balance_usd: 65_000,
      filing_status: 'single',
      lives_abroad: false,
      unfiled_years: 2,
    },
    {
      max_aggregate_foreign_balance_usd: 10_000,
      filing_status: 'married_filing_jointly',
      lives_abroad: true,
    },
    {
      max_aggregate_foreign_balance_usd: 600_000,
      filing_status: 'married_filing_jointly',
      lives_abroad: true,
      account_count: 12,
    },
  ],
  check_treaty_withholding: [
    { income_type: 'dividends', payee_country: 'turkey', payee_type: 'individual' },
    { income_type: 'personal_services', payee_country: 'other_non_us' },
    { income_type: 'interest', payee_country: 'united_states' },
    { income_type: 'royalties', payee_country: 'turkey', payee_type: 'company' },
    { income_type: 'scholarship_fellowship', payee_country: 'turkey', payee_type: 'individual' },
    { income_type: 'dividends', payee_country: 'other_non_us', payee_type: 'company' },
  ],
  check_itin_eligibility: [
    ...[
      'file_us_tax_return',
      'owner_of_us_llc',
      'claim_treaty_benefit',
      'spouse_or_dependent',
      'third_party_withholding',
      'open_us_bank_or_other',
    ].map((reason) => ({ has_ssn: false, reason, is_foreign_national: true })),
    { has_ssn: true, reason: 'file_us_tax_return' },
  ],
  check_5472_obligation: [
    {
      entity_type: 'single_member_llc',
      foreign_owned: true,
      had_reportable_transaction: 'yes',
      formed_in_us: true,
    },
    { entity_type: 'multi_member_llc', foreign_owned: true },
    { entity_type: 'not_sure', foreign_owned: true },
    { entity_type: 'us_corporation', foreign_owned: false },
  ],
  estimate_quarterly_taxes: [
    {
      ytd_net_income_usd: 60_000,
      entity: 'sole_proprietor',
      state: 'CA',
      prior_year_total_tax_usd: 10_000,
    },
    {
      ytd_net_income_usd: 120_000,
      entity: 's_corp_shareholder',
      ytd_withholding_usd: 20_000,
      prior_year_total_tax_usd: 30_000,
      prior_year_agi_usd: 200_000,
    },
    { ytd_net_income_usd: 45_000, entity: 'single_member_llc', state: 'NY' },
    { ytd_net_income_usd: 0, entity: 'other' },
  ],
  estimate_accountable_plan: [
    {
      home_office_expense_usd: 3_000,
      business_miles: 6_000,
      business_mileage_period: 'on_or_after_july_1_2026',
      cell_internet_usd: 1_200,
    },
    {
      business_miles: 6_000,
      business_mileage_period: 'before_july_1_2026',
    },
    {
      business_miles: 6_000,
      business_mileage_period: 'mixed_or_unknown',
      other_business_expense_usd: 2_000,
    },
    { business_miles: 6_000 },
  ],
  estimate_augusta_rule: [
    { fair_daily_rental_rate_usd: 1_200, days_rented: 0 },
    { fair_daily_rental_rate_usd: 1_200, days_rented: 14 },
    { fair_daily_rental_rate_usd: 1_200, days_rented: 12, marginal_tax_rate_pct: 32 },
    { fair_daily_rental_rate_usd: 1_200, days_rented: 15 },
  ],
  estimate_rental_income: [
    {
      annual_rental_income_usd: 30_000,
      operating_expenses_usd: 12_000,
      property_purchase_price_usd: 400_000,
      other_income_usd: 80_000,
      filing_status: 'single',
      real_estate_professional: false,
      rental_type: 'long_term',
      personal_use_days: 0,
      rental_days: 365,
    },
    {
      annual_rental_income_usd: 8_000,
      operating_expenses_usd: 2_000,
      rental_type: 'short_term',
      personal_use_days: 30,
      rental_days: 10,
    },
    {
      annual_rental_income_usd: 30_000,
      operating_expenses_usd: 40_000,
      other_income_usd: 120_000,
      filing_status: 'married_filing_jointly',
      real_estate_professional: false,
      rental_type: 'short_term',
      personal_use_days: 2,
      rental_days: 100,
    },
    {
      annual_rental_income_usd: 30_000,
      operating_expenses_usd: 60_000,
      other_income_usd: 200_000,
      real_estate_professional: true,
      rental_type: 'long_term',
    },
  ],
};

describe('directory-safe MCP registry', () => {
  it('exposes only the reviewed educational tools with all required annotations', () => {
    const response = dispatch(
      { jsonrpc: '2.0', id: 1, method: 'tools/list' },
      reg(),
    ) as any;
    const tools = response.result.tools;

    expect(tools).toHaveLength(13);
    expect(tools.map((tool: any) => tool.name)).toEqual(Object.keys(CASES));
    for (const tool of tools) {
      expect(tool.annotations).toMatchObject({
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false,
      });
      expect(tool._meta).toBeUndefined();
      expect(tool.description).not.toMatch(
        /Arc & Ledger|arcandledger\.com|book|consultation|fee|pricing|upload|service/i,
      );
      expect(JSON.stringify(tool)).not.toMatch(
        /Arc & Ledger|arcandledger\.com|free 15-minute|\bbook(?:ing)?\b|consultation|published fee|pricing page|secure upload|WhatsApp/i,
      );
    }
  });

  it('advertises no prompts, resources, or commercial instructions', () => {
    const initialized = dispatch(
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
      reg(),
    ) as any;
    expect(initialized.result.serverInfo.title).toBe(DIRECTORY_NAME);
    expect(initialized.result.capabilities.resources).toBeUndefined();
    expect(initialized.result.instructions).not.toMatch(
      /book|consultation|fee quote|pricing|secure upload/i,
    );

    const prompts = dispatch(
      { jsonrpc: '2.0', id: 2, method: 'prompts/list' },
      reg(),
    ) as any;
    expect(prompts.result.prompts).toEqual([]);

    const resources = dispatch(
      { jsonrpc: '2.0', id: 3, method: 'resources/list' },
      reg(),
    ) as any;
    expect(resources.result.resources).toEqual([]);
  });

  it('removes firm promotion, contact details, and first-party handoffs from every reviewed branch', () => {
    const banned =
      /Arc & Ledger|arcandledger\.com|\/go\/|Enrolled Agent|\bbook(?:ing)?\b|consultation|published fee|pricing page|secure upload|WhatsApp|\(\d{3}\) \d{3}-\d{4}|triage_tax_problem|get_document_checklist|compare_llc_scorp|estimate_reasonable_comp|compare_formation_states|check_sales_tax_nexus|get_fee_quote|book_consultation|payment_link|penalty_exposure|annual_compliance_set|boi_report|state_note|"california"/i;

    for (const tool of DIRECTORY_TOOLS) {
      for (const args of CASES[tool.name] ?? []) {
        const out = tool.run(args as never);
        const rendered = `${out.summary}\n${JSON.stringify(out.structured)}`;
        expect(rendered, `${tool.name}: ${rendered}`).not.toMatch(banned);
        expect(out.structured.source_url).toMatch(/^https:\/\/(?:www\.)?(?:irs|fincen)\.gov\//);
        expect((out.structured.next_step as any).url).toBe(out.structured.source_url);
        for (const rawUrl of rendered.match(/https:\/\/[^\s"\\]+/g) ?? []) {
          const host = new URL(rawUrl).hostname;
          expect(
            host === 'irs.gov' ||
              host.endsWith('.irs.gov') ||
              host === 'fincen.gov' ||
              host.endsWith('.fincen.gov') ||
              host === 'ftb.ca.gov' ||
              host.endsWith('.ftb.ca.gov'),
            `${tool.name}: non-government URL ${rawUrl}`,
          ).toBe(true);
        }
      }
    }

    const mileage = DIRECTORY_TOOLS.find((tool) => tool.name === 'estimate_accountable_plan')!.run({
      business_miles: 2_000,
      business_mileage_period: 'on_or_after_july_1_2026',
    });
    expect(`${mileage.summary}\n${JSON.stringify(mileage.structured)}`).toContain('72.5');
    expect(`${mileage.summary}\n${JSON.stringify(mileage.structured)}`).not.toContain('72. 5');

    const resolution = DIRECTORY_TOOLS.find((tool) => tool.name === 'check_resolution_options')!.run({
      balance_owed_usd: 25_000,
      ability_to_pay: 'can_make_monthly_payments',
      all_required_returns_filed: true,
      tax_account_type: 'individual_income_tax',
    });
    const resolutionRendered = `${resolution.summary}\n${JSON.stringify(resolution.structured)}`;
    expect(resolution.structured.source_url).toBe(
      'https://www.irs.gov/payments/online-payment-agreement-application',
    );
    expect(resolution.structured.official_sources).toContain(
      'https://www.irs.gov/irm/part5/irm_05-014-001r',
    );
    expect(resolutionRendered).toContain('Simple Payment Plan');
    expect(resolutionRendered).not.toContain('72 months');
    expect(resolutionRendered).not.toContain('Streamlined installment');
  });

  it('does not write per-call analytics', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const response = dispatch(
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'estimate_irs_penalty',
            arguments: { balance_owed_usd: 10_000, months_late: 3 },
          },
        },
        reg(),
      ) as any;
      expect(response.result.isError).not.toBe(true);
      expect(log).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();

      const throwingRegistry = reg();
      const firstTool = DIRECTORY_TOOLS[0]!;
      throwingRegistry.tools = [
        {
          ...firstTool,
          run: () => {
            throw new Error('private runtime detail');
          },
        },
      ];
      const failed = dispatch(
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: firstTool.name,
            arguments: { notice_code: 'CP14' },
          },
        },
        throwingRegistry,
      ) as any;
      expect(failed.result.isError).toBe(true);
      expect(JSON.stringify(failed)).not.toContain('private runtime detail');
      expect(log).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
      error.mockRestore();
    }
  });
});
