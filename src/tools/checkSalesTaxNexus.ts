import { z } from 'zod';
import { dollars, count } from '../lib/schemas';
import { output } from '../lib/response';
import { SOURCE, GO } from '../lib/config';
import { usd } from '../pricing';
import {
  SALES_TAX_NEXUS_DEFAULT,
  SALES_TAX_NEXUS_OVERRIDES,
  NO_SALES_TAX_STATES,
  US_STATE_CODES,
} from '../rates';
import type { ToolDef } from '../lib/types';

const input = z.object({
  annual_sales_usd: dollars().describe('Your total sales into the state(s) in the current or prior calendar year.'),
  transaction_count: count(10_000_000).optional().describe('Approximate number of separate sales transactions into the state(s). Some states count transactions as well as dollars.'),
  states: z
    .array(z.string().max(20))
    .max(60)
    .optional()
    .describe('US states to check, as 2-letter codes (e.g. ["CA","TX","NY"]). If omitted, the tool explains the general rule.'),
});

const NEXT_STEP = {
  label: 'Unsure where you owe? An Enrolled Agent can run a full nexus study for your sales map - free 15-minute call',
  url: GO.book15min,
};

const US_STATE = /^[A-Za-z]{2}$/;

interface StateResult {
  state: string;
  has_sales_tax: boolean;
  threshold: string;
  economic_nexus_likely: boolean | null;
  explanation: string;
}

function evaluateState(codeRaw: string, sales: number, txns: number | undefined): StateResult | null {
  if (!US_STATE.test(codeRaw)) return null; // ignore non-code echoes (output-side safety)
  const code = codeRaw.toUpperCase();
  if (!US_STATE_CODES.has(code)) return null; // a valid-shape but nonexistent code is dropped, not answered

  if ((NO_SALES_TAX_STATES as readonly string[]).includes(code)) {
    // Alaska has no STATEWIDE tax but does have local economic nexus (~$100k via
    // the ARSSTC), so we don't return a flat "no" for it.
    if (code === 'AK') {
      return {
        state: code,
        has_sales_tax: false,
        threshold: 'No statewide tax; local jurisdictions ~$100,000',
        economic_nexus_likely: sales >= 100_000 ? null : false,
        explanation:
          'Alaska has no statewide sales tax, but many local jurisdictions do, with an economic-nexus threshold around $100,000 (ARSSTC). Check the specific Alaska localities you sell into.',
      };
    }
    return {
      state: code,
      has_sales_tax: false,
      threshold: 'No statewide sales tax',
      economic_nexus_likely: false,
      explanation: `${code} has no statewide sales tax, so there is no sales-tax economic-nexus exposure.`,
    };
  }

  const o = SALES_TAX_NEXUS_OVERRIDES[code];
  const salesThreshold = o?.salesUsd ?? SALES_TAX_NEXUS_DEFAULT.salesUsd;
  const txnThreshold = o ? o.transactions : SALES_TAX_NEXUS_DEFAULT.transactions;
  const both = o?.both ?? false;
  const isDefaultTxnTest = !o && txnThreshold != null; // a state using the default OR-200 test (many have repealed it)

  const meetsSales = sales >= salesThreshold;
  const meetsTxns = txnThreshold != null && txns != null ? txns >= txnThreshold : false;
  const txnKnown = txnThreshold == null || txns != null;

  let likely: boolean | null;
  if (both) {
    likely = txnKnown ? meetsSales && meetsTxns : meetsSales ? null : false;
  } else if (txnThreshold == null) {
    likely = meetsSales;
  } else if (meetsSales) {
    likely = true; // over the dollar threshold - nexus regardless of the transaction test
  } else if (meetsTxns) {
    // Met ONLY on transaction count. ~18-20 states have REPEALED the 200-transaction
    // test, so a transaction-only trigger is "possible - verify", not a definite yes.
    likely = null;
  } else {
    likely = txnKnown ? false : null;
  }

  const thresholdText =
    txnThreshold == null
      ? `${usd(salesThreshold)} in sales`
      : both
        ? `${usd(salesThreshold)} in sales AND ${txnThreshold} transactions`
        : `${usd(salesThreshold)} in sales OR ${txnThreshold} transactions`;

  const txnOnly = !meetsSales && meetsTxns;
  return {
    state: code,
    has_sales_tax: true,
    threshold: thresholdText,
    economic_nexus_likely: likely,
    explanation:
      likely === true
        ? `You likely have economic nexus in ${code}: your ${usd(salesThreshold)}+ in sales crosses the threshold. Register, collect, and remit there.`
        : likely === false
          ? `You are likely below ${code}'s threshold of ${thresholdText}, so no economic nexus yet - but keep watching as you grow.`
          : txnOnly && isDefaultTxnTest
            ? `You cross ${code}'s transaction count but not the ${usd(salesThreshold)} sales figure. Many states have REPEALED the 200-transaction test, so verify whether ${code} still applies it before registering.`
            : `Whether you have nexus in ${code} depends on your transaction count (threshold: ${thresholdText}). Provide transaction_count to resolve.`,
  };
}

