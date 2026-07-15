/**
 * Generates real worked-example tool responses (docs/worked-examples.json),
 * used by the arcandledger.com/mcp docs page. Bundles the TS tools with
 * esbuild (already a dep) then runs them, so the examples are exactly what
 * the deployed server returns.
 *
 *   node scripts/gen-examples.mjs
 */
import { build } from 'esbuild';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outFile = join(root, 'docs', 'worked-examples.json');
const tmp = join(root, '.wrangler', 'gen-examples.bundle.mjs');

const ENTRY = `
import { decodeIrsNotice } from '../src/tools/decodeIrsNotice';
import { explainTaxDocument } from '../src/tools/explainTaxDocument';
import { checkFbarFatca } from '../src/tools/checkFbarFatca';
import { compareLlcScorp } from '../src/tools/compareLlcScorp';
import { estimateQuarterlyTaxes } from '../src/tools/estimateQuarterlyTaxes';
import { getFeeQuote } from '../src/tools/getFeeQuote';
import { bookConsultation } from '../src/tools/bookConsultation';
import { estimateReasonableComp } from '../src/tools/estimateReasonableComp';
import { estimateAugustaRule } from '../src/tools/estimateAugustaRule';
import { estimateAccountablePlan } from '../src/tools/estimateAccountablePlan';

export const cases = [
  { prompt: 'I got an IRS CP2000 notice dated June 1, 2026 for about $4,200. What is it and what do I do?',
    tool: 'decode_irs_notice',
    input: { notice_code: 'CP2000', received_date: '2026-06-01', amount_shown: 4200 },
    run: (i) => decodeIrsNotice.run(i) },
  { prompt: 'I sell on Etsy and just got a 1099-K for $38,000 but I definitely did not make that much. What is this form?',
    tool: 'explain_tax_document',
    input: { document: '1099-K' },
    run: (i) => explainTaxDocument.run(i) },
  { prompt: 'I am single, live in the US, and my foreign accounts peaked around $65,000 this year. Do I have to file anything?',
    tool: 'check_fbar_fatca',
    input: { max_aggregate_foreign_balance_usd: 65000, filing_status: 'single', lives_abroad: false },
    run: (i) => checkFbarFatca.run(i) },
  { prompt: 'I am a freelancer expecting about $150,000 net profit in California. Would an S-corp save me money?',
    tool: 'compare_llc_scorp',
    input: { expected_net_profit_usd: 150000, state: 'CA' },
    run: (i) => compareLlcScorp.run(i) },
  { prompt: 'I have made $60,000 net so far this year as a sole proprietor in CA. How much estimated tax should I pay?',
    tool: 'estimate_quarterly_taxes',
    input: { ytd_net_income_usd: 60000, entity: 'sole_proprietor', state: 'CA', prior_year_total_tax_usd: 9000 },
    run: (i) => estimateQuarterlyTaxes.run(i) },
  { prompt: 'What would you charge to do my individual return with 2 states and a rental?',
    tool: 'get_fee_quote',
    input: { service: 'individual_return', details: { states: 2, rentals: 1 } },
    run: (i) => getFeeQuote.run(i) },
  { prompt: 'I want to talk to someone about a cross-border issue.',
    tool: 'book_consultation',
    input: { type: 'discovery_specialist_497', topic: 'cross-border' },
    run: (i) => bookConsultation.run(i) },
  { prompt: 'My S-corp nets about $200,000 and it is mostly my own consulting work. How much salary should I pay myself?',
    tool: 'estimate_reasonable_comp',
    input: { business_net_profit_usd: 200000, profit_driver: 'primarily_owner_services' },
    run: (i) => estimateReasonableComp.run(i) },
  { prompt: 'Can I rent my house to my S-corp for board meetings? Say $1,200 a day, 12 days a year, 32% bracket.',
    tool: 'estimate_augusta_rule',
    input: { fair_daily_rental_rate_usd: 1200, days_rented: 12, marginal_tax_rate_pct: 32 },
    run: (i) => estimateAugustaRule.run(i) },
  { prompt: 'I pay for my home office and drive 8,000 business miles in my own car. How do I get reimbursed by my S-corp?',
    tool: 'estimate_accountable_plan',
    input: { home_office_expense_usd: 4800, business_miles: 8000, cell_internet_usd: 1400 },
    run: (i) => estimateAccountablePlan.run(i) },
];
`;

mkdirSync(join(root, '.wrangler'), { recursive: true });
const entryPath = join(root, '.wrangler', 'gen-entry.mts');
writeFileSync(entryPath, ENTRY);

await build({
  entryPoints: [entryPath],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: tmp,
  logLevel: 'error',
});

const mod = await import(pathToFileURL(tmp).href);
const out = mod.cases.map((c) => ({
  prompt: c.prompt,
  tool: c.tool,
  input: c.input,
  output: c.run(c.input).structured,
  summary: c.run(c.input).summary,
}));

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(out, null, 2));
console.log(`Wrote ${out.length} worked examples to ${outFile}`);
