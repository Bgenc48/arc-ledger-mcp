import { describe, it, expect } from 'vitest';
import { dispatch } from '../src/lib/mcp';
import { TOOLS, PROMPTS } from '../src/registry';
import { RESOURCES } from '../src/resources';
import { SITE } from '../src/lib/config';

const reg = () => ({ tools: TOOLS, prompts: PROMPTS, version: '0.1.0' });
const call = (method: string, params?: Record<string, unknown>) =>
  dispatch({ jsonrpc: '2.0' as const, id: 1, method, ...(params ? { params } : {}) }, reg()) as any;

describe('MCP resources', () => {
  it('lists every JSON data resource with a uri, title, and json mimeType', () => {
    const res = call('resources/list');
    const dataResources = res.result.resources.filter((r: any) => r.mimeType === 'application/json');
    expect(dataResources.length).toBe(RESOURCES.length);
    for (const r of dataResources) {
      expect(r.uri).toMatch(/^arcledger:\/\//);
      expect(r.title).toBeTruthy();
      expect(r.mimeType).toBe('application/json');
    }
  });

  it('reads each resource as valid JSON', () => {
    for (const r of RESOURCES) {
      const res = call('resources/read', { uri: r.uri });
      const text = res.result.contents[0].text as string;
      expect(() => JSON.parse(text)).not.toThrow();
    }
  });

  it('the fee catalog and service directory only emit first-party URLs', () => {
    for (const uri of ['arcledger://fee-catalog', 'arcledger://services']) {
      const res = call('resources/read', { uri });
      const text = res.result.contents[0].text as string;
      const urls = [...text.matchAll(/"(https?:\/\/[^"]+)"/g)].map((m) => m[1] ?? '');
      expect(urls.length).toBeGreaterThan(0);
      for (const u of urls) expect(u.startsWith(SITE)).toBe(true);
    }
  });

  it('returns an InvalidParams error for an unknown resource URI', () => {
    const res = call('resources/read', { uri: 'arcledger://nope' });
    expect(res.error).toBeDefined();
  });

  it('the office resource names the Enrolled Agent and Treasury credential', () => {
    const res = call('resources/read', { uri: 'arcledger://office' });
    const office = JSON.parse(res.result.contents[0].text);
    expect(office.credential).toContain('Enrolled Agent');
    expect(office.credentialNote).toContain('Treasury');
  });
});
