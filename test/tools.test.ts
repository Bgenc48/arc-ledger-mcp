import { describe, it, expect } from 'vitest';
import { dispatch } from '../src/lib/mcp';
import { TOOLS, PROMPTS } from '../src/registry';
import { decodeIrsNotice } from '../src/tools/decodeIrsNotice';
import { explainTaxDocument } from '../src/tools/explainTaxDocument';
import { checkFbarFatca } from '../src/tools/checkFbarFatca';
import { compareLlcScorp } from '../src/tools/compareLlcScorp';
import { estimateQuarterlyTaxes } from '../src/tools/estimateQuarterlyTaxes';
import { estimateRentalIncome } from '../src/tools/estimateRentalIncome';
import { deadlineCalendar } from '../src/tools/deadlineCalendar';
import { checkItinEligibility } from '../src/tools/checkItinEligibility';
import { estimateIrsPenalty } from '../src/tools/estimateIrsPenalty';
import { compareFormationStates } from '../src/tools/compareFormationStates';
import { checkSalesTaxNexus } from '../src/tools/checkSalesTaxNexus';
import { estimateReasonableComp } from '../src/tools/estimateReasonableComp';
import { estimateAugustaRule } from '../src/tools/estimateAugustaRule';
import { estimateAccountablePlan } from '../src/tools/estimateAccountablePlan';
import { getFeeQuote } from '../src/tools/getFeeQuote';
import { bookConsultation } from '../src/tools/bookConsultation';
import { checkResolutionOptions } from '../src/tools/checkResolutionOptions';
import { triageTaxProblem } from '../src/tools/triageTaxProblem';
import { DISCLAIMER } from '../src/lib/config';
import { taxReturns, consultations, addOns, modifiers, resolution, usd } from '../src/pricing';
import { selfEmploymentTax, ficaOnWages } from '../src/lib/tax';

const reg = () => ({ tools: TOOLS, prompts: PROMPTS, version: '0.1.0' });
const FIRST_PARTY = /^https:\/\/(www\.)?arcandledger\.com\//;

describe('tools/list + prompts/list (directory requirements)', () => {
  it('advertises every tool with title + readOnlyHint + object inputSchema', () => {
    const res = dispatch({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, reg()) as any;
    const tools = res.result.tools;
    expect(tools).toHaveLength(21);
    for (const t of tools) {
      expect(t.title).toBeTruthy();
      expect(t.annotations.readOnlyHint).toBe(true);
      expect(t.annotations.title).toBeTruthy();
      expect(t.inputSchema.type).toBe('object');
      // ChatGPT's Apps SDK requires an outputSchema on every tool; ours is the
      // shared envelope schema, which structuredContent satisfies by construction.
      expect(t.outputSchema.type).toBe('object');
      expect(t.outputSchema.required).toEqual(expect.arrayContaining(['disclaimer', 'source_url', 'next_step']));
      expect(t.description.toLowerCase()).toContain('use this when');
    }
    expect(tools.map((t: any) => t.name).sort()).toEqual(
      [
        'book_consultation',
        'check_5472_obligation',
        'check_fbar_fatca',
        'check_itin_eligibility',
        'check_resolution_options',
        'check_sales_tax_nexus',
        'check_treaty_withholding',
        'compare_formation_states',
        'compare_llc_scorp',
        'deadline_calendar',
        'decode_irs_notice',
        'estimate_accountable_plan',
        'estimate_augusta_rule',
        'estimate_irs_penalty',
        'estimate_quarterly_taxes',
        'estimate_reasonable_comp',
        'estimate_rental_income',
        'explain_tax_document',
        'get_document_checklist',
        'get_fee_quote',
        'triage_tax_problem',
      ].sort(),
    );
  });

  it('advertises triage_tax_problem first (the tax-problem front door leads the list)', () => {
    const res = dispatch({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, reg()) as any;
    expect(res.result.tools[0].name).toBe('triage_tax_problem');
  });

  it('advertises the prompts including the Turkish-language ones', () => {
    const res = dispatch({ jsonrpc: '2.0', id: 1, method: 'prompts/list' }, reg()) as any;
    expect(res.result.prompts).toHaveLength(12);
    const names = res.result.prompts.map((p: any) => p.name);
    expect(names).toContain('help_with_my_tax_problem');
    expect(names).toContain('vergi_sorunum_var');
    expect(names).toContain('abd_sirket_vergi_takvimi');
    expect(names).toContain('itin_almali_miyim');
    expect(names).toContain('settle_my_irs_debt');
    expect(names).toContain('irs_borc_cozumu');
    expect(names).toContain('decodificar_mi_aviso_irs');
    expect(names).toContain('explain_my_tax_form');
    expect(names).toContain('bu_vergi_formu_ne');
  });
});

describe('every tool response carries the envelope', () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ['triage_tax_problem', { problem: 'back_taxes_owed' }],
    ['decode_irs_notice', { notice_code: 'CP2000' }],
    ['explain_tax_document', { document: '1099-K' }],
    ['check_fbar_fatca', { max_aggregate_foreign_balance_usd: 25000, filing_status: 'single', lives_abroad: false }],
    ['compare_llc_scorp', { expected_net_profit_usd: 120000 }],
    ['estimate_quarterly_taxes', { ytd_net_income_usd: 60000, entity: 'sole_proprietor' }],
    ['estimate_rental_income', { annual_rental_income_usd: 30000, operating_expenses_usd: 12000, property_purchase_price_usd: 400000 }],
    ['deadline_calendar', { entity_type: 'foreign_owned_llc' }],
    ['check_itin_eligibility', { has_ssn: false, reason: 'owner_of_us_llc' }],
    ['estimate_irs_penalty', { balance_owed_usd: 10000, months_late: 3 }],
    ['check_resolution_options', { balance_owed_usd: 30000, ability_to_pay: 'can_make_monthly_payments' }],
    ['compare_formation_states', { priority: 'lowest_cost' }],
    ['check_sales_tax_nexus', { annual_sales_usd: 150000, transaction_count: 300, states: ['CA', 'TX'] }],
    ['estimate_reasonable_comp', { business_net_profit_usd: 150000, profit_driver: 'primarily_owner_services' }],
    ['estimate_augusta_rule', { fair_daily_rental_rate_usd: 1500, days_rented: 12, marginal_tax_rate_pct: 32 }],
    ['estimate_accountable_plan', { home_office_expense_usd: 3000, business_miles: 6000, cell_internet_usd: 1200 }],
    ['get_fee_quote', { service: 'individual_return' }],
    ['book_consultation', { type: 'free_15min' }],
  ];
  for (const [name, args] of cases) {
    it(`${name} returns disclaimer + first-party source_url + first-party next_step`, () => {
      const res = dispatch({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }, reg()) as any;
      const sc = res.result.structuredContent;
      expect(sc.disclaimer).toBe(DISCLAIMER);
      expect(sc.source_url).toMatch(FIRST_PARTY);
      expect(sc.next_step.url).toMatch(FIRST_PARTY);
      // Disclaimer must also survive in the visible text.
      expect(res.result.content[0].text).toContain(DISCLAIMER);
    });
  }
});

