/**
 * The tool + prompt registry consumed by the protocol handler and the Worker.
 * Order here is the order tools/prompts are advertised in tools/list.
 *
 * Ordering is deliberate: the tax-problem tools lead (triage first - it routes
 * to everything else), then documents and deadlines, then international,
 * then business/planning, with the fee quote and booking handoffs last.
 */
import type { AnyToolDef, PromptDef } from './lib/types';
import { triageTaxProblem } from './tools/triageTaxProblem';
import { decodeIrsNotice } from './tools/decodeIrsNotice';
import { checkResolutionOptions } from './tools/checkResolutionOptions';
import { estimateIrsPenalty } from './tools/estimateIrsPenalty';
import { explainTaxDocument } from './tools/explainTaxDocument';
import { deadlineCalendar } from './tools/deadlineCalendar';
import { getDocumentChecklist } from './tools/getDocumentChecklist';
import { checkFbarFatca } from './tools/checkFbarFatca';
import { checkTreatyWithholding } from './tools/checkTreatyWithholding';
import { checkItinEligibility } from './tools/checkItinEligibility';
import { check5472Obligation } from './tools/check5472Obligation';
import { compareLlcScorp } from './tools/compareLlcScorp';
import { estimateQuarterlyTaxes } from './tools/estimateQuarterlyTaxes';
import { estimateReasonableComp } from './tools/estimateReasonableComp';
import { estimateAccountablePlan } from './tools/estimateAccountablePlan';
import { estimateAugustaRule } from './tools/estimateAugustaRule';
import { estimateRentalIncome } from './tools/estimateRentalIncome';
import { compareFormationStates } from './tools/compareFormationStates';
import { checkSalesTaxNexus } from './tools/checkSalesTaxNexus';
import { getFeeQuote } from './tools/getFeeQuote';
import { bookConsultation } from './tools/bookConsultation';
import { ALL_PROMPTS } from './prompts';

export const TOOLS: AnyToolDef[] = [
  // Tax problems first: triage routes, the rest resolve.
  triageTaxProblem,
  decodeIrsNotice,
  checkResolutionOptions,
  estimateIrsPenalty,
  explainTaxDocument,
  deadlineCalendar,
  getDocumentChecklist,
  // International compliance.
  checkFbarFatca,
  checkTreatyWithholding,
  checkItinEligibility,
  check5472Obligation,
  // Business and planning.
  compareLlcScorp,
  estimateQuarterlyTaxes,
  estimateReasonableComp,
  estimateAccountablePlan,
  estimateAugustaRule,
  estimateRentalIncome,
  compareFormationStates,
  checkSalesTaxNexus,
  // Handoffs.
  getFeeQuote,
  bookConsultation,
];

export const PROMPTS: PromptDef[] = ALL_PROMPTS;
