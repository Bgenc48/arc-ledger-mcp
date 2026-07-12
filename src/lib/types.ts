import type { z } from 'zod';

/** One human-handoff object. `url` is always a first-party arcandledger.com URL. */
export interface NextStep {
  label: string;
  url: string;
}

/**
 * The envelope every tool's structured content shares. Tool-specific
 * fields are spread alongside these four required keys.
 */
export interface ResponseEnvelope {
  disclaimer: string;
  relay: string;
  source_url: string;
  next_step: NextStep;
}

/** What a tool handler returns: a human summary plus its structured object. */
export interface ToolOutput {
  /** Plain-text summary shown in the chat surface. */
  summary: string;
  /** Machine-readable structured content (already merged with the envelope). */
  structured: Record<string, unknown> & ResponseEnvelope;
}

/** The MCP tool-call result shape we serialize back over JSON-RPC. */
export interface McpToolResult {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent: Record<string, unknown>;
  isError?: boolean;
  /** Optional protocol metadata (e.g. the Apps SDK `openai/outputTemplate`). */
  _meta?: Record<string, unknown>;
}

/**
 * A tool's optional ChatGPT Apps SDK widget binding. `templateUri` is the
 * `ui://` URI of a UI resource (see ui/registry.ts). `invoking`/`invoked` are
 * the short status strings ChatGPT shows while the tool runs and after it
 * returns. Purely additive: clients that ignore `_meta` (e.g. Claude) see the
 * tool exactly as before.
 */
export interface WidgetBinding {
  templateUri: string;
  invoking: string;
  invoked: string;
}

/**
 * A tool definition. `input` is a zod schema used for BOTH runtime validation
 * and (via zod-to-json-schema) the advertised inputSchema, so the two never
 * drift. `logEnums` returns ONLY coarse enum/boolean fields safe to log -
 * never free text or dollar amounts.
 */
export interface ToolDef<TSchema extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  title: string;
  description: string;
  input: TSchema;
  annotations: {
    title: string;
    readOnlyHint: true;
    openWorldHint?: boolean;
  };
  logEnums: (input: z.infer<TSchema>) => Record<string, string | number | boolean>;
  run: (input: z.infer<TSchema>) => ToolOutput;
  widget?: WidgetBinding;
}

/**
 * Type-erased tool for storage in the registry. `TSchema` appears in both
 * covariant (input) and contravariant (run/logEnums params) positions in
 * ToolDef, making it invariant - so a heterogeneous array needs this erased
 * shape. Each ToolDef<Specific> is structurally assignable to it.
 */
export interface AnyToolDef {
  name: string;
  title: string;
  description: string;
  input: z.ZodTypeAny;
  annotations: { title: string; readOnlyHint: true; openWorldHint?: boolean };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logEnums: (input: any) => Record<string, string | number | boolean>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run: (input: any) => ToolOutput;
  widget?: WidgetBinding;
}

/** An MCP prompt definition (directory-listable). */
export interface PromptDef {
  name: string;
  title: string;
  description: string;
  arguments?: Array<{ name: string; description: string; required?: boolean }>;
  build: (args: Record<string, string>) => Array<{
    role: 'user' | 'assistant';
    content: { type: 'text'; text: string };
  }>;
}