describe('triage_tax_problem', () => {
  const PROBLEMS = [
    'irs_notice',
    'back_taxes_owed',
    'unfiled_returns',
    'levy_or_garnishment',
    'audit_or_exam',
    'penalties',
    'identity_verification',
    'payroll_tax_941',
    'state_tax',
    'not_sure',
  ] as const;

  it('a levy or garnishment is always act_now', () => {
    const out = triageTaxProblem.run({ problem: 'levy_or_garnishment' });
    expect(out.structured.urgency).toBe('act_now');
    expect((out.structured.next_step as any).label).toContain('levy');
  });

  it('has_deadline_soon raises any category to act_now and prepends the deadline warning', () => {
    const calm = triageTaxProblem.run({ problem: 'back_taxes_owed' });
    expect(calm.structured.urgency).toBe('plan_this_month');
    const urgent = triageTaxProblem.run({ problem: 'back_taxes_owed', has_deadline_soon: true });
    expect(urgent.structured.urgency).toBe('act_now');
    expect((urgent.structured.this_week as string[])[0]).toContain('response window');
  });

  it('a notice is act_this_week and routes to the notice review handoff', () => {
    const out = triageTaxProblem.run({ problem: 'irs_notice' });
    expect(out.structured.urgency).toBe('act_this_week');
    expect((out.structured.next_step as any).url).toContain('/go/notice-review');
    expect(out.structured.source_url).toContain('/irs-notices/');
  });

  it('back-tax fee comes from the pricing module, never a literal', () => {
    const out = triageTaxProblem.run({ problem: 'back_taxes_owed' });
    const svc = out.structured.matching_service as any;
    expect(svc.published_fee).toBe(usd(resolution.irsHealthCheck));
  });

  it('every recommended tool name exists in the registry', () => {
    const registryNames = new Set(TOOLS.map((t) => t.name));
    for (const problem of PROBLEMS) {
      const out = triageTaxProblem.run({ problem });
      for (const rec of out.structured.recommended_tools as Array<{ tool: string }>) {
        expect(registryNames.has(rec.tool)).toBe(true);
      }
    }
  });

  it('every branch returns urgency, actions, a matching service, and caveats', () => {
    for (const problem of PROBLEMS) {
      const out = triageTaxProblem.run({ problem });
      expect(['act_now', 'act_this_week', 'plan_this_month']).toContain(out.structured.urgency);
      expect((out.structured.this_week as string[]).length).toBeGreaterThanOrEqual(2);
      expect((out.structured.what_not_to_do as string[]).length).toBeGreaterThanOrEqual(2);
      expect((out.structured.matching_service as any).service).toBeTruthy();
      expect((out.structured.matching_service as any).published_fee).toBeTruthy();
      expect((out.structured.caveats as string[]).join(' ')).toContain('general-information');
    }
  });

  it('brief omits the month plan, avoid list, and tool recommendations', () => {
    const out = triageTaxProblem.run({ problem: 'penalties', brief: true });
    expect(out.structured.this_month).toBeUndefined();
    expect(out.structured.what_not_to_do).toBeUndefined();
    expect(out.structured.recommended_tools).toBeUndefined();
    expect(out.structured.urgency).toBe('plan_this_month');
    expect((out.structured.this_week as string[]).length).toBeGreaterThan(0);
  });

  it('not_sure offers the free call, never a formatted zero fee', () => {
    const out = triageTaxProblem.run({ problem: 'not_sure' });
    const svc = out.structured.matching_service as any;
    expect(svc.published_fee).toBe('free');
    expect(JSON.stringify(out.structured)).not.toMatch(/\$0\s*-\s*\$0/);
  });

  it('the $50,000 band note uses current Simple Payment Plan terminology', () => {
    const small = triageTaxProblem.run({ problem: 'back_taxes_owed', amount_band: 'from_10k_to_50k' });
    expect(small.structured.balance_note).toContain('Simple Payment Plan');
    expect(small.structured.balance_note).toContain('Account type');
    const large = triageTaxProblem.run({ problem: 'back_taxes_owed', amount_band: 'over_50k' });
    expect(large.structured.balance_note).toContain('Collection Information Statement');
  });

  it('deep unfiled history cites the six-year compliance norm', () => {
    const out = triageTaxProblem.run({ problem: 'unfiled_returns', years_behind: 'more_than_six' });
    expect(out.structured.filing_note).toContain('5-133');
  });
});

