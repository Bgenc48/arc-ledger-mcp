/**
 * Golden regression + determinism suite.
 *
 * 1. Determinism: every tool, called 20x with identical inputs, must return a
 *    byte-identical result. This converts "did the advice text change between
 *    sessions?" into a machine-checked guarantee.
 * 2. Boundary fixtures: the thresholds most likely to regress (FBAR $10k, the
 *    Form 8938 abroad flip, the Augusta 14/15-day edge, the reasonable-comp
 *    zero guard, the IRC 7503 deadline roll).
 */
import { describe, it, expect } from 'vitest';
import { dispatch } from '../src/lib/mcp';
import { TOOLS, PROMPTS } from '../src/registry';
import { estimateAugustaRule } from '../src/tools/estimateAugustaRule';
import { checkFbarFatca } from '../src/tools/checkFbarFatca';
import { estimateReasonableComp } from '../src/tools/estimateReasonableComp';
import { deadlineCalendar } from '../src/tools/deadlineCalendar';

const reg = () => ({ tools: TOOLS, prompts: PROMPTS, version: '0.6.0' });

const callOnce = (name: string, args: Record<string, unknown>) =>
  (dispatch({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }, reg()) as any).result;

// One representative, valid input per tool.
const REPRESENTATIVE: Array<[string, Record<string, unknown>]> = [
  ['decode_irs_notice', { notice_code: 'CP2000', received_date: '2026-06-15' }],
  ['check_fbar_fatca', { max_aggregate_foreign_balance_usd: 65000, filing_status: 'single', lives_abroad: false }],
  ['compare_llc_scorp', { expected_net_profit_usd: 150000, state: 'CA' }],
  ['estimate_quarterly_taxes', { ytd_net_income_usd: 80000, entity: 'sole_proprietor', state: 'CA' }],
  ['estimate_rental_income', { annual_rental_income_usd: 36000, operating_expenses_usd: 10000, property_purchase_price_usd: 500000, land_percent: 20 }],
  ['deadline_calendar', { entity_type: 's_corp', filing_year: 2025 }],
  ['check_itin_eligibility', { has_ssn: false, reason: 'owner_of_us_llc' }],
  ['estimate_irs_penalty', { balance_owed_usd: 10000, months_late: 6 }],
  ['compare_formation_states', { operates_in_california: false, raising_venture_capital: true }],
  ['check_sales_tax_nexus', { annual_sales_usd: 600000, transaction_count: 500, states: ['CA', 'TX', 'NY'] }],
  ['estimate_reasonable_comp', { business_net_profit_usd: 200000, profit_driver: 'primarily_owner_services' }],
  ['estimate_augusta_rule', { fair_daily_rental_rate_usd: 1500, days_rented: 12, marginal_tax_rate_pct: 32 }],
  ['estimate_accountable_plan', { home_office_expense_usd: 3000, business_miles: 8000, cell_internet_usd: 1200, marginal_tax_rate_pct: 33 }],
  ['check_treaty_withholding', { income_type: 'dividends', payee_country: 'turkey', payee_type: 'individual' }],
  ['get_document_checklist', { service: 'foreign_owned_llc_5472', first_year_client: true }],
  ['get_fee_quote', { service: 'individual_return' }],
  ['book_consultation', { type: 'free_15min' }],
  ['check_resolution_options', { balance_owed_usd: 25000, ability_to_pay: 'can_make_monthly_payments' }],
];

describe('determinism: identical inputs -> byte-identical output (20x)', () => {
  for (const [name, args] of REPRESENTATIVE) {
    it(`${name} is deterministic across 20 calls`, () => {
      const first = JSON.stringify(callOnce(name, args));
      for (let i = 0; i < 19; i++) {
        expect(JSON.stringify(callOnce(name, args))).toBe(first);
      }
    });
  }
});

describe('boundary fixtures', () => {
  it('FBAR: $10,000 not required, $10,001 required', () => {
    expect((checkFbarFatca.run({ max_aggregate_foreign_balance_usd: 10000, filing_status: 'single', lives_abroad: false }).structured.fbar as any).required).toBe(false);
    expect((checkFbarFatca.run({ max_aggregate_foreign_balance_usd: 10001, filing_status: 'single', lives_abroad: false }).structured.fbar as any).required).toBe(true);
  });

  it('Form 8938 single-abroad flips at the $200,000 year-end threshold', () => {
    const below = checkFbarFatca.run({ max_aggregate_foreign_balance_usd: 140000, filing_status: 'single', lives_abroad: true });
    expect((below.structured.form_8938 as any).status).toBe('not_required');
    const between = checkFbarFatca.run({ max_aggregate_foreign_balance_usd: 250000, filing_status: 'single', lives_abroad: true });
    expect((between.structured.form_8938 as any).status).toBe('possibly_required');
  });

  it('Augusta rule qualifies at 14 days and voids at 15', () => {
    expect(estimateAugustaRule.run({ fair_daily_rental_rate_usd: 1000, days_rented: 14 }).structured.qualifies_for_exclusion).toBe(true);
    expect(estimateAugustaRule.run({ fair_daily_rental_rate_usd: 1000, days_rented: 15 }).structured.qualifies_for_exclusion).toBe(false);
  });

  it('reasonable comp: $0 emits no salary; $200k gives the 40-60% range', () => {
    const zero = estimateReasonableComp.run({ business_net_profit_usd: 0, profit_driver: 'primarily_owner_services' });
    expect(zero.structured.suggested_salary_low).toBeUndefined();
    const normal = estimateReasonableComp.run({ business_net_profit_usd: 200000, profit_driver: 'primarily_owner_services' });
    expect(normal.structured.suggested_salary_low).toBe(80000);
    expect(normal.structured.suggested_salary_high).toBe(120000);
  });

  it('deadline roll: TY2025 1120-S = Monday March 16, 2026', () => {
    const out = deadlineCalendar.run({ entity_type: 's_corp', filing_year: 2025 });
    expect((out.structured.deadlines as any[])[0].due).toBe('2026-03-16');
  });
});
