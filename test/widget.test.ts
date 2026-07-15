import { describe, it, expect } from 'vitest';
import { dispatch } from '../src/lib/mcp';
import { TOOLS, PROMPTS } from '../src/registry';
import { UI_RESOURCES, FORMATION_STATES_WIDGET_URI, IRS_NOTICE_WIDGET_URI, TAX_DOCUMENT_WIDGET_URI } from '../src/ui/registry';

const reg = () => ({ tools: TOOLS, prompts: PROMPTS, version: '0.1.0' });
const call = (method: string, params?: Record<string, unknown>) =>
  dispatch({ jsonrpc: '2.0' as const, id: 1, method, ...(params ? { params } : {}) }, reg()) as any;

describe('Apps SDK widget', () => {
  it('advertises the widget resource in resources/list with the skybridge mimeType', () => {
    const res = call('resources/list');
    const widget = res.result.resources.find((r: any) => r.uri === FORMATION_STATES_WIDGET_URI);
    expect(widget).toBeDefined();
    expect(widget.mimeType).toBe('text/html+skybridge');
  });

  it('serves the widget HTML on resources/read with a locked-down CSP', () => {
    const res = call('resources/read', { uri: FORMATION_STATES_WIDGET_URI });
    const item = res.result.contents[0];
    expect(item.mimeType).toBe('text/html+skybridge');
    expect(item.text).toContain('<!doctype html>');
    expect(item.text).toContain('window.openai');
    // No external requests: the CSP declares zero connect/resource domains.
    const csp = item._meta['openai/widgetCSP'];
    expect(csp.connect_domains).toEqual([]);
    expect(csp.resource_domains).toEqual([]);
  });

  it('the widget HTML contains no external URLs (fully self-contained)', () => {
    for (const r of UI_RESOURCES) {
      // Allow only the doctype/lang and inline data; assert no src=/href= to a CDN
      // and no fetch/XHR to an external origin in the markup itself.
      expect(r.html).not.toMatch(/src\s*=\s*["']https?:\/\//i);
      expect(r.html).not.toMatch(/<link[^>]+href\s*=\s*["']https?:\/\//i);
      expect(r.html).not.toContain('fetch(');
      expect(r.html).not.toContain('XMLHttpRequest');
    }
  });

  it('tools/list marks compare_formation_states with its output template', () => {
    const res = call('tools/list');
    const tool = res.result.tools.find((t: any) => t.name === 'compare_formation_states');
    expect(tool._meta['openai/outputTemplate']).toBe(FORMATION_STATES_WIDGET_URI);
    expect(tool._meta['openai/toolInvocation/invoking']).toBeTruthy();
  });

  it('tools without a widget do not carry an outputTemplate', () => {
    const res = call('tools/list');
    const tool = res.result.tools.find((t: any) => t.name === 'get_fee_quote');
    expect(tool._meta?.['openai/outputTemplate']).toBeUndefined();
  });

  it('tools/call stamps the output template onto the widget tool result', () => {
    const res = call('tools/call', {
      name: 'compare_formation_states',
      arguments: { priority: 'most_privacy' },
    });
    expect(res.result._meta['openai/outputTemplate']).toBe(FORMATION_STATES_WIDGET_URI);
    // The structured content the widget will read is still present and complete.
    expect(Array.isArray(res.result.structuredContent.states)).toBe(true);
    expect(res.result.structuredContent.recommended_state).toBeTruthy();
  });

  it('advertises the IRS notice widget and binds it to decode_irs_notice', () => {
    const listed = call('resources/list').result.resources.find(
      (r: any) => r.uri === IRS_NOTICE_WIDGET_URI,
    );
    expect(listed).toBeDefined();
    expect(listed.mimeType).toBe('text/html+skybridge');

    const tool = call('tools/list').result.tools.find((t: any) => t.name === 'decode_irs_notice');
    expect(tool._meta['openai/outputTemplate']).toBe(IRS_NOTICE_WIDGET_URI);
    expect(tool._meta['openai/toolInvocation/invoking']).toBeTruthy();
  });

  it('tools/call stamps the notice template and the deadline the widget reads', () => {
    const res = call('tools/call', {
      name: 'decode_irs_notice',
      arguments: { notice_code: 'CP2000', received_date: '2026-06-01' },
    });
    expect(res.result._meta['openai/outputTemplate']).toBe(IRS_NOTICE_WIDGET_URI);
    const sc = res.result.structuredContent;
    expect(sc.recognized).toBe(true);
    // The widget headlines the computed deadline + days remaining.
    expect(typeof (sc.deadline as any).days_remaining).toBe('number');
    expect((sc.deadline as any).computed_deadline).toBeTruthy();
  });

  it('advertises the tax-document widget and binds it to explain_tax_document', () => {
    const listed = call('resources/list').result.resources.find(
      (r: any) => r.uri === TAX_DOCUMENT_WIDGET_URI,
    );
    expect(listed).toBeDefined();
    expect(listed.mimeType).toBe('text/html+skybridge');

    const tool = call('tools/list').result.tools.find((t: any) => t.name === 'explain_tax_document');
    expect(tool._meta['openai/outputTemplate']).toBe(TAX_DOCUMENT_WIDGET_URI);
    expect(tool._meta['openai/toolInvocation/invoking']).toBeTruthy();
  });

  it('tools/call stamps the document template and the fields the widget reads', () => {
    const res = call('tools/call', {
      name: 'explain_tax_document',
      arguments: { document: '1099-K' },
    });
    expect(res.result._meta['openai/outputTemplate']).toBe(TAX_DOCUMENT_WIDGET_URI);
    const sc = res.result.structuredContent;
    expect(sc.recognized).toBe(true);
    // The widget reads the document code, what it is, and the key boxes.
    expect(sc.document).toBe('Form 1099-K');
    expect(sc.what_it_is).toBeTruthy();
    expect(Array.isArray(sc.key_boxes)).toBe(true);
  });
});
