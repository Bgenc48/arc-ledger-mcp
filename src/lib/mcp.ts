/**
 * Stateless MCP protocol handler (Streamable HTTP, single JSON response per POST).
 *
 * We drive the protocol directly rather than through a session/Durable-Object
 * transport, using the official SDK for the canonical protocol-version list and
 * error codes. No connection state is retained between requests: each POST is
 * initialized-and-answered independently, which is exactly what a read-only,
 * no-auth server wants.
 */
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import {
  SERVER_NAME,
  SERVER_SLUG,
  LATEST_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
  DOCS_URL,
  DISCLAIMER,
  RELAY_NOTE,
  GO,
} from './config';
import { logToolCall } from './logging';
import { toToolResult, ENVELOPE_OUTPUT_SCHEMA } from './response';
import { sanitizeText } from './sanitize';
import { resourceList, readResource } from '../resources';
import { uiResourceList, readUiResource } from '../ui/registry';
import type { AnyToolDef, PromptDef } from './types';

/**
 * One HTTP POST buys one rate-limit token, so the JSON-RPC batch inside it must
 * be small - otherwise a single request amplifies into unbounded work.
 */
export const MAX_BATCH = 20;
/** Longest value accepted for a prompts/get argument (they interpolate into text). */
const MAX_PROMPT_ARG_LEN = 300;

export interface Registry {
  tools: AnyToolDef[];
  prompts: PromptDef[];
  version: string;
  /**
   * Tool names currently switched off via the DISABLED_TOOLS kill switch. They
   * are excluded from `tools`; tools/call for one of these names returns a
   * fixed "temporarily offline" result instead of "Unknown tool".
   */
  disabled?: ReadonlySet<string>;
}

/** Fixed response for a kill-switched tool (never interpolates the tool name). */
const TOOL_DISABLED_TEXT =
  'This tool is temporarily offline while a rate or rule it depends on is re-verified. Every other tool remains available, or an Enrolled Agent can answer directly.';

function disabledToolResult(version: string) {
  return {
    content: [{ type: 'text' as const, text: `${TOOL_DISABLED_TEXT}\n\n${DISCLAIMER}` }],
    structuredContent: {
      tool_status: 'temporarily_disabled',
      detail: TOOL_DISABLED_TEXT,
      disclaimer: DISCLAIMER,
      relay: RELAY_NOTE,
      source_url: DOCS_URL,
      next_step: { label: 'Ask an Enrolled Agent directly - free 15-minute call', url: GO.book15min },
      server_version: version,
    },
  };
}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

const INSTRUCTIONS =
  `${SERVER_NAME} is Arc & Ledger's front door for tax problems, plus its free tax tools. ` +
  `When someone has an IRS or state tax problem and does not know where to start, call ` +
  `triage_tax_problem first: it returns an urgency level, a this-week action plan, what ` +
  `not to do, and which tool to run next. From there: decode an IRS notice, screen ` +
  `IRS back-tax resolution paths, estimate penalties and interest, explain a tax document, ` +
  `check FBAR/FATCA obligations, compare LLC vs S-Corp, estimate quarterly taxes, get a ` +
  `published fee quote, and book a consultation. Answers are complete on their own; every ` +
  `response is general information (not tax advice) and includes an optional link to the ` +
  `relevant guide or to an Enrolled Agent enrolled to practice before the IRS. Tools and ` +
  `prompts work in English, Turkish, and Spanish. Some tools accept brief:true for shorter ` +
  `answers. Full docs: ${DOCS_URL}.`;

