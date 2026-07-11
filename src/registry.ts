/**
 * The tool + prompt registry consumed by the protocol handler and the Worker.
 * Order here is the order tools/prompts are advertised in tools/list.
 */
import type { AnyToolDef, PromptDef } from './lib/types';
import { decodeIrsNotice } from './tools/decodeIrsNotice';
import { checkFbarFatca } from './tools/checkFbarFatca';
import { compareLlcScorp } from './tools/compareLlcScorp';
import { estimateQuarterlyTaxes } from './tools/estimateQuarterlyTaxes';
import { estimateRentalIncome } from './tools/estimateRentalIncome';
import { deadlineCalendar } from './tools/deadlineCalendar';
import { checkItinEligibility } from './tools/checkItinEligibility';
import { estimateIrsPenalty } from './tools/estimateIrsPenalty';
import { compareFormationStates } from './tools/compareFormationStates';
import { checkSalesTaxNexus } from './tools/checkSalesTaxNexus';
import { estimateReasonableComp } from './tools/estimateReasonableComp';
import { estimateAugustaRule } from './tools/estimateAugustaRule';
import { estimateAccountablePlan } from './tools/estimateAccountablePlan';
import { getFeeQuote } from './tools/getFeeQuote';
import { bookConsultation } from './tools/bookConsultation';
import { checkResolutionOptions } from './tools/checkResolutionOptions';
import { ALL_PROMPTS } from './prompts';

export const TOOLS: AnyToolDef[] = [
  decodeIrsNotice,
  checkFbarFatca,
  compareLlcScorp,
  estimateQuarterlyTaxes,
  estimateRentalIncome,
  deadlineCalendar,
  checkItinEligibility,
  estimateIrsPenalty,
  checkResolutionOptions,
  compareFormationStates,
  checkSalesTaxNexus,
  estimateReasonableComp,
  estimateAugustaRule,
  estimateAccountablePlan,
  getFeeQuote,
  bookConsultation,
];

export const PROMPTS: PromptDef[] = ALL_PROMPTS;
