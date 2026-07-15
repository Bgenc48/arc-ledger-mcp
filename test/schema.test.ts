/**
 * Schema + description contract snapshot (tool-definition pinning).
 *
 * Every tool's advertised inputSchema, title, description, and annotations are
 * snapshotted here. Any change to a tool's contract (a new enum value, a
 * renamed field, a widened range, a reworded description, a dropped
 * readOnlyHint) fails this test until the snapshot is intentionally updated
 * (`vitest -u`) - which is the cue to bump SERVER_VERSION and add a CHANGELOG
 * entry. This is what makes a silent schema or description change impossible
 * to ship unnoticed: the description is part of the security surface (it is
 * what calling models act on), so it is pinned exactly like the schema.
 */
import { describe, it, expect } from 'vitest';
import { dispatch } from '../src/lib/mcp';
import { TOOLS, PROMPTS } from '../src/registry';

describe('tool definition contract', () => {
  it('matches the committed snapshot (on a diff: bump SERVER_VERSION + CHANGELOG, then vitest -u)', () => {
    const res = dispatch({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, { tools: TOOLS, prompts: PROMPTS, version: '0.6.0' }) as any;
    const contracts = Object.fromEntries(
      res.result.tools.map((t: any) => [
        t.name,
        { title: t.title, description: t.description, annotations: t.annotations, inputSchema: t.inputSchema },
      ]),
    );
    expect(contracts).toMatchSnapshot();
  });
});