describe('decode_irs_notice', () => {
  it('computes the CP2000 30-day deadline from the notice date', () => {
    const out = decodeIrsNotice.run({ notice_code: 'cp 2000', received_date: '2026-06-01' });
    const d = out.structured.deadline as any;
    expect(out.structured.notice_code).toBe('CP2000');
    expect(d.days_from_notice).toBe(30);
    expect(d.computed_deadline).toBe('July 1, 2026');
  });

  it('resolves Letter 1058 to LT11 via alias', () => {
    const out = decodeIrsNotice.run({ notice_code: 'Letter 1058' });
    expect(out.structured.notice_code).toBe('LT11');
  });

  it('resolves the natural phrase "Notice of Deficiency" to CP3219A', () => {
    expect(decodeIrsNotice.run({ notice_code: 'Notice of Deficiency' }).structured.notice_code).toBe('CP3219A');
    expect(decodeIrsNotice.run({ notice_code: 'Notice CP2000' }).structured.notice_code).toBe('CP2000');
  });

  it('falls back gracefully for an unknown code', () => {
    const out = decodeIrsNotice.run({ notice_code: 'CP9999' });
    expect(out.structured.recognized).toBe(false);
    expect(out.structured.source_url).toContain('/irs-notices/');
  });

  it('covers the expanded registry: reviews, identity, unfiled, adjustments, penalties', () => {
    for (const code of ['CP05', 'CP05A', 'CP75', '12C', '5071C', '4883C', 'CP59', 'CP80', 'CP21A', 'CP22A', 'CP23', 'CP49', 'CP523', 'CP71C', 'CP215']) {
      expect(decodeIrsNotice.run({ notice_code: code }).structured.recognized, `expected ${code} to be recognized`).toBe(true);
    }
  });

  it('resolves the new aliases to their canonical profiles', () => {
    expect(decodeIrsNotice.run({ notice_code: 'Letter 12C' }).structured.notice_code).toBe('12C');
    expect(decodeIrsNotice.run({ notice_code: 'CP518' }).structured.notice_code).toBe('CP59');
    expect(decodeIrsNotice.run({ notice_code: '5747C' }).structured.notice_code).toBe('5071C');
    expect(decodeIrsNotice.run({ notice_code: 'CP15' }).structured.notice_code).toBe('CP215');
    expect(decodeIrsNotice.run({ notice_code: 'CP75A' }).structured.notice_code).toBe('CP75');
    expect(decodeIrsNotice.run({ notice_code: 'CP21B' }).structured.notice_code).toBe('CP21A');
  });

  it('computes the CP523 30-day termination window and the 12C 20-day reply window', () => {
    const cp523 = decodeIrsNotice.run({ notice_code: 'CP523', received_date: '2026-06-01' });
    expect((cp523.structured.deadline as any).computed_deadline).toBe('July 1, 2026');
    const l12c = decodeIrsNotice.run({ notice_code: '12C', received_date: '2026-06-01' });
    expect((l12c.structured.deadline as any).computed_deadline).toBe('June 21, 2026');
  });
});

describe('explain_tax_document', () => {
  it('resolves messy spellings to the same profile', () => {
    for (const spelling of ['W-2', 'w2', 'Form W-2']) {
      expect(explainTaxDocument.run({ document: spelling }).structured.document).toBe('Form W-2');
    }
    expect(explainTaxDocument.run({ document: '1099k' }).structured.document).toBe('Form 1099-K');
    expect(explainTaxDocument.run({ document: 'Schedule K-1 (Form 1065)' }).structured.document).toBe('Schedule K-1 (Form 1065)');
    expect(explainTaxDocument.run({ document: 'K-1' }).structured.document).toBe('Schedule K-1 (Form 1065)');
    expect(explainTaxDocument.run({ document: '1120-S K-1' }).structured.document).toBe('Schedule K-1 (Form 1120-S)');
  });

  it('does not confuse W-2G with W-2 or 1095-C with 1095-A', () => {
    expect(explainTaxDocument.run({ document: 'W-2G' }).structured.document).toBe('Form W-2G');
    expect(explainTaxDocument.run({ document: '1095-C' }).structured.document).toBe('Form 1095-B / 1095-C');
    expect(explainTaxDocument.run({ document: '1095-A' }).structured.document).toBe('Form 1095-A');
  });

  it('explains the 1099-K gross-vs-profit trap and CP2000 exposure', () => {
    const out = explainTaxDocument.run({ document: '1099-K' });
    const blob = JSON.stringify(out.structured);
    expect(blob).toContain('GROSS');
    expect(blob).toContain('CP2000');
    expect(out.structured.source_url).toContain('/services/ecommerce/');
  });

  it('routes international documents to the international-tax page', () => {
    expect(explainTaxDocument.run({ document: '1042-S' }).structured.source_url).toContain('/services/international-tax/');
    expect(explainTaxDocument.run({ document: 'W-8BEN' }).structured.source_url).toContain('/services/international-tax/');
  });

  it('tells non-US persons the W-9 is the wrong form for them', () => {
    const out = explainTaxDocument.run({ document: 'W-9' });
    expect(JSON.stringify(out.structured)).toContain('W-8BEN');
  });

  it('brief:true drops the box guide and checklist but keeps the core answer', () => {
    const brief = explainTaxDocument.run({ document: 'W-2', brief: true });
    expect(brief.structured.key_boxes).toBeUndefined();
    expect(brief.structured.check_before_filing).toBeUndefined();
    expect(brief.structured.what_it_is).toBeTruthy();
    expect(brief.structured.if_wrong_or_missing).toBeTruthy();
  });

  it('falls back gracefully for an unknown document and lists coverage', () => {
    const out = explainTaxDocument.run({ document: 'XYZ-42' });
    expect(out.structured.recognized).toBe(false);
    expect(Array.isArray(out.structured.covered_documents)).toBe(true);
    expect((out.structured.covered_documents as string[]).length).toBeGreaterThanOrEqual(25);
  });

  it('hands off to the free 15-minute call, never a checkout', () => {
    const out = explainTaxDocument.run({ document: 'K-1' });
    expect((out.structured.next_step as any).url).toContain('/go/book-15min');
    expect((out.structured.next_step as any).label).not.toMatch(/\$\d/);
  });
});

describe('check_fbar_fatca edges', () => {
  it('9,999 does not trigger FBAR; 10,001 does', () => {
    const below = checkFbarFatca.run({ max_aggregate_foreign_balance_usd: 9999, filing_status: 'single', lives_abroad: false });
    const above = checkFbarFatca.run({ max_aggregate_foreign_balance_usd: 10001, filing_status: 'single', lives_abroad: false });
    expect((below.structured.fbar as any).required).toBe(false);
    expect((above.structured.fbar as any).required).toBe(true);
  });

  it('single US 8938: 60k is possibly required, 80k required, 40k not required', () => {
    const s = (bal: number) => (checkFbarFatca.run({ max_aggregate_foreign_balance_usd: bal, filing_status: 'single', lives_abroad: false }).structured.form_8938 as any).status;
    expect(s(60000)).toBe('possibly_required');
    expect(s(80000)).toBe('required');
    expect(s(40000)).toBe('not_required');
  });

  it('MFJ living abroad uses the 400k/600k thresholds', () => {
    const f = checkFbarFatca.run({ max_aggregate_foreign_balance_usd: 500000, filing_status: 'married_filing_jointly', lives_abroad: true }).structured.form_8938 as any;
    expect(f.thresholds.year_end).toBe(400000);
    expect(f.thresholds.any_time).toBe(600000);
    expect(f.status).toBe('possibly_required'); // 500k is over the 400k year-end but under the 600k any-time threshold
  });

  it('surfaces catch-up options when there are unfiled years', () => {
    const out = checkFbarFatca.run({ max_aggregate_foreign_balance_usd: 250000, filing_status: 'single', lives_abroad: true, unfiled_years: 3 });
    expect(out.structured.catch_up_options).toBeDefined();
  });
});

