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

export const UI_RESOURCES: UiResourceDef[] = [
  {
    uri: FORMATION_STATES_WIDGET_URI,
    name: 'formation_states_widget',
    title: 'US formation state comparison',
    description: 'Interactive comparison card for compare_formation_states (Wyoming, New Mexico, Delaware, California).',
    html: FORMATION_STATES_WIDGET_HTML,
    widgetDescription:
      'A side-by-side comparison of US LLC formation states showing first-year government fees, annual cost, franchise tax, income tax, and approval time, with the recommended state highlighted.',
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
