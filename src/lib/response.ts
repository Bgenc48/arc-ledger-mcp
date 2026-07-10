import { DISCLAIMER } from './config';
import type { NextStep, ResponseEnvelope, ToolOutput, McpToolResult } from './types';

/**
 * Merge tool-specific structured fields with the three required envelope keys
 * (disclaimer / source_url / next_step). The disclaimer is stamped here so a
 * tool physically cannot forget it.
 */
export function envelope(
  fields: Record<string, unknown>,
  source_url: string,
  next_step: NextStep,
): Record<string, unknown> & ResponseEnvelope {
  return { ...fields, disclaimer: DISCLAIMER, source_url, next_step };
}

/** Build a ToolOutput (summary + structured) in one call. */
export function output(
  summary: string,
  fields: Record<string, unknown>,
  source_url: string,
  next_step: NextStep,
): ToolOutput {
  return { summary, structured: envelope(fields, source_url, next_step) };
}

/**
 * Serialize a ToolOutput into an MCP tools/call result. The disclaimer is
 * appended to the visible text too, so it survives clients that only render
 * `content` and ignore `structuredContent`. When a server version is supplied
 * it is stamped into the structured content so every tool response is
 * attributable to a specific release (there is no way to tell which output a
 * user saw otherwise).
 */
export function toToolResult(out: ToolOutput, serverVersion?: string): McpToolResult {
  const text = `${out.summary}\n\n${DISCLAIMER}`;
  const structuredContent = serverVersion
    ? { ...out.structured, server_version: serverVersion }
    : out.structured;
  return {
    content: [{ type: 'text', text }],
    structuredContent,
  };
}

/** JSON Schema fragment shared by every tool's outputSchema. */
export const ENVELOPE_OUTPUT_PROPERTIES = {
  disclaimer: { type: 'string', description: 'General-information disclaimer (identical on every response).' },
  server_version: { type: 'string', description: 'Server release that produced this response (matches GET /version).' },
  source_url: { type: 'string', description: 'The arcandledger.com page that backs this answer.' },
  next_step: {
    type: 'object',
    description: 'A single human handoff to the firm.',
    properties: {
      label: { type: 'string' },
      url: { type: 'string' },
    },
    required: ['label', 'url'],
  },
} as const;
