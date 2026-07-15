import { z } from 'zod';
import { dollars } from '../lib/schemas';
import { output } from '../lib/response';
import { SOURCE } from '../lib/config';
import { sanitizeStateEcho } from '../lib/sanitize';
import { taxReturns, addOns, modifiers, usd } from '../pricing';
import {
  CA_FRANCHISE_TAX_MINIMUM,
  CA_SCORP_TAX_RATE,
  SCORP_ILLUSTRATIVE_SALARY_SHARE,
  SCORP_BREAKEVEN_ESTIMATE,
  SE_TAX_MULTIPLIER,
} from '../rates';
import { selfEmploymentTax, ficaOnWages, additionalMedicareTax, round0 } from '../lib/tax';
import type { ToolDef } from '../lib/types';

const input = z.object({
  expected_net_profit_usd: dollars().describe('Expected annual net profit (revenue minus business expenses), before any owner salary.'),
  state: z.string().max(40).optional().describe('US state, 2-letter or name. Defaults to CA. Only California franchise taxes are modeled (the SMLLC gross-receipts fee is excluded; see caveats).'),
  owner_salary_estimate_usd: dollars().optional().describe('A reasonable W-2 salary you would pay yourself as an S-corp owner. If omitted, the midpoint of the reasonable-compensation starting range for an owner-services business (about half of profit) illustrates the mechanic. That default is an illustration only - there is no IRS safe harbor at any percentage; use estimate_reasonable_comp for a starting range.'),
  currently_has_llc: z.boolean().optional().describe('Whether the business already operates as an LLC today. Defaults to true. A plain sole proprietorship (no LLC) does not owe the California $800 franchise tax.'),
});

const NEXT_STEP = {
  label: 'Considering the election? An Enrolled Agent can confirm the numbers for your situation - S-corp election guide',
  url: SOURCE.sCorpElection,
};

function isCalifornia(state?: string): boolean {
  if (!state) return true; // default CA
  const s = state.trim().toLowerCase();
  return s === 'ca' || s === 'california';
}

