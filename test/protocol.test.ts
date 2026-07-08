import { describe, it, expect } from 'vitest';
import { dispatch } from '../src/lib/mcp';
import { TOOLS, PROMPTS } from '../src/registry';

const reg = () => ({ tools: TOOLS, prompts: PROMPTS, version: '0.1.0' });

function req(method: string, params?: Record<string, unknown>, id: number | null = 1) {
  return { jsonrpc: '2.0' as const, id, method, ...(params ? { params } : {}) };
}

describe('MCP protocol (stateless dispatch)', () => {
  it('initialize negotiates a supported protocol version and advertises capabilities', () => {
    const res = dispatch(req('initialize', { protocolVersion: '2025-06-18' }), reg()) as any;
    expect(res.result.protocolVersion).toBe('2025-06-18');
    expect(res.result.capabilities.tools).toBeDefined();
    expect(res.result.capabilities.prompts).toBeDefined();
    expect(res.result.serverInfo.title).toBe('Arc & Ledger Tax Tools');
    expect(typeof res.result.instructions).toBe('string');
  });

  it('initialize falls back to the latest version for an unknown request', () => {
    const res = dispatch(req('initialize', { protocolVersion: '1999-01-01' }), reg()) as any;
    expect(typeof res.result.protocolVersion).toBe('string');
    expect(res.result.protocolVersion).not.toBe('1999-01-01');
  });

  it('ping returns an empty result', () => {
    const res = dispatch(req('ping'), reg()) as any;
    expect(res.result).toEqual({});
  });

  it('tools/list returns an array', () => {
    const res = dispatch(req('tools/list'), reg()) as any;
    expect(Array.isArray(res.result.tools)).toBe(true);
  });

  it('advertises explicit safety annotations and an output schema for every tool', () => {
    const res = dispatch(req('tools/list'), reg()) as any;
    for (const tool of res.result.tools) {
      expect(tool.annotations.readOnlyHint).toBe(true);
      expect(tool.annotations.openWorldHint).toBe(false);
      expect(tool.annotations.destructiveHint).toBe(false);
      expect(tool.outputSchema?.type).toBe('object');
      expect(tool.outputSchema?.required).toEqual(['disclaimer', 'source_url', 'next_step']);
    }
  });

  it('prompts/list returns an array', () => {
    const res = dispatch(req('prompts/list'), reg()) as any;
    expect(Array.isArray(res.result.prompts)).toBe(true);
  });

  it('notifications/initialized yields no response body', () => {
    const res = dispatch({ jsonrpc: '2.0', method: 'notifications/initialized' }, reg());
    expect(res).toBeNull();
  });

  it('an unknown method returns JSON-RPC -32601', () => {
    const res = dispatch(req('does/notExist'), reg()) as any;
    expect(res.error.code).toBe(-32601);
  });

  it('calling an unknown tool returns Invalid params', () => {
    const res = dispatch(req('tools/call', { name: 'nope', arguments: {} }), reg()) as any;
    expect(res.error.code).toBe(-32602);
  });

  it('an empty JSON-RPC batch returns Invalid Request (-32600)', () => {
    const res = dispatch([], reg()) as any;
    expect(res.error.code).toBe(-32600);
  });

  it('a non-object body returns Invalid Request (-32600)', () => {
    const res = dispatch('garbage', reg()) as any;
    expect(res.error.code).toBe(-32600);
  });
});
