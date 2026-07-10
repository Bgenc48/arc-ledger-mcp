/**
 * Schema contract snapshot (diagnostic Phase 1).
 *
 * Every tool's advertised inputSchema is snapshotted here. Any change to a tool
 * input (a new enum value, a renamed field, a widened range) fails this test
 * until the snapshot is intentionally updated (`vitest -u`) - which is the cue
 * to bump SERVER_VERSION and add a CHANGELOG entry. This is what makes a silent
 * enum change (the kind that broke between review sessions) impossible to ship
 * unnoticed.
 */
import { describe, it, expect } from 'vitest';
import { dispatch } from '../src/lib/mcp';
import { TOOLS, PROMPTS } from '../src/registry';

describe('tool input-schema contract', () => {
  it('matches the committed snapshot (on a diff: bump SERVER_VERSION + CHANGELOG, then vitest -u)', () => {
    const res = dispatch({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, { tools: TOOLS, prompts: PROMPTS, version: '0.6.0' }) as any;
    const schemas = Object.fromEntries(
      res.result.tools.map((t: any) => [t.name, t.inputSchema]),
    );
    expect(schemas).toMatchSnapshot();
  });
});