describe('compare_llc_scorp (CA specifics)', () => {
  it('applies CA 1.5% S-corp franchise on net income AFTER owner wages, and our compliance fees', () => {
    // profit 150k, default salary 75k -> (150000-75000)*1.5% = 1125 (not 2250 on gross)
    const out = compareLlcScorp.run({ expected_net_profit_usd: 150000 });
    const sc = out.structured.s_corp as any;
    expect(sc.ca_franchise_tax).toBe(1125);
    // 1120-S + 4 payroll quarters + owner 1040 with one K-1 entry (both sides
    // carry the owner's personal filing so the comparison is apples-to-apples).
    expect(sc.our_compliance_fee).toBe(
      taxReturns.sCorp1120S_or_1065 + addOns.payroll_perQuarter * 4 + taxReturns.form1040 + modifiers.k1Received,
    );
  });

  it('charges no CA franchise tax to a plain sole proprietor (no LLC)', () => {
    const out = compareLlcScorp.run({ expected_net_profit_usd: 150000, currently_has_llc: false });
    expect((out.structured.sole_prop_or_smllc as any).ca_franchise_and_llc_fee).toBe(0);
    // With an LLC (the default) the $800 minimum applies.
    const withLlc = compareLlcScorp.run({ expected_net_profit_usd: 150000 });
    expect((withLlc.structured.sole_prop_or_smllc as any).ca_franchise_and_llc_fee).toBe(800);
  });

  it('applies the 0.9% Additional Medicare Tax above the $200k threshold on both sides', () => {
    // High profit: SE earnings = 500k x 0.9235 = 461,750 -> surtax on 261,750.
    const out = compareLlcScorp.run({ expected_net_profit_usd: 500000, owner_salary_estimate_usd: 250000 });
    const se = (out.structured.sole_prop_or_smllc as any).self_employment_tax;
    // Base SE tax: min(461750, wage base) x 12.4% + 461750 x 2.9% ; surtax: 261750 x 0.9%
    expect(se).toBeGreaterThan(selfEmploymentTax(500000).total); // strictly more than pre-surtax SE tax
    const fica = (out.structured.s_corp as any).fica_on_salary;
    // Salary 250k: surtax on 50k = 450 on top of FICA.
    expect(fica).toBe(Math.round(ficaOnWages(250000).total + 0.009 * 50000));
  });

  it('uses (profit - explicit salary) as the CA S-corp franchise base', () => {
    const out = compareLlcScorp.run({ expected_net_profit_usd: 150000, owner_salary_estimate_usd: 60000 });
    expect((out.structured.s_corp as any).ca_franchise_tax).toBe(1350); // (150000-60000)*1.5%
  });

  it('floors the CA S-corp franchise tax at $800 on low profit', () => {
    const out = compareLlcScorp.run({ expected_net_profit_usd: 20000 });
    expect((out.structured.s_corp as any).ca_franchise_tax).toBe(800);
  });

  it('SMLLC total shows only the $800 minimum (LLC gross-receipts fee excluded)', () => {
    const out = compareLlcScorp.run({ expected_net_profit_usd: 600000 });
    expect((out.structured.sole_prop_or_smllc as any).ca_franchise_and_llc_fee).toBe(800);
  });

  it('shows an employment-tax saving at solid profit', () => {
    const out = compareLlcScorp.run({ expected_net_profit_usd: 150000, owner_salary_estimate_usd: 70000 });
    expect(out.structured.employment_tax_savings_before_costs as number).toBeGreaterThan(0);
  });
});

describe('estimate_quarterly_taxes', () => {
  it('takes the lesser of 90% current or 100% prior-year safe harbor', () => {
    const out = estimateQuarterlyTaxes.run({ ytd_net_income_usd: 60000, entity: 'sole_proprietor', prior_year_total_tax_usd: 4000 });
    const fed = out.structured.federal as any;
    expect(fed.safe_harbor.required_annual_payment).toBeLessThanOrEqual(fed.safe_harbor.current_year_90pct);
    expect(fed.quarters).toHaveLength(4);
  });

  it('models California 30/40/0/30 installment weighting', () => {
    const out = estimateQuarterlyTaxes.run({ ytd_net_income_usd: 80000, entity: 'single_member_llc', state: 'CA' });
    const ca = out.structured.california as any;
    expect(ca.applies).toBe(true);
    expect(ca.weights).toEqual([0.3, 0.4, 0.0, 0.3]);
  });

  it('uses the 110% prior-year safe harbor when prior AGI is over $150k', () => {
    // Low prior tax so the prior-year harbor binds; high current tax.
    const out = estimateQuarterlyTaxes.run({ ytd_net_income_usd: 250000, entity: 'sole_proprietor', prior_year_total_tax_usd: 10000, prior_year_agi_usd: 200000 });
    const sh = (out.structured.federal as any).safe_harbor;
    expect(sh.required_annual_payment).toBe(11000); // 110% of 10,000, and below the 90% current figure
  });

  it('uses 100% prior-year when prior AGI is under $150k', () => {
    const out = estimateQuarterlyTaxes.run({ ytd_net_income_usd: 250000, entity: 'sole_proprietor', prior_year_total_tax_usd: 10000, prior_year_agi_usd: 100000 });
    expect(((out.structured.federal as any).safe_harbor.required_annual_payment)).toBe(10000);
  });

  it('defaults to the safe 110% figure when prior AGI is unknown', () => {
    const out = estimateQuarterlyTaxes.run({ ytd_net_income_usd: 250000, entity: 'sole_proprietor', prior_year_total_tax_usd: 10000 });
    expect(((out.structured.federal as any).safe_harbor.required_annual_payment)).toBe(11000);
  });
});

