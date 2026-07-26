import { z } from 'zod';
import { output } from '../lib/response';
import { SOURCE, GO } from '../lib/config';
import { usd } from '../pricing';
import { FORMATION_STATES } from '../rates';
import { round0 } from '../lib/tax';
import { FORMATION_STATES_WIDGET_URI } from '../ui/registry';
import type { ToolDef } from '../lib/types';

const input = z.object({
  operates_in_california: z
    .boolean()
    .optional()
    .describe('Whether you (or the business) physically operate in, or are a resident of, California. If true, California registration is generally required regardless of where you form.'),
  raising_venture_capital: z
    .boolean()
    .optional()
    .describe('Whether you plan to raise venture capital or convert to a C-corp. If true, Delaware is usually preferred by investors.'),
  priority: z
    .enum(['lowest_cost', 'most_privacy', 'investor_ready'])
    .optional()
    .describe('What matters most: lowest_cost, most_privacy, or investor_ready. Defaults to lowest_cost.'),
});

const NEXT_STEP = {
  label: 'Form your US LLC with an Enrolled Agent firm - Form 5472 compliance handled from day one. Free 15-minute call',
  url: GO.book15min,
};

type StateKey = keyof typeof FORMATION_STATES;

function firstYearGovtCost(k: StateKey): number {
  const s = FORMATION_STATES[k];
  return s.filingFee + s.annualReport + s.franchiseTax;
}

function run(args: z.infer<typeof input>) {
  const priority = args.priority ?? 'lowest_cost';

  // Recommendation logic (a real founder decision, framed as guidance not advice).
  let recommended: StateKey;
  if (args.operates_in_california) {
    recommended = 'california';
  } else if (args.raising_venture_capital || priority === 'investor_ready') {
    recommended = 'delaware';
  } else if (priority === 'most_privacy') {
    recommended = 'newMexico';
  } else {
    recommended = 'wyoming';
  }

  const states = (Object.keys(FORMATION_STATES) as StateKey[]).map((k) => {
    const s = FORMATION_STATES[k];
    return {
      state: s.label,
      first_year_government_fees: usd(round0(firstYearGovtCost(k))),
      annual_ongoing_fees: usd(round0(s.annualReport + s.franchiseTax)),
      franchise_tax: s.franchiseTax === 0 ? 'None' : `${usd(s.franchiseTax)}/yr`,
      state_income_tax: s.stateIncomeTax,
      typical_approval: s.approvalDays,
      strengths: s.strengths,
      best_for: s.bestFor,
      recommended: k === recommended,
    };
  });

  const rec = FORMATION_STATES[recommended];

  // The RECOMMENDATION rationale (why this state, given the inputs). Kept
  // distinct from each state's `bestFor` PROFILE blurb: the profile describes
  // when a state suits someone in general and must never be pasted into the
  // recommendation slot (it reads as a self-contradiction, e.g. recommending
  // California with California's "only when you operate here" profile).
  const why = args.operates_in_california
    ? 'California is the most expensive of these states, but it is still the right choice for you specifically: because you operate in or reside in California, California registration is generally required no matter where you form. Forming in a cheaper state would NOT save money here - it would only add a second (foreign-qualification) filing on top of the California one.'
    : args.raising_venture_capital || priority === 'investor_ready'
      ? 'You plan to raise venture capital, so Delaware is the investor-standard choice despite its higher annual cost.'
      : priority === 'most_privacy'
        ? 'You prioritized privacy, so New Mexico wins: no annual report and no public member/manager disclosure.'
        : 'For a simple online business with no California footprint, Wyoming is the low-cost, private default.';

  // Institutional VC almost always requires a Delaware C-corp, not an LLC.
  // That entity decision precedes the state-of-formation question, so surface it
  // whenever the caller says they are raising venture capital.
  const ventureCapitalNote = args.raising_venture_capital
    ? 'Institutional venture investors almost always require a Delaware C-corporation, not an LLC. That entity choice comes BEFORE the state-of-formation question; talk to an Enrolled Agent about entity selection before you file, so you do not have to unwind an LLC later.'
    : undefined;

  const fields = {
    recommended_state: rec.label,
    why,
    ...(ventureCapitalNote ? { venture_capital_note: ventureCapitalNote } : {}),
    states,
    note: 'Government fees only; our formation service fee is separate. A foreign-owned US LLC also files Form 5472 every year regardless of state (a $25,000/year penalty if missed). State fees change - verify before filing.',
    disclaimer_context: 'General guidance to compare states, not legal or tax advice for your specific situation.',
  };

  const summary =
    `For your situation the ${rec.label} route looks best: ${why} ` +
    `First-year government fees are about ${usd(round0(firstYearGovtCost(recommended)))}.` +
    (ventureCapitalNote ? ` ${ventureCapitalNote}` : '') +
    ` Remember a foreign-owned US LLC files Form 5472 every year in any state.`;

  return output(summary, fields, SOURCE.formation, NEXT_STEP);
}

export const compareFormationStates: ToolDef<typeof input> = {
  name: 'compare_formation_states',
  title: 'Compare US formation states',
  description:
    'Use this when someone (often a non-US founder) asks which US state to form their LLC or company in - Wyoming, New Mexico, Delaware, or California. Compares government fees, annual cost, franchise tax, privacy, and approval time, and recommends a state based on their situation.',
  input,
  annotations: { title: 'Compare US formation states', readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  widget: {
    templateUri: FORMATION_STATES_WIDGET_URI,
    invoking: 'Comparing US formation states',
    invoked: 'US formation state comparison',
  },
  logEnums: (args) => ({
    priority: args.priority ?? 'lowest_cost',
    operates_in_california: args.operates_in_california ?? false,
    raising_vc: args.raising_venture_capital ?? false,
  }),
  run,
};
