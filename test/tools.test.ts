import { describe, it, expect } from 'vitest';
import { dispatch } from '../src/lib/mcp';
import { TOOLS, PROMPTS } from '../src/registry';
import { decodeIrsNotice } from '../src/tools/decodeIrsNotice';
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
import { DISCLAIMER } from '../src/lib/config';
import { taxReturns, consultations, addOns, modifiers } from '../src/pricing';
import { selfEmploymentTax, ficaOnWages } from '../src/lib/tax';

const reg = () => ({ tools: TOOLS, prompts: PROMPTS, version: '0.1.0' });
const FIRST_PARTY = /^https:\/\/(www\.)?arcandledger\.com\//;

describe('tools/list + prompts/list (directory requirements)', () => {
  it('advertises every tool with title + readOnlyHint + object inputSchema', () => {
    const res = dispatch({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, reg()) as any;
    const tools = res.result.tools;
    expect(tools).toHaveLength(18);
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
        'get_document_checklist',
        'get_fee_quote',
      ].sort(),
    );
  });

  it('advertises the prompts including the Turkish-language ones', () => {
    const res = dispatch({ jsonrpc: '2.0', id: 1, method: 'prompts/list' }, reg()) as any;
    expect(res.result.prompts).toHaveLength(8);
    const names = res.result.prompts.map((p: any) => p.name);
    expect(names).toContain('abd_sirket_vergi_takvimi');
    expect(names).toContain('itin_almali_miyim');
    expect(names).toContain('settle_my_irs_debt');
    expect(names).toContain('irs_borc_cozumu');
    expect(names).toContain('decodificar_mi_aviso_irs');
  });
});

describe('every tool response carries the envelope', () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ['decode_irs_notice', { notice_code: 'CP2000' }],
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
    expect(out.structured.eligible).toBe(false);
  });

  it('qualifies a foreign LLC owner without an SSN and describes EA-led document handling (no CAA claim)', () => {
    const out = checkItinEligibility.run({ has_ssn: false, reason: 'owner_of_us_llc' });
    expect(out.structured.eligible).toBe(true);
    const note = out.structured.document_handling as string;
    expect(note).toContain('Enrolled Agent');
    expect(note).toContain('Form W-7');
    // The firm is NOT an approved CAA - the tool must not claim it is one.
    expect(note).not.toContain('Certified Acceptance Agent');
    expect(out.structured).not.toHaveProperty('certified_acceptance_agent');
  });

  it('flags treaty-benefit applicants as not needing a return attached', () => {
    const out = checkItinEligibility.run({ has_ssn: false, reason: 'claim_treaty_benefit' });
    expect(out.structured.tax_return_required_with_application).toBe(false);
  });

  it('does not confirm eligibility for a bank-account-only reason (no tax purpose)', () => {
    const out = checkItinEligibility.run({ has_ssn: false, reason: 'open_us_bank_or_other' });
    expect(out.structured.eligible).toBe(false);
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
});

describe('check_resolution_options', () => {
  const optionNames = (out: ReturnType<typeof checkResolutionOptions.run>) =>
    (out.structured.options as Array<{ path: string; fits: string }>);

  it('screens a mid-size balance with monthly capacity toward a streamlined installment agreement', () => {
    const out = checkResolutionOptions.run({
      balance_owed_usd: 30000,
      ability_to_pay: 'can_make_monthly_payments',
      all_required_returns_filed: true,
    });
    const ia = optionNames(out).find((o) => o.path.startsWith('Streamlined installment agreement'));
    expect(ia).toBeDefined();
    expect(ia!.fits).toBe('likely');
    // Under $50k => streamlined track, not the financial-disclosure one.
    expect(optionNames(out).some((o) => o.path.includes('financial disclosure'))).toBe(false);
  });

  it('routes a balance over $50k to the financial-disclosure installment track', () => {
    const out = checkResolutionOptions.run({
      balance_owed_usd: 90000,
      ability_to_pay: 'can_make_monthly_payments',
      all_required_returns_filed: true,
    });
    expect(optionNames(out).some((o) => o.path.includes('financial disclosure'))).toBe(true);
  });

  it('surfaces the filing-compliance gate when returns are not filed', () => {
    const out = checkResolutionOptions.run({
      balance_owed_usd: 20000,
      ability_to_pay: 'can_pay_little',
      all_required_returns_filed: false,
    });
    expect(out.structured.filing_compliance_gate as string).toContain('FIRST STEP');
    expect(out.summary).toContain('all returns filed');
  });

  it('offers CNC and an OIC fit-check under hardship', () => {
    const out = checkResolutionOptions.run({
      balance_owed_usd: 60000,
      ability_to_pay: 'cannot_pay_basic_living',
      all_required_returns_filed: true,
    });
    const cnc = optionNames(out).find((o) => o.path.startsWith('Currently Not Collectible'));
    expect(cnc!.fits).toBe('likely');
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
  it('computes the tax-free rent and saving within the 14-day limit', () => {
    const out = estimateAugustaRule.run({ fair_daily_rental_rate_usd: 1000, days_rented: 10, marginal_tax_rate_pct: 30 });
    expect(out.structured.qualifies_for_exclusion).toBe(true);
    expect(out.structured.business_deduction).toBe(10000); // 1000 x 10
    expect(out.structured.tax_free_to_you).toBe(10000);
    expect(out.structured.estimated_tax_saving).toBe(3000); // 10000 x 30%
  });

  it('caps eligible days at 14 and flags loss of exclusion past the limit', () => {
    const out = estimateAugustaRule.run({ fair_daily_rental_rate_usd: 1000, days_rented: 20 });
    expect(out.structured.qualifies_for_exclusion).toBe(false);
    expect(out.structured.eligible_days).toBe(14);
    expect(out.structured.tax_free_to_you).toBe(0); // over the limit -> nothing excluded
  });

  it('defaults the marginal rate when none is given', () => {
    const out = estimateAugustaRule.run({ fair_daily_rental_rate_usd: 500, days_rented: 14 });
    // 500 x 14 = 7000 deduction; default 22% -> 1540 saving.
    expect(out.structured.business_deduction).toBe(7000);
    expect(out.structured.estimated_tax_saving).toBe(1540);
  });
});

describe('estimate_accountable_plan', () => {
  it('totals reimbursements including mileage at the standard rate', () => {
    const out = estimateAccountablePlan.run({
      home_office_expense_usd: 3000,
      business_miles: 10000,
      cell_internet_usd: 1200,
      other_business_expense_usd: 800,
      marginal_tax_rate_pct: 25,
    });
    // mileage 10000 x 0.725 = 7250; total = 3000 + 7250 + 1200 + 800 = 12250.
    expect(out.structured.total_annual_reimbursement).toBe(12250);
    expect(out.structured.estimated_annual_tax_saving).toBe(round(12250 * 0.25));
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