describe('get_fee_quote', () => {
  it('always returns a range (from < to), never a single number', () => {
    const out = getFeeQuote.run({ service: 'individual_return' });
    expect(out.structured.range_low).toBe(taxReturns.form1040);
    expect(out.structured.range_high as number).toBeGreaterThan(out.structured.range_low as number);
  });

  it('routes cross-border work to the Discovery Specialist', () => {
    const out = getFeeQuote.run({ service: 'international_form' });
    expect(out.structured.next_step.url).toContain('/go/discovery-specialist');
  });

  it('adds published modifiers for a multi-state return with rentals', () => {
    const out = getFeeQuote.run({ service: 'individual_return', details: { states: 2, rentals: 1 } });
    // 525 + 2*125 + 1*175 = 950
    expect(out.structured.range_low).toBe(950);
  });
});

describe('book_consultation', () => {
  it('maps each type to its first-party /go/ link and correct price', () => {
    const map: Array<[any, string, number]> = [
      ['free_15min', '/go/book-15min', consultations.free15Min],
      ['discovery_standard_297', '/go/discovery-standard', consultations.discoverySession_from],
      ['discovery_specialist_497', '/go/discovery-specialist', consultations.discoverySpecialist],
      ['notice_review_199', '/go/notice-review', consultations.irsNoticeReview],
    ];
    for (const [type, path, price] of map) {
      const out = bookConsultation.run({ type });
      expect(out.structured.booking_url as string).toContain(path);
      expect(out.structured.price_usd).toBe(price);
    }
  });

  it('includes the Enrolled Agent office-identity block with EN/TR/ES', () => {
    const out = bookConsultation.run({ type: 'free_15min' });
    const office = out.structured.office as any;
    expect(office.languages).toEqual(['English', 'Turkish', 'Spanish']);
    expect(office.practitioner).toContain('Enrolled Agent');
    expect(office.credential_note).toContain('U.S. Department of the Treasury');
  });
});

describe('estimate_rental_income', () => {
  it('computes straight-line depreciation on the building portion only', () => {
    const out = estimateRentalIncome.run({ annual_rental_income_usd: 30000, operating_expenses_usd: 10000, property_purchase_price_usd: 400000, land_percent: 20 });
    // building = 400000 * 0.8 = 320000 ; /27.5 = 11,636
    expect((out.structured.depreciation as any).annual_depreciation).toBe(Math.round(320000 / 27.5));
  });

  it('applies the $25k passive-loss allowance and phases it out by income', () => {
    // Big depreciation drives a loss; low other income -> full allowance available.
    const lowIncome = estimateRentalIncome.run({ annual_rental_income_usd: 10000, operating_expenses_usd: 20000, property_purchase_price_usd: 500000, other_income_usd: 80000 });
    expect((lowIncome.structured.passive_loss_treatment as any).deductible_against_other_income_this_year).toBeGreaterThan(0);
    // Income >= 150k -> allowance fully phased out (non-RE-professional).
    const highIncome = estimateRentalIncome.run({ annual_rental_income_usd: 10000, operating_expenses_usd: 20000, property_purchase_price_usd: 500000, other_income_usd: 160000 });
    expect((highIncome.structured.passive_loss_treatment as any).deductible_against_other_income_this_year).toBe(0);
    expect((highIncome.structured.passive_loss_treatment as any).carried_forward).toBeGreaterThan(0);
  });

  it('a real-estate professional is not passive-limited', () => {
    const out = estimateRentalIncome.run({ annual_rental_income_usd: 10000, operating_expenses_usd: 40000, other_income_usd: 300000, real_estate_professional: true });
    const t = out.structured.passive_loss_treatment as any;
    expect(t.carried_forward).toBe(0);
    expect(t.deductible_against_other_income_this_year).toBeGreaterThan(0);
  });

  it('applies the short-term 14-day tax-free rule only when used as a residence (personal use > 14)', () => {
    const exempt = estimateRentalIncome.run({ annual_rental_income_usd: 8000, rental_type: 'short_term', rental_days: 10, personal_use_days: 100 });
    expect((exempt.structured.fourteen_day_rule as any).applies).toBe(true);
    expect(exempt.structured.taxable).toBe(0);
    // Rented 10, personal 12: personal exceeds rental but is NOT over 14, so the
    // unit is not a residence and the income IS reportable (not exempt).
    const notExempt = estimateRentalIncome.run({ annual_rental_income_usd: 8000, rental_type: 'short_term', rental_days: 10, personal_use_days: 12 });
    expect(notExempt.structured.fourteen_day_rule).toBeUndefined();
  });
});

describe('deadline_calendar', () => {
  it('gives a foreign-owned LLC the 1120 + 5472 deadline with the $25k penalty', () => {
    const out = deadlineCalendar.run({ entity_type: 'foreign_owned_llc', filing_year: 2026 });
    const rows = out.structured.deadlines as any[];
    const f5472 = rows.find((r) => r.form.includes('5472'));
    expect(f5472.due).toBe('2027-04-15');
    expect(f5472.penalty).toContain('$25,000');
  });

  it('a nonresident with no US wages is due June 15, with US wages April 15', () => {
    const noWages = deadlineCalendar.run({ entity_type: 'nonresident_individual', filing_year: 2026, has_us_source_wages: false });
    expect((noWages.structured.deadlines as any[])[0].due).toBe('2027-06-15');
    const wages = deadlineCalendar.run({ entity_type: 'nonresident_individual', filing_year: 2026, has_us_source_wages: true });
    expect((wages.structured.deadlines as any[])[0].due).toBe('2027-04-15');
  });

  it('adds FBAR with the automatic October extension when accounts exceed $10k', () => {
    const out = deadlineCalendar.run({ entity_type: 'foreign_owned_llc', filing_year: 2026, has_foreign_bank_over_10k: true });
    const fbar = (out.structured.deadlines as any[]).find((r) => r.form.includes('FBAR'));
    expect(fbar).toBeTruthy();
    expect(fbar.extended).toContain('AUTOMATIC');
  });

  it('marks US-formed companies exempt from the BOI report', () => {
    const usFormed = deadlineCalendar.run({ entity_type: 'foreign_owned_llc', formed_in_us: true });
    expect((usFormed.structured.boi_report as any).applies).toBe(false);
    const foreignFormed = deadlineCalendar.run({ entity_type: 'foreign_owned_c_corp', formed_in_us: false });
    expect((foreignFormed.structured.boi_report as any).applies).toBe(true);
  });
});

