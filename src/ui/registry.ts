/**
 * UI (widget) resources for the ChatGPT Apps SDK.
 *
 * These are distinct from the JSON data resources in ../resources.ts: they use
 * the `ui://` URI scheme and the `text/html+skybridge` mimeType that ChatGPT
 * looks for, and each is a self-contained HTML document (no external requests).
 * A tool opts into a widget by setting its `widget` field (see lib/types.ts);
 * the protocol layer then advertises the template via `_meta` on tools/list and
 * stamps it onto the tools/call result so ChatGPT knows which template renders
 * that tool's output.
 *
 * The `openai/widgetCSP` below declares ZERO external connect/resource domains -
 * the widgets phone nowhere, matching the firm's no-data-harvesting stance.
 */
import { FORMATION_STATES_WIDGET_HTML } from './formationStatesWidget';
import { IRS_NOTICE_WIDGET_HTML } from './noticeWidget';
import { TAX_DOCUMENT_WIDGET_HTML } from './documentWidget';
import { ACTION_PLAN_WIDGET_HTML } from './triageWidget';

export interface UiResourceDef {
  uri: string;
  name: string;
  title: string;
  description: string;
  html: string;
  /** Short human description ChatGPT may show; also a11y label. */
  widgetDescription: string;
}

export const FORMATION_STATES_WIDGET_URI = 'ui://widget/formation-states.html';
export const IRS_NOTICE_WIDGET_URI = 'ui://widget/irs-notice.html';
export const TAX_DOCUMENT_WIDGET_URI = 'ui://widget/tax-document.html';
export const ACTION_PLAN_WIDGET_URI = 'ui://widget/action-plan.html';

export const UI_RESOURCES: UiResourceDef[] = [
  {
    uri: ACTION_PLAN_WIDGET_URI,
    name: 'action_plan_widget',
    title: 'Your tax action plan',
    description: 'Action-plan card for triage_tax_problem: urgency level, this-week and this-month steps, what not to do, and one consultation button.',
    html: ACTION_PLAN_WIDGET_HTML,
    widgetDescription:
      'A card showing how urgent a tax problem is (act now, act this week, or plan this month), the actions to take this week and this month, what not to do, and a single button to talk to an Enrolled Agent.',
  },
  {
    uri: FORMATION_STATES_WIDGET_URI,
    name: 'formation_states_widget',
    title: 'US formation state comparison',
    description: 'Interactive comparison card for compare_formation_states (Wyoming, New Mexico, Delaware, California).',
    html: FORMATION_STATES_WIDGET_HTML,
    widgetDescription:
      'A side-by-side comparison of US LLC formation states showing first-year government fees, annual cost, franchise tax, income tax, and approval time, with the recommended state highlighted.',
  },
  {
    uri: IRS_NOTICE_WIDGET_URI,
    name: 'irs_notice_widget',
    title: 'Your IRS notice',
    description: 'Notice card for decode_irs_notice: what the letter means, the deadline with days remaining, options, and one upload button.',
    html: IRS_NOTICE_WIDGET_HTML,
    widgetDescription:
      'A card for an IRS notice showing the notice code, what it means in plain English, the response deadline with days remaining (color-coded by urgency), your options, and a single button to upload the notice for an Enrolled Agent review.',
  },
  {
    uri: TAX_DOCUMENT_WIDGET_URI,
    name: 'tax_document_widget',
    title: 'Your tax document',
    description: 'Document card for explain_tax_document: what the form is, the boxes that matter, where it goes on the return, and what to do if it is wrong or missing.',
    html: TAX_DOCUMENT_WIDGET_HTML,
    widgetDescription:
      'A card for a tax document (W-2, a 1099, a K-1, and similar) showing what the form is, who sends it and when, the boxes that matter, where it goes on your return, what to check before filing, what to do if it is wrong or missing, and a single button to ask an Enrolled Agent about it.',
  },
];

const BY_URI = new Map(UI_RESOURCES.map((r) => [r.uri, r]));

/** The resources/list entries for the UI widgets (metadata only). */
export function uiResourceList() {
  return UI_RESOURCES.map((r) => ({
    uri: r.uri,
    name: r.name,
    title: r.title,
    description: r.description,
    mimeType: 'text/html+skybridge' as const,
    _meta: { 'openai/widgetDescription': r.widgetDescription },
  }));
}

/** The resources/read payload for a UI widget URI, or null if unknown. */
export function readUiResource(uri: string) {
  const r = BY_URI.get(uri);
  if (!r) return null;
  return {
    contents: [
      {
        uri: r.uri,
        mimeType: 'text/html+skybridge' as const,
        text: r.html,
        _meta: {
          'openai/widgetDescription': r.widgetDescription,
          'openai/widgetPrefersBorder': true,
          'openai/widgetCSP': { connect_domains: [], resource_domains: [] },
        },
      },
    ],
  };
}
