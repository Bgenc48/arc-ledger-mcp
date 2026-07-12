/**
 * Content-governance gates.
 *
 * Sweeps the ACTUAL rendered output of every tool (across representative and
 * edge inputs), every resource, and every prompt, and fails if any banned
 * string appears or any required string is missing. This is a runtime gate on
 * purpose: it checks what a user actually sees, so it never false-positives on
 * a source comment that merely documents the rule.
 */
import { describe, it, expect } from 'vitest';
import { TOOLS, PROMPTS } from '../src/registry';
import { RESOURCES } from '../src/resources';
import { DISCLAIMER, OFFICE } from '../src/lib/config';

// One or more inputs per tool, chosen to exercise the risky copy paths
// (credential line, ITIN CAA history, the zero-profit comp guard).
const TOOL_INPUTS: Record<string, Array<Record<string, unknown>>> = {
  decode_irs_notice: [{ notice_code: 'CP2000', received_date: '2026-06-15' }, { notice_code: 'CP9999' }],
  check_fbar_fatca: [{ max_aggregate_foreign_balance_usd: 10000, filing_status: 'single', lives_abroad: false }],
  compare_llc_scorp: [{ expected_net_profit_usd: 150000, state: 'CA' }, { expected_net_profit_usd: 40000 }],
  estimate_quarterly_taxes: [{ ytd_net_income_usd: 80000, entity: 'sole_proprietor' }],
  estimate_rental_income: [{ annual_rental_income_usd: 36000, operating_expenses_usd: 10000, property_purchase_price_usd: 500000 }],
  deadline_calendar: [{ entity_type: 's_corp', filing_year: 2025 }, { entity_type: 'foreign_owned_llc' }],
  check_itin_eligibility: [{ has_ssn: false, reason: 'owner_of_us_llc' }],
  estimate_irs_penalty: [{ balance_owed_usd: 10000, months_late: 6 }],
  compare_formation_states: [{ operates_in_california: true, raising_venture_capital: true }],
  check_sales_tax_nexus: [{ annual_sales_usd: 600000, transaction_count: 500, states: ['CA'] }],
  estimate_reasonable_comp: [
    { business_net_profit_usd: 0, profit_driver: 'primarily_owner_services' },
    { business_net_profit_usd: 200000, profit_driver: 'primarily_owner_services' },
  ],
  estimate_augusta_rule: [{ fair_daily_rental_rate_usd: 1000, days_rented: 20 }],
  estimate_accountable_plan: [{ home_office_expense_usd: 3000, business_miles: 8000 }],
  get_fee_quote: [{ service: 'individual_return' }],
  book_consultation: [{ type: 'free_15min' }, { type: 'discovery_specialist_497' }],
  check_resolution_options: [{ balance_owed_usd: 25000, ability_to_pay: 'can_make_monthly_payments' }],
};

/** Rendered text (summary + structured JSON) for every tool/input pair. */
function everyToolOutput(): Array<{ tool: string; text: string; structured: Record<string, unknown> }> {
  const out: Array<{ tool: string; text: string; structured: Record<string, unknown> }> = [];
  for (const tool of TOOLS) {
    for (const input of TOOL_INPUTS[tool.name] ?? [{}]) {
      const r = tool.run(input as never);
      out.push({ tool: tool.name, text: `${r.summary} ${JSON.stringify(r.structured)}`, structured: r.structured });
    }
  }
  return out;
}

/** Rendered text for every resource and every prompt. */
function everyOtherOutput(): string[] {
  const texts = RESOURCES.map((r) => JSON.stringify(r.build()));
  for (const p of PROMPTS) {
    const args: Record<string, string> = {};
    for (const a of p.arguments ?? []) args[a.name] = 'sample';
    texts.push(JSON.stringify(p.build(args)));
  }
  return texts;
}

const BANNED: Array<[string, RegExp]> = [
  // Written as an escape so this source file itself stays em-dash-free.
  ['em dash (U+2014)', /\u2014/],
  ['"IRS-licensed"', /IRS-licensed/i],
  ['"licensed by the IRS"', /licensed by the IRS/i],
  ['"IRS Enrolled Agent" phrase', /IRS Enrolled Agent/i],
  ['"Certified Acceptance Agent" claim', /Certified Acceptance Agent/i],
  ['credential suffix "MST"', /\bMST\b/],
  ['a "$0 - $0" salary recommendation', /\$0\s*-\s*\$0/],
];

describe('banned-string gate (rendered output)', () => {
  const allText = [...everyToolOutput().map((o) => o.text), ...everyOtherOutput()].join('\n');
  for (const [label, re] of BANNED) {
    it(`no output contains ${label}`, () => {
      expect(allText).not.toMatch(re);
    });
  }
});

describe('required-string gate', () => {
  it('every tool response carries the exact disclaimer', () => {
    for (const o of everyToolOutput()) {
      expect(o.structured.disclaimer).toBe(DISCLAIMER);
    }
  });

  it('book_consultation carries the approved Enrolled Agent credential line', () => {
    const consult = TOOLS.find((t) => t.name === 'book_consultation')!;
    const text = JSON.stringify(consult.run({ type: 'free_15min' } as never).structured);
    expect(text).toContain(OFFICE.credential); // "Enrolled Agent"
    expect(text).toContain('Enrolled to practice before the IRS');
  });

  it('the zero-profit comp path emits no numeric salary field', () => {
    const comp = TOOLS.find((t) => t.name === 'estimate_reasonable_comp')!;
    const r = comp.run({ business_net_profit_usd: 0, profit_driver: 'primarily_owner_services' } as never);
    expect(r.structured.suggested_salary_low).toBeUndefined();
    expect(r.structured.suggested_salary_high).toBeUndefined();
    expect(r.structured.midpoint_salary).toBeUndefined();
  });
});