describe('check_itin_eligibility', () => {
  it('tells an SSN holder they are not eligible', () => {
    const out = checkItinEligibility.run({ has_ssn: true, reason: 'file_us_tax_return' });
    expect(out.structured.eligibility_status).toBe('not_eligible_ssn_available');
  });

  it('does not treat foreign LLC ownership as automatic personal ITIN eligibility', () => {
    const out = checkItinEligibility.run({ has_ssn: false, reason: 'owner_of_us_llc' });
    expect(out.structured.eligibility_status).toBe('not_established_by_entity_ownership');
    expect(out.summary).toContain('reference ID');
    const note = out.structured.document_handling as string;
    expect(note).toContain('Enrolled Agent');
    expect(note).toContain('Form W-7');
    expect(note).toContain('Certifying Acceptance Agent');
    // The firm is not represented as a CAA. The CAA reference is a third-party
    // document-handling option.
    expect(note).not.toContain('Arc & Ledger is a Certifying Acceptance Agent');
    expect(out.structured).not.toHaveProperty('certified_acceptance_agent');
  });

  it('flags treaty-benefit applicants as not needing a return attached', () => {
    const out = checkItinEligibility.run({ has_ssn: false, reason: 'claim_treaty_benefit' });
    expect(out.structured.tax_return_required_with_application).toBe(false);
  });

  it('does not confirm eligibility for a bank-account-only reason (no tax purpose)', () => {
    const out = checkItinEligibility.run({ has_ssn: false, reason: 'open_us_bank_or_other' });
    expect(out.structured.eligibility_status).toBe('not_eligible_on_reason_alone');
  });
});

describe('estimate_irs_penalty', () => {
  it('applies the 4.5%/mo effective failure-to-file when not filed', () => {
    // $10,000, 3 months, not filed: FTF = 10000 * (0.15 - 3*0.005) = 10000*0.135 = 1350
    const out = estimateIrsPenalty.run({ balance_owed_usd: 10000, months_late: 3, return_filed: false });
    expect(out.structured.failure_to_file_penalty).toBe(1350);
    expect(out.structured.failure_to_pay_penalty).toBe(150); // 10000 * 3 * 0.005
  });

  it('drops the failure-to-file penalty when the return was filed', () => {
    const out = estimateIrsPenalty.run({ balance_owed_usd: 10000, months_late: 3, return_filed: true });
    expect(out.structured.failure_to_file_penalty).toBe(0);
    expect(out.structured.failure_to_pay_penalty).toBe(150);
  });

  it('caps the failure-to-file penalty at 25% (minus the FTP overlap)', () => {
    // 20 months, not filed: gross capped at 25%, minus 5 overlap months * 0.5% = 2.5% -> 22.5%
    const out = estimateIrsPenalty.run({ balance_owed_usd: 10000, months_late: 20, return_filed: false });
    expect(out.structured.failure_to_file_penalty).toBe(2250); // 10000 * 0.225
  });

  it('applies the >60-day minimum FTF floor on a small balance', () => {
    // $400 balance, 3 months, not filed: percentage FTF ~ $54, but the floor is
    // lesser of $525 or 100% of tax = $400. Floor wins.
    const out = estimateIrsPenalty.run({ balance_owed_usd: 400, months_late: 3, return_filed: false });
    expect(out.structured.failure_to_file_penalty).toBe(400);
  });

  it('explains the current AEP transition without promising relief', () => {
    const out = estimateIrsPenalty.run({ balance_owed_usd: 5000, months_late: 2, return_filed: true });
    const rendered = `${out.summary}\n${JSON.stringify(out.structured)}`;
    expect(rendered).toContain('Automatic Exemption from Penalty');
    expect(rendered).toContain('First Time Abate');
    expect(rendered).toContain('reasonable-cause');
    expect(rendered).toContain('third-quarter 2026');
    expect(rendered).toContain('0.25%');
    expect(rendered).not.toMatch(/will (?:receive|qualify for|be granted)/i);
  });
});