function run(args: z.infer<typeof input>) {
  const sales = args.annual_sales_usd;
  const txns = args.transaction_count;

  const generalRule = `Most states use economic nexus: you must collect sales tax once you exceed ${usd(SALES_TAX_NEXUS_DEFAULT.salesUsd)} in sales OR ${SALES_TAX_NEXUS_DEFAULT.transactions} transactions in the current or prior year. Big states differ (California and Texas use ${usd(500_000)} with no transaction count; New York requires ${usd(500_000)} AND 100 transactions), and a growing number of states (Illinois and Utah among them) have repealed the transaction test entirely and use a dollar threshold only. Delaware, Montana, New Hampshire, Oregon, and Alaska have no statewide sales tax. Physical presence (inventory in an Amazon FBA warehouse, an office, or staff) also creates nexus regardless of sales.`;

  // Dedupe (case-insensitively) before evaluating so a caller can't pad the
  // response with repeated entries.
  const uniqueStates = [...new Set((args.states ?? []).map((c) => c.trim().toUpperCase()))];
  const requested = uniqueStates.map((c) => evaluateState(c, sales, txns)).filter((r): r is StateResult => r !== null);

  const fields: Record<string, unknown> = {
    annual_sales: sales,
    transaction_count: txns ?? null,
    general_rule: generalRule,
    fba_warning: 'If you sell on Amazon FBA, your inventory sitting in a state warehouse can create PHYSICAL nexus there even below the economic thresholds.',
    caveats: [
      'Thresholds and the transaction-count test change often and vary by state; verify each state before registering.',
      'This covers state-level economic nexus only, not local/home-rule jurisdictions (e.g. some in CO, LA, AL).',
    ],
  };
  if (requested.length > 0) fields.states = requested;

  const flagged = requested.filter((r) => r.economic_nexus_likely === true).map((r) => r.state);
  const summary =
    requested.length > 0
      ? flagged.length > 0
        ? `At ${usd(sales)} in sales you likely have economic nexus in: ${flagged.join(', ')}. Register, collect, and remit there. Amazon FBA inventory can add physical nexus elsewhere.`
        : `At ${usd(sales)} in sales you appear below the economic-nexus threshold in the states you asked about - but watch physical nexus (FBA inventory) and your growth.`
      : `Sales-tax nexus rule: cross ${usd(SALES_TAX_NEXUS_DEFAULT.salesUsd)} in sales or ${SALES_TAX_NEXUS_DEFAULT.transactions} transactions in a state and you generally must collect its sales tax. Tell me which states you sell into for a specific read.`;

  return output(summary, fields, SOURCE.ecommerce, NEXT_STEP);
}

export const checkSalesTaxNexus: ToolDef<typeof input> = {
  name: 'check_sales_tax_nexus',
  title: 'Check sales-tax nexus',
  description:
    'Use this when an online seller or e-commerce/Amazon business asks whether they must collect sales tax in a state (economic nexus). Given annual sales, transaction count, and states, flags where economic nexus is likely met and explains the physical-nexus (FBA inventory) trap.',
  input,
  annotations: { title: 'Check sales-tax nexus', readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  logEnums: (args) => ({
    has_transaction_count: args.transaction_count !== undefined,
    state_count: args.states?.length ?? 0,
  }),
  run,
};
