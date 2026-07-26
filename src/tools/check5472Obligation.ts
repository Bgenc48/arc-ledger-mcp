import { z } from 'zod';
import { output } from '../lib/response';
import { SOURCE, GO } from '../lib/config';
import { usd } from '../pricing';
import { INFO_RETURN_PENALTIES } from '../rates';
import type { ToolDef } from '../lib/types';

const input = z.object({
  entity_type: z
    .enum(['single_member_llc', 'multi_member_llc', 'us_corporation', 'not_sure'])
    .describe(
      'The US entity. single_member_llc = a US LLC with ONE owner (a disregarded entity); multi_member_llc = a US LLC with two or more owners (a partnership by default); us_corporation = a US C-corporation; not_sure = you do not know. Form 5472 is filed by foreign-owned disregarded entities and by corporations with 25%+ foreign owners, but NOT by a default partnership.',
    ),
  foreign_owned: z
    .boolean()
    .describe(
      'Whether 25% or more of the entity is owned, directly or indirectly, by a non-US person or foreign company. Form 5472 is triggered by 25% foreign ownership.',
    ),
  had_reportable_transaction: z
    .enum(['yes', 'no', 'not_sure'])
    .optional()
    .describe(
      'Whether there was a reportable transaction with the foreign owner during the year. Reportable transactions include forming or funding the company, capital contributions, distributions, loans in either direction, and sales or payments between you and the company. Defaults to not_sure.',
    ),
  formed_in_us: z
    .boolean()
    .optional()
    .describe(
      'Whether the entity was formed in the US (a Wyoming or Delaware LLC is US-formed). Relevant only to the separate BOI report, from which US-formed companies are now exempt.',
    ),
});

const NEXT_STEP = {
  label: 'Have an Enrolled Agent confirm your Form 5472 obligation and file it - free 15-minute call',
  url: GO.book15min,
};

const PENALTY = `${usd(INFO_RETURN_PENALTIES.form5472)} per Form 5472, per year`;

const DEADLINE_NOTE =
  'Form 5472 is filed with a pro-forma Form 1120 by April 15 for the prior calendar year (the date rolls to the next business day when it lands on a weekend or holiday). It is extendable to October 15 with Form 7004. There is no tax due on the pro-forma 1120 itself; it is an information return.';

function annualSet(formedInUs: boolean | undefined): string[] {
  const set = [
    'Form 5472 with a pro-forma Form 1120 (federal, annual).',
    'Registered agent service in the state of formation (annual).',
    'State annual report or franchise obligation (varies by state; for example California LLCs and corporations owe an annual minimum franchise tax).',
  ];
  if (formedInUs === false) {
    set.push('FinCEN Beneficial Ownership Information (BOI) report - foreign-formed entities registered to do US business generally still file; US-formed companies are exempt under the March 2025 interim final rule.');
  } else {
    set.push('BOI report is generally NOT required for a US-formed company (exempt under the March 2025 FinCEN interim final rule); a foreign-formed company registered in a US state may still file.');
  }
  set.push('FBAR (FinCEN Form 114) separately if the foreign owner or the company held foreign financial accounts over $10,000 at any point.');
  return set;
}

