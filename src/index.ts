/**
 * Arc & Ledger Tax Help - Cloudflare Worker entry.
 *
 * Routes:
 *   POST /mcp      -> stateless Streamable-HTTP MCP endpoint (JSON-RPC)
 *   GET  /mcp      -> 405 (no server-initiated SSE stream; stateless by design)
 *   GET  /healthz  -> liveness
 *   GET  /version  -> server version + price-set/tax-year versions
 *   GET  /.well-known/mcp-registry-auth -> MCP Registry domain-ownership proof
 *   *              -> 404 JSON
 *
 * No authentication. All tools are public and read-only.
 */
import { dispatch } from './lib/mcp';
import { checkRateLimit, clientIp } from './lib/rateLimit';
import { logEvent } from './lib/logging';
import { SERVER_NAME, SERVER_SLUG, DOCS_URL, LATEST_PROTOCOL_VERSION } from './lib/config';
import { TOOLS, PROMPTS } from './registry';
import { PRICE_SET } from './pricing';
import { TAX_YEAR } from './rates';
import type { AnyToolDef } from './lib/types';
import type { Env } from './lib/env';

/**
 * Per-tool kill switch. DISABLED_TOOLS (wrangler.toml [vars] or the Cloudflare
 * dashboard) is a comma-separated list of tool names to switch off without a
 * code change: they leave tools/list and tools/call answers with a fixed
 * "temporarily offline" message, so one stale rate can be pulled within
 * minutes without taking down the other tools. Memoized per var value because
 * tools/list is cached by array identity.
 */
let gateKey: string | undefined;
let gateValue: { active: AnyToolDef[]; disabled: ReadonlySet<string> } = { active: TOOLS, disabled: new Set() };
function toolGate(env: Env): { active: AnyToolDef[]; disabled: ReadonlySet<string> } {
  const raw = env.DISABLED_TOOLS ?? '';
  if (raw !== gateKey) {
    const disabled = new Set(
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
    gateKey = raw;
    gateValue = { active: disabled.size ? TOOLS.filter((t) => !disabled.has(t.name)) : TOOLS, disabled };
  }
  return gateValue;
}

/** Largest accepted POST body. Real MCP clients send a few KB at most. */
const MAX_BODY_BYTES = 65_536;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version, Authorization',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, Mcp-Protocol-Version',
  'Access-Control-Max-Age': '86400',
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS_HEADERS, ...extra },
  });
}

function version(env: Env) {
  const { active, disabled } = toolGate(env);
  return {
    name: SERVER_NAME,
    slug: SERVER_SLUG,
    version: env.SERVER_VERSION ?? '0.0.0',
    protocol: LATEST_PROTOCOL_VERSION,
    price_set: PRICE_SET,
    tax_year: TAX_YEAR,
    tools: active.length,
    tools_disabled: disabled.size,
    prompts: PROMPTS.length,
    docs: DOCS_URL,
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '') || '/';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (path === '/healthz' && request.method === 'GET') {
      return json({ status: 'ok', name: SERVER_SLUG });
    }

    if (path === '/version' && request.method === 'GET') {
      return json(version(env));
    }

    if (path === '/' && request.method === 'GET') {
      // Friendly landing for humans who hit the bare host.
      return json({
        name: SERVER_NAME,
        endpoint: '/mcp',
        transport: 'streamable-http',
        auth: 'none',
        docs: DOCS_URL,
      });
    }

    if (path === '/mcp') {
      if (request.method === 'GET') {
        // No server-initiated stream on this stateless endpoint.
        return json(
          { jsonrpc: '2.0', error: { code: -32000, message: 'Method Not Allowed: use POST' }, id: null },
          405,
          { Allow: 'POST, OPTIONS' },
        );
      }
      if (request.method !== 'POST') {
        return json({ error: 'Method Not Allowed' }, 405, { Allow: 'POST, OPTIONS' });
      }

      // Per-IP rate limit (60/min, burst 10).
      const ip = clientIp(request);
      const gate = await checkRateLimit(ip, env);
      if (!gate.allowed) {
        logEvent('rate_limited');
        return json(
          { jsonrpc: '2.0', error: { code: -32029, message: 'Rate limit exceeded' }, id: null },
          429,
          { 'Retry-After': String(gate.retryAfter) },
        );
      }

      // One POST buys one rate-limit token, so the body must be small: cap the
      // size before parsing (batch length is separately capped in dispatch()).
      const declaredLength = Number(request.headers.get('content-length') ?? '0');
      if (declaredLength > MAX_BODY_BYTES) {
        return json(
          { jsonrpc: '2.0', error: { code: -32600, message: 'Request body too large' }, id: null },
          413,
        );
      }
      const contentType = request.headers.get('content-type') ?? '';
      if (!contentType.toLowerCase().includes('application/json')) {
        return json(
          { jsonrpc: '2.0', error: { code: -32600, message: 'Content-Type must be application/json' }, id: null },
          415,
        );
      }

      let body: unknown;
      try {
        // Content-Length can be absent or wrong (chunked encoding), so enforce
        // the cap on the actual bytes too.
        const raw = await request.text();
        if (raw.length > MAX_BODY_BYTES) {
          return json(
            { jsonrpc: '2.0', error: { code: -32600, message: 'Request body too large' }, id: null },
            413,
          );
        }
        body = JSON.parse(raw);
      } catch {
        return json({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null }, 400);
      }

      const { active, disabled } = toolGate(env);
      const registry = { tools: active, prompts: PROMPTS, version: env.SERVER_VERSION ?? '0.0.0', disabled };
      const result = dispatch(body, registry);

      if (result === null) {
        // Body was entirely notifications (e.g. notifications/initialized).
        return new Response(null, { status: 202, headers: CORS_HEADERS });
      }
      return json(result);
    }

    // MCP Registry HTTP domain-ownership proof (https://modelcontextprotocol.io/registry/authentication)
    if (path === '/.well-known/mcp-registry-auth' && request.method === 'GET') {
      return new Response('v=MCPv1; k=ed25519; p=kN1wUOqGWbl4q37R8IuMFrs/AxrQAN+A+xm7KRxfq88=', {
        status: 200,
        headers: { 'content-type': 'text/plain', 'cache-control': 'public, max-age=3600', ...CORS_HEADERS },
      });
    }

    return json({ error: 'Not Found' }, 404);
  },
};
