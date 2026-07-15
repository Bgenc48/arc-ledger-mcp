/**
 * Kill-switch behavior: a tool named in the registry's `disabled` set leaves
 * tools/list, and tools/call for it returns the fixed "temporarily offline"
 * result (never "Unknown tool") with the full response envelope intact.
 */
import { describe, it, expect } from 'vitest';
import { dispatch } from '../src/lib/mcp';
import { TOOLS, PROMPTS } from '../src/registry';

const DISABLED = 'estimate_irs_penalty';
const reg = () => ({
  tools: TOOLS.filter((t) => t.name !== DISABLED),
  prompts: PROMPTS,
  version: '0.9.0',
  disabled: new Set([DISABLED]),
});

describe('per-tool kill switch', () => {
  it('a disabled tool is absent from tools/list', () => {
    const res = dispatch({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, reg()) as any;
    expect(res.result.tools.map((t: any) => t.name)).not.toContain(DISABLED);
  });

  it('tools/call on a disabled tool returns the fixed offline result with the full envelope', () => {
    const res = dispatch(
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: DISABLED, arguments: { balance_owed_usd: 1000, months_late: 2 } },
      },
      reg(),
    ) as any;
    expect(res.error).toBeUndefined();
    const s = res.result.structuredContent;
    expect(s.tool_status).toBe('temporarily_disabled');
    expect(s.disclaimer).toBeTruthy();
    expect(s.relay).toBeTruthy();
    expect(s.next_step.url).toContain('arcandledger.com');
    expect(s.server_version).toBe('0.9.0');
  });

  it('a truly unknown tool still fails with Unknown tool', () => {
    const res = dispatch(
      { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'no_such_tool', arguments: {} } },
      reg(),
    ) as any;
    expect(res.error?.message).toContain('Unknown tool');
  });
});
