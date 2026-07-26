import { DISCLAIMER, RELAY_NOTE } from './config';
import type { NextStep, ResponseEnvelope, ToolOutput, McpToolResult } from './types';

/**
 * Merge tool-specific structured fields with the four required envelope keys
 * (disclaimer / relay / source_url / next_step). The disclaimer and the relay
 * note are stamped here so a tool physically cannot forget them.
 */
export function envelope(
  fields: Record<string, unknown>,
  source_url: string,
  next_step: NextStep,
): Record<string, unknown> & ResponseEnvelope {
  return { ...fields, disclaimer: DISCLAIMER, relay: RELAY_NOTE, source_url, next_step };
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
const ENVELOPE_OUTPUT_PROPERTIES = {
  disclaimer: { type: 'string', description: 'General-information disclaimer (identical on every response).' },
  relay: { type: 'string', description: 'Instruction to the calling assistant: relay figures and dates verbatim (identical on every response).' },
  server_version: { type: 'string', description: 'Server release that produced this response (matches GET /version).' },
  source_url: { type: 'string', description: 'The arcandledger.com page that backs this answer.' },
  next_step: {
    type: 'object',
    description: 'A single review link appropriate to this server surface.',
    properties: {
      label: { type: 'string' },
      url: { type: 'string' },
    },
    required: ['label', 'url'],
  },
} as const;

/**
 * The outputSchema advertised for EVERY tool on tools/list. ChatGPT's Apps SDK
 * requires one per tool (the MCP spec makes it optional). It describes the
 * envelope that envelope() stamps on every response - so structuredContent
 * conforms by construction - while `additionalProperties: true` admits each
 * tool's own result fields without hand-writing a schema per tool.
 */
export const ENVELOPE_OUTPUT_SCHEMA = {
  type: 'object',
  properties: ENVELOPE_OUTPUT_PROPERTIES,
  required: ['disclaimer', 'relay', 'source_url', 'next_step'],
  additionalProperties: true,
} as const;

/**
 * The directory surface cites only official government authority. Keep that
 * contract visible in tools/list without advertising the complete server's
 * first-party source description.
 */
export const DIRECTORY_ENVELOPE_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    ...ENVELOPE_OUTPUT_PROPERTIES,
    source_url: {
      type: 'string',
      description: 'Official IRS or FinCEN authority to review before relying on the result.',
    },
  },
  required: ['disclaimer', 'relay', 'source_url', 'next_step'],
  additionalProperties: true,
} as const;