describe('check_resolution_options', () => {
  const optionNames = (out: ReturnType<typeof checkResolutionOptions.run>) =>
    (out.structured.options as Array<{ path: string; fits: string }>);

  it('screens an individual mid-size balance toward the current Simple Payment Plan', () => {
    const out = checkResolutionOptions.run({
      balance_owed_usd: 30000,
      ability_to_pay: 'can_make_monthly_payments',
      all_required_returns_filed: true,
      tax_account_type: 'individual_income_tax',
    });
    const ia = optionNames(out).find((o) => o.path.startsWith('Simple Payment Plan'));
    expect(ia).toBeDefined();
    expect(ia!.fits).toBe('possible');
    expect(optionNames(out).every((option) => option.fits !== 'likely')).toBe(true);
    expect(optionNames(out).some((o) => o.path.includes('financial review'))).toBe(false);
    expect(JSON.stringify(out.structured)).not.toContain('72 months');
    expect(JSON.stringify(out.structured)).not.toContain('Streamlined installment');
    expect(JSON.stringify(out.structured)).toContain('Automatic Exemption from Penalty');
  });

  it('does not call the simple-plan path likely when the account type is unknown', () => {
    const out = checkResolutionOptions.run({
      balance_owed_usd: 30000,
      ability_to_pay: 'can_make_monthly_payments',
      all_required_returns_filed: true,
    });
    const ia = optionNames(out).find((o) => o.path.startsWith('Simple Payment Plan'));
    expect(ia?.fits).toBe('possible');
    expect(out.summary).toContain('account type');
  });

  it('routes a $30k business trust-fund balance to the financial-review track', () => {
    const out = checkResolutionOptions.run({
      balance_owed_usd: 30000,
      ability_to_pay: 'can_make_monthly_payments',
      all_required_returns_filed: true,
      tax_account_type: 'business_trust_fund',
    });
    expect(optionNames(out).some((o) => o.path.includes('financial review'))).toBe(true);
  });

  it('keeps the business trust-fund Simple Payment Plan boundary at $25k', () => {
    const atBoundary = checkResolutionOptions.run({
      balance_owed_usd: 25000,
      ability_to_pay: 'can_make_monthly_payments',
      all_required_returns_filed: true,
      tax_account_type: 'business_trust_fund',
    });
    const overBoundary = checkResolutionOptions.run({
      balance_owed_usd: 25001,
      ability_to_pay: 'can_make_monthly_payments',
      all_required_returns_filed: true,
      tax_account_type: 'business_trust_fund',
    });
    expect(optionNames(atBoundary).some((o) => o.path === 'Simple Payment Plan (Business Trust Fund)')).toBe(true);
    expect(optionNames(overBoundary).some((o) => o.path.includes('financial review'))).toBe(true);
  });

  it('uses the individual online short-term threshold cautiously', () => {
    const under = checkResolutionOptions.run({
      balance_owed_usd: 99999,
      ability_to_pay: 'can_pay_in_full_soon',
      all_required_returns_filed: true,
      tax_account_type: 'individual_income_tax',
    });
    const at = checkResolutionOptions.run({
      balance_owed_usd: 100000,
      ability_to_pay: 'can_pay_in_full_soon',
      all_required_returns_filed: true,
      tax_account_type: 'individual_income_tax',
    });
    expect(optionNames(under).find((o) => o.path === 'Short-term payment plan')?.fits).toBe('possible');
    expect(optionNames(at).find((o) => o.path === 'Short-term payment plan')?.fits).toBe('possible');
  });

  it('routes a balance over $50k to the financial-review installment track', () => {
    const out = checkResolutionOptions.run({
      balance_owed_usd: 90000,
      ability_to_pay: 'can_make_monthly_payments',
      all_required_returns_filed: true,
      tax_account_type: 'individual_income_tax',
    });
    expect(optionNames(out).some((o) => o.path.includes('financial review'))).toBe(true);
  });

  it('surfaces the filing-compliance gate when returns are not filed', () => {
    const out = checkResolutionOptions.run({
      balance_owed_usd: 20000,
      ability_to_pay: 'can_pay_little',
      all_required_returns_filed: false,
    });
    expect(out.structured.filing_compliance_gate as string).toContain('FIRST STEP');
    expect(out.summary).toContain('filing compliance');
  });

  it('offers CNC and an OIC fit-check under hardship', () => {
    const out = checkResolutionOptions.run({
      balance_owed_usd: 60000,
      ability_to_pay: 'cannot_pay_basic_living',
      all_required_returns_filed: true,
    });
    const cnc = optionNames(out).find((o) => o.path.startsWith('Currently Not Collectible'));
    expect(cnc!.fits).toBe('possible');
    const oic = optionNames(out).find((o) => o.path.startsWith('Offer in Compromise'));
    expect(oic!.fits).toBe('possible');
  });

  // Circular 230: the tool must NEVER promise the IRS will accept an offer or
  // guarantee any outcome. It presents the OIC path only as a fit-check.
  it('never promises an OIC will be accepted (Circular 230)', () => {
    const out = checkResolutionOptions.run({
      balance_owed_usd: 80000,
      ability_to_pay: 'cannot_pay_basic_living',
      all_required_returns_filed: true,
    });
    const blob = JSON.stringify(out.structured).toLowerCase();
    // No affirmative promise of acceptance or a specific outcome.
    expect(blob).not.toContain('guaranteed');
    expect(blob).not.toContain('we guarantee');
    expect(blob).not.toContain('pennies on the dollar');
    expect(blob).not.toContain('settle for pennies');
    // The OIC path is framed as a fit-check and explicitly disclaims a promise.
    const oic = optionNames(out).find((o) => o.path.startsWith('Offer in Compromise'));
    expect(oic!.path.toLowerCase()).toContain('fit-check');
    expect((oic as unknown as { what_it_is: string }).what_it_is.toLowerCase()).toContain('not a prediction or promise');
    // Credentialing language: never "licensed"/"certified"/"IRS Enrolled Agent".
    expect(blob).not.toContain('licensed');
    expect(blob).not.toContain('irs enrolled agent');
  });
});

describe('compare_formation_states', () => {
  it('recommends Wyoming for a simple low-cost founder', () => {
    const out = compareFormationStates.run({ priority: 'lowest_cost' });
    expect(out.structured.recommended_state).toBe('Wyoming');
  });

  it('recommends California when the founder operates there', () => {
    const out = compareFormationStates.run({ operates_in_california: true });
    expect(out.structured.recommended_state).toBe('California');
  });

  it('recommends Delaware for a VC-raising founder, and New Mexico for privacy', () => {
    expect(compareFormationStates.run({ raising_venture_capital: true }).structured.recommended_state).toBe('Delaware');
    expect(compareFormationStates.run({ priority: 'most_privacy' }).structured.recommended_state).toBe('New Mexico');
  });
});

describe('check_sales_tax_nexus', () => {
  it('flags CA nexus at $500k+ (sales only), not at $150k', () => {
    const under = checkSalesTaxNexus.run({ annual_sales_usd: 150000, transaction_count: 300, states: ['CA'] });
    expect((under.structured.states as any[])[0].economic_nexus_likely).toBe(false);
    const over = checkSalesTaxNexus.run({ annual_sales_usd: 600000, transaction_count: 300, states: ['CA'] });
    expect((over.structured.states as any[])[0].economic_nexus_likely).toBe(true);
  });

  it('a transaction-only trigger on the default test is "possible", not a definite yes', () => {
    // 250 txns > 200 but sales < $100k: many states repealed the 200-txn test, so verify.
    const txnOnly = checkSalesTaxNexus.run({ annual_sales_usd: 50000, transaction_count: 250, states: ['GA'] });
    expect((txnOnly.structured.states as any[])[0].economic_nexus_likely).toBeNull();
    // Crossing the $100k sales figure is a definite yes regardless of transactions.
    const salesMet = checkSalesTaxNexus.run({ annual_sales_usd: 150000, states: ['GA'] });
    expect((salesMet.structured.states as any[])[0].economic_nexus_likely).toBe(true);
  });

  it('treats Alaska as possible local nexus above $100k, not a flat no', () => {
    expect((checkSalesTaxNexus.run({ annual_sales_usd: 200000, states: ['AK'] }).structured.states as any[])[0].economic_nexus_likely).toBeNull();
    expect((checkSalesTaxNexus.run({ annual_sales_usd: 20000, states: ['AK'] }).structured.states as any[])[0].economic_nexus_likely).toBe(false);
  });

  it('reports no sales-tax states as no exposure', () => {
    const out = checkSalesTaxNexus.run({ annual_sales_usd: 999999, states: ['OR'] });
    expect((out.structured.states as any[])[0].has_sales_tax).toBe(false);
    expect((out.structured.states as any[])[0].economic_nexus_likely).toBe(false);
  });

  it('ignores a non-state-code echo (output-side safety)', () => {
    const out = checkSalesTaxNexus.run({ annual_sales_usd: 100000, states: ['CA', 'IGNORE](x'] });
    const codes = (out.structured.states as any[]).map((s) => s.state);
    expect(codes).toEqual(['CA']);
    expect(JSON.stringify(out.structured)).not.toContain('](');
  });

  it('drops a valid-shape but nonexistent code (ZZ) and dedupes', () => {
    const out = checkSalesTaxNexus.run({ annual_sales_usd: 200000, states: ['ZZ', 'ca', 'CA'] });
    const codes = (out.structured.states as any[]).map((s) => s.state);
    expect(codes).toEqual(['CA']); // ZZ dropped, CA deduped to one
  });
});