function run(args: z.infer<typeof input>) {
  const rt = args.had_reportable_transaction ?? 'not_sure';

  // 5472 is triggered by 25%+ foreign ownership. Without it, no 5472.
  if (!args.foreign_owned) {
    return output(
      'Based on what you entered, Form 5472 is generally not required. Form 5472 applies to a US entity that is 25% or more foreign-owned (a foreign-owned disregarded entity, or a corporation with a 25%+ foreign owner). A wholly US-owned LLC or corporation does not file it, though other returns still apply.',
      {
        form_5472_required: false,
        why: 'Form 5472 is triggered by 25% or more foreign ownership; you indicated the entity is not foreign-owned at that level.',
        still_applies:
          'You still have your normal federal and state filings for the entity (for example an 1120, 1120-S, 1065, or Schedule C, plus state reports). An Enrolled Agent can confirm the full set.',
        penalty_if_it_did_apply: `For context, when Form 5472 does apply, the penalty for not filing is ${PENALTY}.`,
      },
      SOURCE.complianceMembership,
      { label: 'Not sure which returns your entity owes? Free 15-minute call with an Enrolled Agent', url: GO.book15min },
    );
  }

  // Foreign-owned. Behavior depends on entity type.
  if (args.entity_type === 'multi_member_llc') {
    return output(
      'A US LLC with two or more owners is a partnership by default, and a partnership does not file Form 5472 the way a foreign-owned single-member LLC does. It files Form 1065 and issues K-1s, and foreign partners can trigger separate withholding and filing obligations. If your LLC elected to be taxed as a corporation, Form 5472 can apply - confirm the election.',
      {
        form_5472_required: false,
        why: 'A multi-member LLC is a partnership by default; Form 5472 is filed by foreign-owned DISREGARDED entities and by corporations with 25%+ foreign owners, not by a default partnership.',
        what_you_file_instead:
          'Form 1065 (partnership return) with K-1s. A partnership with foreign partners may also owe withholding under section 1446 and issue related forms.',
        edge_case:
          'If the multi-member LLC elected to be taxed as a C-corporation (Form 8832), then it files Form 1120 and Form 5472 applies for 25%+ foreign owners.',
        penalty_context: `Where Form 5472 does apply, the penalty for not filing is ${PENALTY}.`,
      },
      SOURCE.complianceMembership,
      NEXT_STEP,
    );
  }

  // single_member_llc, us_corporation, or not_sure - all foreign-owned.
  const isSmllc = args.entity_type === 'single_member_llc';
  const isCorp = args.entity_type === 'us_corporation';

  const basis = isSmllc
    ? 'A foreign-owned single-member US LLC is a disregarded entity that must file a pro-forma Form 1120 with Form 5472 for each year it has a reportable transaction with its foreign owner.'
    : isCorp
      ? 'A US corporation with a 25% or more foreign owner must file Form 5472 together with its Form 1120 for reportable transactions with that owner.'
      : 'For a 25%+ foreign-owned US entity, Form 5472 generally applies to a single-member LLC (a disregarded entity, filed with a pro-forma 1120) and to a corporation (filed with its 1120). A default multi-member LLC is a partnership and files Form 1065 instead.';

  // The reportable-transaction answer refines "required" vs "very likely".
  const required = rt === 'yes';
  const requiredLabel = required
    ? true
    : 'very likely - confirm the reportable transaction';

  const rtNote =
    rt === 'no'
      ? 'You indicated no reportable transaction, but forming and funding the company are themselves reportable transactions, so a company in its first year, or any year it received or moved money with its owner, almost always has one. Confirm with an Enrolled Agent before assuming no filing is due.'
      : rt === 'yes'
        ? 'You indicated a reportable transaction, so the filing is required for that year.'
        : 'Whether a specific year requires the filing turns on whether there was a reportable transaction that year - funding, distributions, loans, or sales between you and the company all count, as does forming it.';

  const summary = isSmllc
    ? `Yes. A foreign-owned single-member US LLC generally must file Form 5472 with a pro-forma Form 1120. The penalty for not filing is ${PENALTY}, so it is worth handling on time. ${rt === 'yes' ? 'You indicated a reportable transaction, so it is due.' : 'It applies for any year with a reportable transaction, and forming or funding the company counts.'}`
    : isCorp
      ? `Yes. A US corporation with a 25% or more foreign owner files Form 5472 with its Form 1120 for reportable transactions with that owner. The penalty for not filing is ${PENALTY}.`
      : `Form 5472 very likely applies. For a 25%+ foreign-owned single-member LLC or corporation it is required for years with a reportable transaction; the penalty for not filing is ${PENALTY}. Confirm your exact entity type with an Enrolled Agent.`;

  return output(
    summary,
    {
      form_5472_required: requiredLabel,
      basis,
      reportable_transaction_note: rtNote,
      penalty: PENALTY,
      deadline: DEADLINE_NOTE,
      annual_compliance_set: annualSet(args.formed_in_us),
      how_we_help:
        'Arc & Ledger is an Enrolled Agent practice. We prepare and file the Form 5472 and pro-forma 1120, track the deadline, and can bundle the recurring foreign-owned-entity filings into one annual compliance membership. Ask for a published fee quote for the standalone filing, or see the membership.',
    },
    SOURCE.complianceMembership,
    NEXT_STEP,
  );
}

export const check5472Obligation: ToolDef<typeof input> = {
  name: 'check_5472_obligation',
  title: 'Check Form 5472 obligation',
  description:
    'Use this when a non-US person who owns a US company (especially a single-member US LLC or a US corporation) asks whether they must file Form 5472, what the penalty is, or what a foreign-owned US entity owes each year. Returns whether Form 5472 with a pro-forma Form 1120 is required, the reportable-transaction rule, the deadline and extension, the annual compliance set, and the penalty for not filing. Distinguishes a single-member LLC (files 5472) from a multi-member LLC (a partnership that files Form 1065 instead).',
  input,
  annotations: { title: 'Check Form 5472 obligation', readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  logEnums: (args) => ({
    entity_type: args.entity_type,
    foreign_owned: args.foreign_owned,
    had_reportable_transaction: args.had_reportable_transaction ?? 'not_sure',
  }),
  run,
};