function toolListEntry(tool: AnyToolDef) {
  const inputSchema = zodToJsonSchema(tool.input, { $refStrategy: 'none' }) as Record<string, unknown>;
  delete inputSchema.$schema;
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema,
    // ChatGPT's Apps SDK requires an outputSchema per tool. Every response is
    // built through envelope(), so the shared envelope schema is truthful for
    // all tools; additionalProperties admits the tool-specific fields.
    outputSchema: ENVELOPE_OUTPUT_SCHEMA,
    annotations: tool.annotations,
    // Apps SDK: advertise the widget template so ChatGPT pre-fetches it. The
    // `openai/*` keys are namespaced and ignored by clients that don't render
    // widgets (e.g. Claude), so this is safe to always include.
    ...(tool.widget
      ? {
          _meta: {
            'openai/outputTemplate': tool.widget.templateUri,
            'openai/toolInvocation/invoking': tool.widget.invoking,
            'openai/toolInvocation/invoked': tool.widget.invoked,
          },
        }
      : {}),
  };
}

// Schemas are static, so the tools/list payload is computed once per registry
// (zodToJsonSchema is the most CPU-heavy call in the protocol path).
const toolListCache = new WeakMap<AnyToolDef[], ReturnType<typeof toolListEntry>[]>();
function toolList(tools: AnyToolDef[]) {
  let entries = toolListCache.get(tools);
  if (!entries) {
    entries = tools.map(toolListEntry);
    toolListCache.set(tools, entries);
  }
  return entries;
}

function promptListEntry(p: PromptDef) {
  return {
    name: p.name,
    title: p.title,
    description: p.description,
    ...(p.arguments ? { arguments: p.arguments } : {}),
  };
}

/**
 * Describe zod validation failures WITHOUT echoing the offending value
 * (never echo unvalidated input). We build messages from the field
 * path and the expected shape only.
 */
function describeIssues(err: z.ZodError): string {
  return err.issues
    .map((i) => {
      const path = i.path.join('.') || '(root)';
      if (i.code === 'invalid_enum_value') {
        const opts = (i.options as unknown[]).map((o) => JSON.stringify(o)).join(', ');
        return `${path}: must be one of ${opts}`;
      }
      if (i.code === 'invalid_type') {
        return `${path}: expected ${i.expected}`;
      }
      if (i.code === 'unrecognized_keys') {
        return `${path}: unexpected field(s) ${i.keys.join(', ')}`;
      }
      if (i.code === 'too_small' || i.code === 'too_big') {
        // zod's min/max messages state the limit, never the received value.
        return `${path}: ${i.message}`;
      }
      return `${path}: invalid value`;
    })
    .join('; ');
}