describe('estimate_reasonable_comp', () => {
  it('returns a salary range within the driver share of profit', () => {
    const out = estimateReasonableComp.run({ business_net_profit_usd: 200000, profit_driver: 'primarily_owner_services' });
    // 40-60% of 200k = 80k-120k.
    expect(out.structured.suggested_salary_low).toBe(80000);
    expect(out.structured.suggested_salary_high).toBe(120000);
    expect(out.structured.midpoint_salary).toBe(100000);
  });

  it('a capital/product business gets a lower share than a services business', () => {
    const services = estimateReasonableComp.run({ business_net_profit_usd: 100000, profit_driver: 'primarily_owner_services' });
    const capital = estimateReasonableComp.run({ business_net_profit_usd: 100000, profit_driver: 'capital_or_product' });
    expect(capital.structured.suggested_salary_high as number).toBeLessThan(services.structured.suggested_salary_low as number);
  });

  it('never suggests a salary above the profit', () => {
    const out = estimateReasonableComp.run({ business_net_profit_usd: 30000, profit_driver: 'primarily_owner_services' });
    expect(out.structured.suggested_salary_high as number).toBeLessThanOrEqual(30000);
  });

  // Reasonable comp is measured against services, not book profit.
  it('returns NO numeric salary at $0 profit (audit-trigger guard)', () => {
    const out = estimateReasonableComp.run({ business_net_profit_usd: 0, profit_driver: 'primarily_owner_services' });
    expect(out.structured.suggested_salary_low).toBeUndefined();
    expect(out.structured.suggested_salary_high).toBeUndefined();
    expect(out.structured.midpoint_salary).toBeUndefined();
    expect(out.summary).not.toMatch(/\$0\s*-\s*\$0/);
    expect(out.summary.toLowerCase()).toContain('not a percentage of profit');
  });

  it('returns NO numeric salary below the meaningful-profit floor', () => {
    const out = estimateReasonableComp.run({ business_net_profit_usd: 10000, profit_driver: 'primarily_owner_services' });
    expect(out.structured.suggested_salary_high).toBeUndefined();
    expect(out.summary.toLowerCase()).toContain('below the level');
  });
});

describe('estimate_augusta_rule', () => {
  it('computes conditional amounts within the 14-day screen', () => {
    const out = estimateAugustaRule.run({ fair_daily_rental_rate_usd: 1000, days_rented: 10, marginal_tax_rate_pct: 30 });
    expect((out.structured.day_count_screen as any).passes).toBe(true);
    expect(out.structured.potential_business_rent_expense).toBe(10000); // 1000 x 10
    expect(out.structured.potential_owner_income_exclusion).toBe(10000);
    expect(out.structured.estimated_potential_income_tax_effect).toBe(3000); // 10000 x 30%
    expect(out.summary).toContain('passes only');
  });

  it('flags loss of the owner-side exclusion past the limit without denying a possible business expense', () => {
    const out = estimateAugustaRule.run({ fair_daily_rental_rate_usd: 1000, days_rented: 20 });
    expect((out.structured.day_count_screen as any).passes).toBe(false);
    expect(out.structured.potential_business_rent_expense).toBe(20000);
    expect(out.structured.potential_owner_income_exclusion).toBe(0);
    expect(out.structured.estimated_potential_income_tax_effect).toBe(0);
  });

  it('defaults the marginal rate when none is given', () => {
    const out = estimateAugustaRule.run({ fair_daily_rental_rate_usd: 500, days_rented: 14 });
    // 500 x 14 = 7000 conditional amount; default 22% -> 1540 potential effect.
    expect(out.structured.potential_business_rent_expense).toBe(7000);
    expect(out.structured.estimated_potential_income_tax_effect).toBe(1540);
  });
});

describe('estimate_accountable_plan', () => {
  it('uses the 76-cent rate for miles on or after July 1, 2026', () => {
    const out = estimateAccountablePlan.run({
      home_office_expense_usd: 3000,
      business_miles: 10000,
      business_mileage_period: 'on_or_after_july_1_2026',
      cell_internet_usd: 1200,
      other_business_expense_usd: 800,
      marginal_tax_rate_pct: 25,
    });
    // mileage 10000 x 0.76 = 7600; total = 3000 + 7600 + 1200 + 800 = 12600.
    expect(out.structured.total_annual_reimbursement).toBe(12600);
    expect(out.structured.estimated_annual_tax_saving).toBe(round(12600 * 0.25));
  });

  it('uses the 72.5-cent rate for miles before July 1, 2026', () => {
    const out = estimateAccountablePlan.run({
      business_miles: 10000,
      business_mileage_period: 'before_july_1_2026',
    });
    expect(out.structured.total_annual_reimbursement).toBe(7250);
  });

  it('returns a range rather than inventing one rate when the mileage period is unknown', () => {
    const out = estimateAccountablePlan.run({ business_miles: 10000 });
    expect(out.structured.total_annual_reimbursement).toBeUndefined();
    expect(out.structured.total_annual_reimbursement_range).toEqual({ low: 7250, high: 7600 });
    expect(out.summary).toContain('false precision');
  });

  it('handles a call with no amounts (prompts for input)', () => {
    const out = estimateAccountablePlan.run({});
    expect(out.structured.total_annual_reimbursement).toBe(0);
    expect(out.structured.estimated_annual_tax_saving).toBe(0);
  });
});

function round(n: number): number {
  return Math.round(n);
}