function run(args: z.infer<typeof input>) {
  const profit = args.expected_net_profit_usd;
  const ca = isCalifornia(args.state);
  const hasLlc = args.currently_has_llc ?? true;
  const salary =
    args.owner_salary_estimate_usd !== undefined
      ? Math.min(args.owner_salary_estimate_usd, profit)
      : round0(profit * SCORP_ILLUSTRATIVE_SALARY_SHARE);

  // ── Employment tax ──
  const seEarnings = profit * SE_TAX_MULTIPLIER;
  const seTax = selfEmploymentTax(profit).total + additionalMedicareTax(seEarnings); // SE tax + 0.9% surtax on all profit
  const scorpFica = ficaOnWages(salary).total + additionalMedicareTax(salary); // FICA + 0.9% surtax on salary only
  const employmentTaxSavings = seTax - scorpFica; // distributions escape SE/FICA and the 0.9% surtax

  // ── California franchise taxes ──
  // LLC: the $800 minimum (R&TC 17941) - but a plain sole proprietorship with
  // no LLC owes no franchise tax at all. The CA LLC gross-receipts fee is keyed
  // on TOTAL California income (not net profit), which this tool does not
  // collect, so it is excluded here and flagged in the caveats rather than
  // estimated off the wrong base.
  const caSmllcFranchise = ca && hasLlc ? CA_FRANCHISE_TAX_MINIMUM : 0;
  // S-corp: 1.5% franchise tax on net income AFTER owner wages (a deductible
  // corporate expense under R&TC 23802), floored at the $800 minimum.
  const caScorpFranchise = ca
    ? Math.max(CA_FRANCHISE_TAX_MINIMUM, round0(Math.max(0, profit - salary) * CA_SCORP_TAX_RATE))
    : 0;

  // ── Compliance cost (our published fees) ──
  // Both sides carry the owner's personal filing so the comparison is
  // apples-to-apples: Schedule C/SMLLC is one combined 1040 product; the S-corp
  // owner still files a 1040 plus the K-1 entry on top of the 1120-S + payroll.
  const solePropCompliance = taxReturns.scheduleC_smllc;
  const payrollAnnual = addOns.payroll_perQuarter * 4;
  const ownerPersonalReturn = taxReturns.form1040 + modifiers.k1Received;
  const scorpCompliance = taxReturns.sCorp1120S_or_1065 + payrollAnnual + ownerPersonalReturn;
  const reasonableCompStudy = addOns.reasonableCompStudy; // one-time, optional

  // ── Totals (recurring, employment tax + state + compliance) ──
  const solePropTotal = round0(seTax + caSmllcFranchise + solePropCompliance);
  const scorpTotal = round0(scorpFica + caScorpFranchise + scorpCompliance);
  const netAnnualDifference = round0(solePropTotal - scorpTotal); // positive => S-corp cheaper

  const fields = {
    inputs: {
      net_profit: profit,
      assumed_owner_salary: salary,
      salary_basis:
        args.owner_salary_estimate_usd !== undefined
          ? 'your estimate'
          : 'midpoint of the reasonable-comp starting range for an owner-services business (illustration only, not an IRS safe harbor)',
      state: sanitizeStateEcho(args.state, ca),
      currently_has_llc: hasLlc,
    },
    sole_prop_or_smllc: {
      self_employment_tax: round0(seTax),
      ca_franchise_and_llc_fee: caSmllcFranchise,
      our_compliance_fee: solePropCompliance,
      annual_total_modeled: solePropTotal,
      note: hasLlc
        ? 'Schedule C on your Form 1040. All net profit is subject to self-employment tax (including the 0.9% Additional Medicare Tax above $200,000, single-filer threshold).'
        : 'Schedule C on your Form 1040, no LLC: no CA franchise tax today. All net profit is subject to self-employment tax. Forming an LLC or S-corp adds the $800 CA minimum.',
    },
    s_corp: {
      fica_on_salary: round0(scorpFica),
      ca_franchise_tax: caScorpFranchise,
      our_compliance_fee: scorpCompliance,
      compliance_breakdown: `${usd(taxReturns.sCorp1120S_or_1065)} 1120-S return + ${usd(payrollAnnual)}/yr payroll + ${usd(ownerPersonalReturn)} owner 1040 with K-1`,
      one_time_reasonable_comp_study: reasonableCompStudy,
      annual_total_modeled: scorpTotal,
      note: 'Distributions above a reasonable salary avoid self-employment/FICA tax and the 0.9% Additional Medicare Tax; the salary must be reasonable compensation.',
    },
    employment_tax_savings_before_costs: round0(employmentTaxSavings),
    net_annual_difference: netAnnualDifference,
    who_comes_out_ahead:
      netAnnualDifference > 0
        ? 'S-corp is modeled cheaper at this profit and salary'
        : netAnnualDifference < 0
          ? 'Staying a sole prop / SMLLC is modeled cheaper at this profit and salary'
          : 'Roughly break-even at this profit and salary',
    break_even_zone: `As a rule of thumb the S-corp election tends to pay off once net profit is durably above about ${usd(SCORP_BREAKEVEN_ESTIMATE)}, because the payroll cost, the ${ca ? 'CA 1.5% S-corp franchise tax, ' : ''}and the reasonable-comp administration have to be earned back by the self-employment-tax savings. The exact crossover moves with your salary and state.`,
    important_caveats: [
      'The salary must be REASONABLE COMPENSATION for your role - a facts-and-circumstances test with NO safe-harbor percentage (at 50% or anywhere else). Setting it too low to dodge tax is a top IRS audit trigger, and courts reclassify distributions as wages (David E. Watson, P.C. v. United States). Use estimate_reasonable_comp for a starting range.',
      'This compares employment taxes plus our compliance fees. It holds federal income tax roughly constant and does not model your full 1040, the QBI (199A) interaction, or state income tax.',
      'The 0.9% Additional Medicare Tax uses the single-filer $200,000 threshold; married thresholds differ ($250,000 joint / $125,000 separate).',
      'Employer payroll taxes beyond FICA are NOT modeled and work against the S-corp: on a typical CA owner salary, unemployment insurance (UI/ETT), FUTA, and the employee-paid CA SDI add very roughly $1,000 to $1,500 per year.',
      ca ? 'California S-corp franchise tax is the greater of $800 or 1.5% of net income after your wages, on top of payroll.' : 'State franchise and annual fees vary; only California franchise taxes are modeled here.',
      ca && hasLlc ? 'The SMLLC total shows only the $800 minimum. California also charges an LLC gross-receipts fee ($900 to $11,790) once TOTAL California income exceeds $250,000; it is not included here because it depends on gross receipts, not net profit.' : '',
    ].filter(Boolean),
  };

  const summary =
    `At ${usd(profit)} net profit with a ${usd(salary)} salary: sole prop/SMLLC modeled total ${usd(solePropTotal)} vs S-corp ${usd(scorpTotal)} ` +
    `(employment-tax savings ${usd(round0(employmentTaxSavings))} before costs, net difference ${usd(Math.abs(netAnnualDifference))} ${netAnnualDifference >= 0 ? 'in favor of the S-corp' : 'in favor of staying a sole prop'}). ` +
    `Reasonable compensation is required and this excludes full income-tax and QBI effects.`;

  return output(summary, fields, SOURCE.llcScorp, NEXT_STEP);
}

export const compareLlcScorp: ToolDef<typeof input> = {
  name: 'compare_llc_scorp',
  title: 'Compare LLC vs S-Corp',
  description:
    'Use this when a self-employed user or single-member LLC owner asks whether an S-Corp election would save them money. Shows a side-by-side of self-employment tax vs salary-plus-distribution, payroll and compliance costs, California franchise taxes, and the break-even zone.',
  input,
  annotations: { title: 'Compare LLC vs S-Corp', readOnlyHint: true, openWorldHint: false },
  logEnums: (args) => ({
    state: isCalifornia(args.state) ? 'CA' : 'other',
    has_salary_estimate: args.owner_salary_estimate_usd !== undefined,
    has_llc: args.currently_has_llc ?? true,
  }),
  run,
};