function ok(id: JsonRpcResponse['id'], result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result };
}
function fail(id: JsonRpcResponse['id'], code: number, message: string): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function handleOne(msg: JsonRpcRequest, reg: Registry): JsonRpcResponse | null {
  // Notifications (no id) get no response body.
  const isNotification = msg.id === undefined || msg.id === null;
  const id = msg.id ?? null;

  switch (msg.method) {
    case 'initialize': {
      const requested = (msg.params?.protocolVersion as string) || LATEST_PROTOCOL_VERSION;
      const protocolVersion = (SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(requested)
        ? requested
        : LATEST_PROTOCOL_VERSION;
      return ok(id, {
        protocolVersion,
        capabilities: {
          tools: { listChanged: false },
          prompts: { listChanged: false },
          resources: { listChanged: false, subscribe: false },
        },
        serverInfo: { name: SERVER_SLUG, title: SERVER_NAME, version: reg.version },
        instructions: INSTRUCTIONS,
      });
    }

    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null; // acknowledged by the transport (HTTP 202), no JSON-RPC body

    case 'ping':
      return ok(id, {});

    case 'tools/list':
      return ok(id, { tools: toolList(reg.tools) });

    case 'prompts/list':
      return ok(id, { prompts: reg.prompts.map(promptListEntry) });

    case 'resources/list':
      return ok(id, { resources: [...resourceList(), ...uiResourceList()] });

    case 'resources/read': {
      if (isNotification) return null;
      const uri = msg.params?.uri as string | undefined;
      const result = uri ? (readResource(uri) ?? readUiResource(uri)) : null;
      if (!result) return fail(id, ErrorCode.InvalidParams, 'Unknown resource URI');
      return ok(id, result);
    }

    case 'tools/call': {
      if (isNotification) return null;
      const name = msg.params?.name as string | undefined;
      const tool = reg.tools.find((t) => t.name === name);
      if (!tool) {
        if (name && reg.disabled?.has(name)) return ok(id, disabledToolResult(reg.version));
        return fail(id, ErrorCode.InvalidParams, 'Unknown tool');
      }

      const parsed = tool.input.safeParse(msg.params?.arguments ?? {});
      if (!parsed.success) {
        return fail(id, ErrorCode.InvalidParams, `Invalid arguments - ${describeIssues(parsed.error)}`);
      }
      try {
        const out = tool.run(parsed.data);
        logToolCall(tool.name, tool.logEnums(parsed.data));
        const result = toToolResult(out, reg.version);
        // Bind the result to its widget template so ChatGPT renders the
        // structuredContent in-chat. Omitted for tools without a widget.
        if (tool.widget) {
          result._meta = { 'openai/outputTemplate': tool.widget.templateUri };
        }
        return ok(id, result);
      } catch (err) {
        // Tool-execution failure -> isError result (not a protocol error). The
        // message is a FIXED string: runtime error text can leak internals, so
        // it goes to the server log only. The disclaimer still ships (the
        // directory rule is "every response carries it").
        console.error(`tool_error tool=${tool.name}`, err instanceof Error ? err.message : err);
        const text = `This tool could not complete the request. Please adjust the inputs and try again.\n\n${DISCLAIMER}`;
        return ok(id, {
          content: [{ type: 'text', text }],
          structuredContent: { disclaimer: DISCLAIMER, server_version: reg.version },
          isError: true,
        });
      }
    }

    case 'prompts/get': {
      if (isNotification) return null;
      const name = msg.params?.name as string | undefined;
      const prompt = reg.prompts.find((p) => p.name === name);
      if (!prompt) return fail(id, ErrorCode.InvalidParams, 'Unknown prompt');
      // Prompt arguments interpolate into returned message text, so they get
      // the same treatment as tool inputs: only DECLARED argument names are
      // accepted, required ones enforced, every value coerced to a bounded,
      // sanitized string (never raw echo).
      const raw = msg.params?.arguments;
      const supplied =
        typeof raw === 'object' && raw !== null && !Array.isArray(raw)
          ? (raw as Record<string, unknown>)
          : {};
      const args: Record<string, string> = {};
      for (const decl of prompt.arguments ?? []) {
        const value = supplied[decl.name];
        if (value === undefined) {
          if (decl.required) {
            return fail(id, ErrorCode.InvalidParams, `Missing required argument: ${decl.name}`);
          }
          continue;
        }
        if (typeof value !== 'string' && typeof value !== 'number') {
          return fail(id, ErrorCode.InvalidParams, `Argument ${decl.name}: expected a string`);
        }
        args[decl.name] = sanitizeText(String(value), MAX_PROMPT_ARG_LEN);
      }
      return ok(id, { description: prompt.description, messages: prompt.build(args) });
    }

    default:
      if (isNotification) return null;
      return fail(id, ErrorCode.MethodNotFound, `Method not found: ${msg.method}`);
  }
}

/**
 * Handle a parsed JSON-RPC body (single object or - for older clients - a
 * batch array). Returns the response object, an array, or null for a body that
 * was entirely notifications.
 */
export function dispatch(body: unknown, reg: Registry): JsonRpcResponse | JsonRpcResponse[] | null {
  if (Array.isArray(body)) {
    if (body.length === 0) return fail(null, ErrorCode.InvalidRequest, 'Invalid Request: empty batch');
    if (body.length > MAX_BATCH) {
      return fail(null, ErrorCode.InvalidRequest, `Invalid Request: batch too large (max ${MAX_BATCH})`);
    }
    const responses = body
      .map((m) => handleOne(m as JsonRpcRequest, reg))
      .filter((r): r is JsonRpcResponse => r !== null);
    return responses.length ? responses : null;
  }
  if (typeof body !== 'object' || body === null) {
    return fail(null, ErrorCode.InvalidRequest, 'Invalid Request');
  }
  return handleOne(body as JsonRpcRequest, reg);
}
