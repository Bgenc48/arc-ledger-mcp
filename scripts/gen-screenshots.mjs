/**
 * Renders each worked-example tool RESPONSE as a branded card and screenshots it
 * with the pre-installed Chromium (Playwright). Output: assets/screenshots/*.png
 * at 1100px width (Anthropic carousel spec: 1000px+, crop to the response,
 * prompt kept separately). Also writes assets/screenshots/prompts.txt.
 *
 *   node scripts/gen-screenshots.mjs
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const examples = JSON.parse(readFileSync(join(root, 'docs', 'worked-examples.json'), 'utf8'));
const outDir = join(root, 'assets', 'screenshots');
mkdirSync(outDir, { recursive: true });

// One card per tool, showing the real summary + a couple of highlight rows +
// the next-step handoff + the disclaimer footer. Cropped to the response only.
const PICK = ['decode_irs_notice', 'check_fbar_fatca', 'compare_llc_scorp', 'estimate_quarterly_taxes', 'get_fee_quote', 'estimate_reasonable_comp', 'estimate_augusta_rule', 'estimate_accountable_plan'];
const chosen = PICK.map((t) => examples.find((e) => e.tool === t)).filter(Boolean);

function highlights(e) {
  const s = e.output;
  switch (e.tool) {
    case 'decode_irs_notice':
      return [['Deadline', s.deadline.computed_deadline ? `${s.deadline.computed_deadline} (${s.deadline.days_from_notice} days from notice date)` : s.deadline.description], ['Urgency', s.urgency]];
    case 'check_fbar_fatca':
      return [['FBAR', s.fbar.required ? 'Required' : 'Not triggered'], ['Form 8938', s.form_8938.status.replace(/_/g, ' ')]];
    case 'compare_llc_scorp':
      return [['Sole prop / SMLLC total', `$${s.sole_prop_or_smllc.annual_total_modeled.toLocaleString()}`], ['S-corp total', `$${s.s_corp.annual_total_modeled.toLocaleString()}`], ['Net difference', `$${Math.abs(s.net_annual_difference).toLocaleString()}`]];
    case 'estimate_quarterly_taxes':
      return [['Per quarter (federal)', `$${s.federal.per_quarter.toLocaleString()}`], ['Required annual', `$${s.federal.safe_harbor.required_annual_payment.toLocaleString()}`], ['California', s.california.installment_weighting.split(' (')[0]]];
    case 'get_fee_quote':
      return [['Estimated range', s.estimated_range], ['Engagement deposit', '$250 - $750, credited']];
    case 'estimate_reasonable_comp':
      return [['Suggested salary range', s.suggested_salary_range], ['Distribution at midpoint', `$${s.distribution_at_midpoint.toLocaleString()}`]];
    case 'estimate_augusta_rule':
      return [['Tax-free to you', `$${s.tax_free_to_you.toLocaleString()}`], ['Estimated tax saving', `$${s.estimated_tax_saving.toLocaleString()}`]];
    case 'estimate_accountable_plan':
      return [['Annual tax-free reimbursement', `$${s.total_annual_reimbursement.toLocaleString()}`], ['Estimated saving', `$${s.estimated_annual_tax_saving.toLocaleString()}`]];
    default:
      return [];
  }
}

const cards = chosen
  .map((e, i) => {
    const rows = highlights(e)
      .map(([k, v]) => `<div class="row"><span class="k">${k}</span><span class="v">${v}</span></div>`)
      .join('');
    return `
    <div class="card" id="card-${i}">
      <div class="badge">${e.tool}</div>
      <p class="summary">${e.output_summary || e.summary}</p>
      <div class="rows">${rows}</div>
      <a class="cta">${e.output.next_step.label} &rarr;</a>
      <p class="disc">${e.output.disclaimer}</p>
      <div class="src">source: ${e.output.source_url}</div>
    </div>`;
  })
  .join('');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  :root{--ink:#0b1b33;--paper:#f7f4ec;--blue:#014BAE;--brass:#7a5b1e;--stone:#5b5647;}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#e9e4d8;font-family:'IBM Plex Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px}
  .card{width:1040px;background:var(--paper);border:1px solid #d9d2c2;border-radius:14px;padding:40px 44px;margin:0 auto 32px;box-shadow:0 1px 0 #fff inset}
  .badge{font-family:'IBM Plex Mono',ui-monospace,Menlo,monospace;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--blue);border:1px solid var(--blue);display:inline-block;padding:4px 10px;border-radius:6px;margin-bottom:20px}
  .summary{font-size:21px;line-height:1.5;color:var(--ink);margin-bottom:22px}
  .rows{border-top:1px solid #ddd6c6;padding-top:16px;margin-bottom:22px}
  .row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #ece6d8}
  .k{font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--stone);text-transform:uppercase;letter-spacing:.04em}
  .v{font-size:17px;color:var(--ink);font-weight:600;text-align:right;max-width:60%}
  .cta{display:inline-block;background:var(--ink);color:#fff;font-size:15px;font-weight:600;padding:12px 20px;border-radius:8px;text-decoration:none}
  .disc{font-size:12px;color:#8a8474;margin-top:20px;line-height:1.5}
  .src{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#a59f8d;margin-top:8px}
</style></head><body>${cards}</body></html>`;

const htmlPath = join(outDir, '_render.html');
writeFileSync(htmlPath, html);

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: 1120, height: 900 }, deviceScaleFactor: 2 });
await page.goto('file://' + htmlPath);
for (let i = 0; i < chosen.length; i++) {
  const el = await page.$(`#card-${i}`);
  const name = chosen[i].tool;
  await el.screenshot({ path: join(outDir, `${String(i + 1).padStart(2, '0')}-${name}.png`) });
  console.log(`  screenshot: ${name}`);
}
await browser.close();

const prompts = chosen.map((e, i) => `${String(i + 1).padStart(2, '0')}-${e.tool}.png\n  Prompt: ${e.prompt}\n`).join('\n');
writeFileSync(join(outDir, 'prompts.txt'), `Paired prompts for each carousel screenshot (kept separate per Anthropic's spec).\n\n${prompts}`);
console.log('Wrote prompts.txt');
