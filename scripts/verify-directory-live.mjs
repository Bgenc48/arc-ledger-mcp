#!/usr/bin/env node

/**
 * Verify the deployed directory-safe MCP release without client data.
 *
 * The verifier uses one JSON-RPC batch with fictional, nonidentifying inputs.
 * It prints only pass/fail metadata, never tool results or domain-challenge
 * values.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const DIRECTORY_NAME = 'Arc & Ledger Tax Reference';
export const DIRECTORY_PATH = '/directory/mcp';
export const EXPECTED_LOGO_SHA256 =
  '7f18aadb202a0abfbdd56ce1e7361fabd3f7bb3b1968f1c9ecf05e6e5e341343';

export const DIRECTORY_TOOL_FIXTURES = Object.freeze({
  decode_irs_notice: { notice_code: 'CP2000', received_date: '2026-07-20' },
  check_resolution_options: {
    balance_owed_usd: 25_000,
    ability_to_pay: 'can_make_monthly_payments',
    all_required_returns_filed: true,
  },
  estimate_irs_penalty: {
    balance_owed_usd: 10_000,
    months_late: 3,
    return_filed: true,
  },
  explain_tax_document: { document: '1099-K' },
  deadline_calendar: {
    entity_type: 'foreign_owned_llc',
    filing_year: 2026,
    formed_in_us: true,
    has_foreign_bank_over_10k: true,
  },
  check_fbar_fatca: {
    max_aggregate_foreign_balance_usd: 65_000,
    filing_status: 'single',
    lives_abroad: false,
  },
  check_treaty_withholding: {
    income_type: 'dividends',
    payee_country: 'turkey',
    payee_type: 'individual',
  },
  check_itin_eligibility: {
    has_ssn: false,
    reason: 'file_us_tax_return',
    is_foreign_national: true,
  },
  check_5472_obligation: {
    entity_type: 'single_member_llc',
    foreign_owned: true,
    had_reportable_transaction: 'yes',
    formed_in_us: true,
  },
  estimate_quarterly_taxes: {
    ytd_net_income_usd: 60_000,
    entity: 'sole_proprietor',
    state: 'CA',
    prior_year_total_tax_usd: 10_000,
  },
  estimate_accountable_plan: {
    business_miles: 2_000,
    business_mileage_period: 'on_or_after_july_1_2026',
  },
  estimate_augusta_rule: {
    fair_daily_rental_rate_usd: 1_200,
    days_rented: 12,
    marginal_tax_rate_pct: 32,
  },
  estimate_rental_income: {
    annual_rental_income_usd: 30_000,
    operating_expenses_usd: 12_000,
    property_purchase_price_usd: 400_000,
    other_income_usd: 80_000,
    filing_status: 'single',
    real_estate_professional: false,
    rental_type: 'long_term',
    personal_use_days: 0,
    rental_days: 365,
  },
});

export const DIRECTORY_TOOL_NAMES = Object.freeze(Object.keys(DIRECTORY_TOOL_FIXTURES));

const NEGATIVE_TOOL_NAMES = Object.freeze([
  'file_tax_return',
  'book_consultation',
  'get_fee_quote',
]);

const PAGE_SPECS = Object.freeze([
  {
    label: 'directory documentation',
    path: '/mcp/directory/',
    requiredText: [
      DIRECTORY_NAME,
      'https://mcp.arcandledger.com/directory/mcp',
      'No tool inputs, outputs, names, or per-call analytics',
    ],
  },
  {
    label: 'MCP privacy policy',
    path: '/mcp/privacy/',
    requiredText: [
      'does not retain tool inputs or outputs',
      'do not sell personal information or MCP tool inputs',
      'no tool-call input, tool-call output, tool name, or per-call analytics log',
    ],
  },
  {
    label: 'terms of service',
    path: '/terms-of-service/',
    requiredText: [
      'The directory connector does not need those items',
      'They cannot prepare or file a return',
    ],
  },
  {
    label: 'support page',
    path: '/contact/',
    requiredText: ['Contact Information'],
  },
]);

const PROMOTIONAL_RESULT_PATTERN =
  /Arc & Ledger|arcandledger\.com|\/go\/|Enrolled Agent|\bbook(?:ing)?\b|consultation|published fee|pricing page|secure upload|WhatsApp|\(\d{3}\) \d{3}-\d{4}|triage_tax_problem|get_document_checklist|compare_llc_scorp|estimate_reasonable_comp|compare_formation_states|check_sales_tax_nexus|get_fee_quote|book_consultation|payment_link|penalty_exposure|annual_compliance_set|boi_report|state_note|"california"/i;

const SENSITIVE_INPUT_FIELD_PATTERN =
  /^(ssn|social_security_number|itin|ein|tax_account_number|bank_account|bank_number|routing_number|password|authentication_code|mfa_code|document_content|document_url|file|file_url|upload|email|phone|full_name|first_name|last_name|street_address)$/i;

const INTERNAL_RESULT_KEYS = new Set([
  'debug',
  'stack',
  'exception',
  'runtime',
  'request_id',
  'trace_id',
  'correlation_id',
  'client_ip',
  'ip_address',
]);

const EXCLUDED_RESULT_KEYS = new Set([
  'annual_compliance_set',
  'booking_url',
  'boi_report',
  'california',
  'complexity_routing',
  'credited',
  'engagement_fee',
  'expectations',
  'fee_context',
  'free_download',
  'how_we_help',
  'matching_service',
  'office',
  'our_compliance_fee',
  'our_total_annual_cost',
  'payment_link',
  'penalty_exposure',
  'price',
  'price_usd',
  'professional_help',
  'related_tools',
  'savings_notes',
  'secure_upload',
  'state_note',
  'urgent_contact',
  'what_happens_next',
]);

export class DirectoryVerificationError extends Error {
  constructor(failures, checksRun) {
    super(
      `Directory release verification failed (${failures.length} of ${checksRun} checks).` +
        (failures[0] ? ` First failure: ${failures[0]}` : ''),
    );
    this.name = 'DirectoryVerificationError';
    this.failures = failures;
    this.checksRun = checksRun;
  }
}

function normalizeOrigin(value, label) {
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`${label} must use HTTP or HTTPS.`);
  }
  if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error(`${label} must be an origin without a path, query, or fragment.`);
  }
  return parsed.origin;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizePageText(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function readPngDimensions(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (data.length < 24 || signature.some((byte, index) => data[index] !== byte)) {
    throw new Error('Brand icon is not a PNG file.');
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
  };
}

function collectPropertyNames(schema, names = []) {
  if (Array.isArray(schema)) {
    for (const entry of schema) collectPropertyNames(entry, names);
    return names;
  }
  if (!isPlainObject(schema)) return names;
  if (isPlainObject(schema.properties)) {
    for (const [name, child] of Object.entries(schema.properties)) {
      names.push(name);
      collectPropertyNames(child, names);
    }
  }
  for (const [key, child] of Object.entries(schema)) {
    if (key !== 'properties') collectPropertyNames(child, names);
  }
  return names;
}

function collectObjectKeys(value, keys = []) {
  if (Array.isArray(value)) {
    for (const entry of value) collectObjectKeys(entry, keys);
    return keys;
  }
  if (!isPlainObject(value)) return keys;
  for (const [key, child] of Object.entries(value)) {
    keys.push(key);
    collectObjectKeys(child, keys);
  }
  return keys;
}

function collectUrls(value, urls = []) {
  if (typeof value === 'string') {
    for (const match of value.matchAll(/https:\/\/[^\s"'<>]+/gi)) {
      urls.push(match[0].replace(/[.,;:!?)}\]]+$/g, ''));
    }
    return urls;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectUrls(entry, urls);
    return urls;
  }
  if (isPlainObject(value)) {
    for (const child of Object.values(value)) collectUrls(child, urls);
  }
  return urls;
}

function isAllowedGovernmentUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (
      url.protocol === 'https:' &&
      (host === 'irs.gov' ||
        host.endsWith('.irs.gov') ||
        host === 'fincen.gov' ||
        host.endsWith('.fincen.gov') ||
        host === 'ftb.ca.gov' ||
        host.endsWith('.ftb.ca.gov'))
    );
  } catch {
    return false;
  }
}

function buildBatch() {
  const requests = [
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: {
          name: 'arc-ledger-directory-release-verifier',
          version: '1.0.0',
        },
      },
    },
    { jsonrpc: '2.0', id: 2, method: 'tools/list' },
    { jsonrpc: '2.0', id: 3, method: 'prompts/list' },
    { jsonrpc: '2.0', id: 4, method: 'resources/list' },
  ];

  DIRECTORY_TOOL_NAMES.forEach((name, index) => {
    requests.push({
      jsonrpc: '2.0',
      id: 100 + index,
      method: 'tools/call',
      params: { name, arguments: DIRECTORY_TOOL_FIXTURES[name] },
    });
  });

  NEGATIVE_TOOL_NAMES.forEach((name, index) => {
    requests.push({
      jsonrpc: '2.0',
      id: 200 + index,
      method: 'tools/call',
      params: { name, arguments: {} },
    });
  });

  if (requests.length !== 20) {
    throw new Error(`Verifier batch must contain exactly 20 requests, got ${requests.length}.`);
  }
  return requests;
}

function responseMap(value, check) {
  if (!Array.isArray(value)) {
    check(false, 'MCP batch response must be a JSON array.');
    return new Map();
  }
  check(value.length === 20, `MCP batch must return 20 responses, got ${value.length}.`);
  const mapped = new Map();
  for (const entry of value) {
    if (!isPlainObject(entry)) {
      check(false, 'MCP batch contains a non-object response.');
      continue;
    }
    const id = entry.id;
    if (typeof id !== 'number' && typeof id !== 'string') {
      check(false, 'MCP batch response is missing a usable id.');
      continue;
    }
    if (mapped.has(String(id))) {
      check(false, `MCP batch contains duplicate response id ${id}.`);
      continue;
    }
    mapped.set(String(id), entry);
  }
  return mapped;
}

async function fetchWithTimeout(fetchImpl, url, init, timeoutMs) {
  const signal =
    typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
      ? AbortSignal.timeout(timeoutMs)
      : undefined;
  return fetchImpl(url, signal ? { ...init, signal } : init);
}

async function readJsonResponse(fetchImpl, url, init, timeoutMs, label, check) {
  try {
    const response = await fetchWithTimeout(fetchImpl, url, init, timeoutMs);
    check(response.ok, `${label} returned HTTP ${response.status}.`);
    const contentType = response.headers.get('content-type') ?? '';
    check(contentType.toLowerCase().includes('application/json'), `${label} did not return JSON.`);
    try {
      return await response.json();
    } catch {
      check(false, `${label} returned invalid JSON.`);
      return null;
    }
  } catch (error) {
    check(false, `${label} could not be fetched: ${error instanceof Error ? error.message : 'unknown error'}.`);
    return null;
  }
}

function validateInitialize(response, expectedVersion, check) {
  if (!isPlainObject(response)) {
    check(false, 'Initialize response is missing.');
    return;
  }
  check(!response.error, 'Initialize returned a JSON-RPC error.');
  const result = response.result;
  if (!isPlainObject(result)) {
    check(false, 'Initialize result is missing.');
    return;
  }
  const serverInfo = result.serverInfo;
  check(isPlainObject(serverInfo), 'Initialize serverInfo is missing.');
  if (isPlainObject(serverInfo)) {
    check(serverInfo.title === DIRECTORY_NAME, `Initialize title must be "${DIRECTORY_NAME}".`);
    check(serverInfo.version === expectedVersion, `Initialize version must be ${expectedVersion}.`);
  }
  const capabilities = result.capabilities;
  check(isPlainObject(capabilities), 'Initialize capabilities are missing.');
  if (isPlainObject(capabilities)) {
    check(isPlainObject(capabilities.tools), 'Initialize must advertise tools.');
    check(isPlainObject(capabilities.prompts), 'Initialize must advertise prompt discovery.');
    check(!Object.hasOwn(capabilities, 'resources'), 'Directory initialize must not advertise resources.');
  }
  const instructions = typeof result.instructions === 'string' ? result.instructions : '';
  check(instructions.includes('Do not ask for Social Security numbers'), 'Initialize safety instructions are missing.');
  check(instructions.includes('do not prepare or file a return'), 'Initialize filing boundary is missing.');
  check(instructions.includes('verify it against the cited official authority'), 'Initialize verification rule is missing.');
}

function validateToolsList(response, check) {
  if (!isPlainObject(response) || !isPlainObject(response.result)) {
    check(false, 'tools/list result is missing.');
    return;
  }
  const tools = response.result.tools;
  if (!Array.isArray(tools)) {
    check(false, 'tools/list did not return a tools array.');
    return;
  }
  const names = tools.map((tool) => (isPlainObject(tool) ? tool.name : undefined));
  check(
    JSON.stringify(names) === JSON.stringify(DIRECTORY_TOOL_NAMES),
    `tools/list must expose exactly these tools in release order: ${DIRECTORY_TOOL_NAMES.join(', ')}.`,
  );

  for (const tool of tools) {
    if (!isPlainObject(tool) || typeof tool.name !== 'string') {
      check(false, 'tools/list contains an invalid tool entry.');
      continue;
    }
    const label = `Tool ${tool.name}`;
    check(typeof tool.title === 'string' && tool.title.length > 0, `${label} is missing a title.`);
    check(
      typeof tool.description === 'string' && tool.description.length > 0,
      `${label} is missing a description.`,
    );
    check(
      typeof tool.description !== 'string' || !PROMOTIONAL_RESULT_PATTERN.test(tool.description),
      `${label} description contains excluded commercial or first-party language.`,
    );
    check(isPlainObject(tool.inputSchema), `${label} is missing inputSchema.`);
    check(isPlainObject(tool.outputSchema), `${label} is missing outputSchema.`);
    check(!Object.hasOwn(tool, '_meta'), `${label} must not bind a widget or Apps SDK metadata.`);
    check(isPlainObject(tool.annotations), `${label} is missing annotations.`);
    if (isPlainObject(tool.annotations)) {
      check(tool.annotations.readOnlyHint === true, `${label} must set readOnlyHint=true.`);
      check(tool.annotations.destructiveHint === false, `${label} must set destructiveHint=false.`);
      check(tool.annotations.openWorldHint === false, `${label} must set openWorldHint=false.`);
    }
    if (isPlainObject(tool.inputSchema)) {
      for (const field of collectPropertyNames(tool.inputSchema)) {
        check(
          !SENSITIVE_INPUT_FIELD_PATTERN.test(field),
          `${label} input schema contains sensitive field "${field}".`,
        );
      }
    }
  }
}

function validateEmptyList(response, resultKey, label, check) {
  if (!isPlainObject(response) || !isPlainObject(response.result)) {
    check(false, `${label} result is missing.`);
    return;
  }
  const entries = response.result[resultKey];
  check(Array.isArray(entries), `${label} did not return a ${resultKey} array.`);
  if (Array.isArray(entries)) {
    check(entries.length === 0, `${label} must return zero ${resultKey}.`);
  }
}

function validateToolResult(response, toolName, expectedVersion, check) {
  if (!isPlainObject(response)) {
    check(false, `${toolName} response is missing.`);
    return;
  }
  check(!response.error, `${toolName} returned a JSON-RPC error.`);
  const result = response.result;
  if (!isPlainObject(result)) {
    check(false, `${toolName} result is missing.`);
    return;
  }
  check(result.isError !== true, `${toolName} returned isError=true.`);
  check(!Object.hasOwn(result, '_meta'), `${toolName} result must not bind a widget.`);
  const content = result.content;
  check(Array.isArray(content) && content.length > 0, `${toolName} visible content is missing.`);
  if (Array.isArray(content)) {
    const visible = content
      .filter((entry) => isPlainObject(entry) && entry.type === 'text')
      .map((entry) => String(entry.text ?? ''))
      .join('\n');
    check(visible.includes('General information, not tax advice.'), `${toolName} visible disclaimer is missing.`);
    check(!PROMOTIONAL_RESULT_PATTERN.test(visible), `${toolName} visible result contains excluded language.`);
  }

  const structured = result.structuredContent;
  if (!isPlainObject(structured)) {
    check(false, `${toolName} structuredContent is missing.`);
    return;
  }
  check(structured.server_version === expectedVersion, `${toolName} server_version must be ${expectedVersion}.`);
  check(
    typeof structured.disclaimer === 'string' &&
      structured.disclaimer.includes('General information, not tax advice.'),
    `${toolName} structured disclaimer is missing.`,
  );
  check(
    typeof structured.relay === 'string' && structured.relay.includes('exactly as returned'),
    `${toolName} relay instruction is missing.`,
  );
  check(
    typeof structured.source_url === 'string' && isAllowedGovernmentUrl(structured.source_url),
    `${toolName} source_url must be an approved government HTTPS URL.`,
  );
  check(isPlainObject(structured.next_step), `${toolName} next_step is missing.`);
  if (isPlainObject(structured.next_step)) {
    check(
      structured.next_step.url === structured.source_url,
      `${toolName} next_step URL must equal source_url.`,
    );
  }

  const serialized = JSON.stringify(structured);
  check(
    !PROMOTIONAL_RESULT_PATTERN.test(serialized),
    `${toolName} structured result contains excluded commercial or first-party language.`,
  );
  for (const key of collectObjectKeys(structured)) {
    check(!INTERNAL_RESULT_KEYS.has(key), `${toolName} result contains internal field "${key}".`);
    check(!EXCLUDED_RESULT_KEYS.has(key), `${toolName} result contains excluded field "${key}".`);
  }
  const urls = collectUrls(result);
  check(urls.length > 0, `${toolName} result must contain an official source URL.`);
  for (const url of urls) {
    check(isAllowedGovernmentUrl(url), `${toolName} returned a non-government URL.`);
  }
}

function validateNegativeResult(response, toolName, check) {
  if (!isPlainObject(response) || !isPlainObject(response.error)) {
    check(false, `Unavailable action ${toolName} must return a JSON-RPC error.`);
    return;
  }
  check(response.error.code === -32602, `Unavailable action ${toolName} must return InvalidParams.`);
  check(response.error.message === 'Unknown tool', `Unavailable action ${toolName} must return a fixed error.`);
  check(!Object.hasOwn(response.error, 'data'), `Unavailable action ${toolName} must not expose error data.`);
  check(
    !JSON.stringify(response.error).includes(toolName),
    `Unavailable action ${toolName} error must not echo the requested capability.`,
  );
}

/**
 * Run the full production release verification.
 *
 * @param {object} options
 * @param {typeof fetch} [options.fetchImpl]
 * @param {string} [options.mcpOrigin]
 * @param {string} [options.siteOrigin]
 * @param {string} options.expectedVersion
 * @param {string} [options.expectedLogoSha256]
 * @param {boolean} [options.submissionReady]
 * @param {string} [options.challengeExpected]
 * @param {number} [options.timeoutMs]
 */
export async function verifyDirectoryRelease(options) {
  const {
    fetchImpl = globalThis.fetch,
    mcpOrigin: rawMcpOrigin = 'https://mcp.arcandledger.com',
    siteOrigin: rawSiteOrigin = 'https://www.arcandledger.com',
    expectedVersion,
    expectedLogoSha256 = EXPECTED_LOGO_SHA256,
    submissionReady = false,
    challengeExpected,
    timeoutMs = 15_000,
  } = options ?? {};

  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required.');
  if (typeof expectedVersion !== 'string' || expectedVersion.trim() === '') {
    throw new Error('expectedVersion is required.');
  }
  if (!/^[a-f0-9]{64}$/i.test(expectedLogoSha256)) {
    throw new Error('expectedLogoSha256 must be a 64-character SHA-256 hex value.');
  }

  const mcpOrigin = normalizeOrigin(rawMcpOrigin, 'mcpOrigin');
  const siteOrigin = normalizeOrigin(rawSiteOrigin, 'siteOrigin');
  const failures = [];
  let checksRun = 0;
  const check = (condition, message) => {
    checksRun += 1;
    if (!condition) failures.push(message);
  };

  const health = await readJsonResponse(
    fetchImpl,
    `${mcpOrigin}/healthz`,
    { headers: { accept: 'application/json' } },
    timeoutMs,
    'GET /healthz',
    check,
  );
  if (isPlainObject(health)) {
    check(health.status === 'ok', 'GET /healthz must report status=ok.');
  }

  const version = await readJsonResponse(
    fetchImpl,
    `${mcpOrigin}/version`,
    { headers: { accept: 'application/json' } },
    timeoutMs,
    'GET /version',
    check,
  );
  if (isPlainObject(version)) {
    check(version.version === expectedVersion, `GET /version must report ${expectedVersion}.`);
    check(version.directory_tools === 13, 'GET /version must report directory_tools=13.');
    check(
      version.directory_tools_disabled === 0,
      'GET /version must report directory_tools_disabled=0.',
    );
    check(
      version.directory_endpoint === DIRECTORY_PATH,
      `GET /version must report directory_endpoint=${DIRECTORY_PATH}.`,
    );
  }

  const batch = await readJsonResponse(
    fetchImpl,
    `${mcpOrigin}${DIRECTORY_PATH}`,
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(buildBatch()),
    },
    timeoutMs,
    'POST /directory/mcp',
    check,
  );
  const responses = responseMap(batch, check);
  validateInitialize(responses.get('1'), expectedVersion, check);
  validateToolsList(responses.get('2'), check);
  validateEmptyList(responses.get('3'), 'prompts', 'prompts/list', check);
  validateEmptyList(responses.get('4'), 'resources', 'resources/list', check);
  DIRECTORY_TOOL_NAMES.forEach((name, index) => {
    validateToolResult(responses.get(String(100 + index)), name, expectedVersion, check);
  });
  NEGATIVE_TOOL_NAMES.forEach((name, index) => {
    validateNegativeResult(responses.get(String(200 + index)), name, check);
  });

  for (const spec of PAGE_SPECS) {
    try {
      const response = await fetchWithTimeout(
        fetchImpl,
        `${siteOrigin}${spec.path}`,
        { headers: { accept: 'text/html' } },
        timeoutMs,
      );
      check(response.ok, `${spec.label} returned HTTP ${response.status}.`);
      const contentType = response.headers.get('content-type') ?? '';
      check(contentType.toLowerCase().includes('text/html'), `${spec.label} did not return HTML.`);
      const pageText = normalizePageText(await response.text());
      for (const required of spec.requiredText) {
        check(
          pageText.toLowerCase().includes(required.toLowerCase()),
          `${spec.label} is missing required release text: "${required}".`,
        );
      }
    } catch (error) {
      check(
        false,
        `${spec.label} could not be fetched: ${error instanceof Error ? error.message : 'unknown error'}.`,
      );
    }
  }

  let observedLogoSha256 = null;
  try {
    const response = await fetchWithTimeout(
      fetchImpl,
      `${siteOrigin}/logos/monogram-ink.png`,
      { headers: { accept: 'image/png' } },
      timeoutMs,
    );
    check(response.ok, `Brand icon returned HTTP ${response.status}.`);
    const contentType = response.headers.get('content-type') ?? '';
    check(contentType.toLowerCase().includes('image/png'), 'Brand icon did not return image/png.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    observedLogoSha256 = sha256Hex(bytes);
    check(
      observedLogoSha256 === expectedLogoSha256.toLowerCase(),
      'Brand icon SHA-256 does not match the approved Arc & Ledger monogram.',
    );
    try {
      const dimensions = readPngDimensions(bytes);
      check(dimensions.width === 512, `Brand icon width must be 512, got ${dimensions.width}.`);
      check(dimensions.height === 512, `Brand icon height must be 512, got ${dimensions.height}.`);
    } catch (error) {
      check(false, error instanceof Error ? error.message : 'Brand icon PNG validation failed.');
    }
  } catch (error) {
    check(
      false,
      `Brand icon could not be fetched: ${error instanceof Error ? error.message : 'unknown error'}.`,
    );
  }

  let challengeChecked = false;
  if (submissionReady) {
    challengeChecked = true;
    if (typeof challengeExpected !== 'string' || challengeExpected.trim() === '') {
      check(false, 'Submission-ready mode requires OPENAI_APPS_CHALLENGE_EXPECTED.');
    } else {
      try {
        const response = await fetchWithTimeout(
          fetchImpl,
          `${mcpOrigin}/.well-known/openai-apps-challenge`,
          { headers: { accept: 'text/plain' } },
          timeoutMs,
        );
        check(response.ok, `OpenAI domain challenge returned HTTP ${response.status}.`);
        const contentType = response.headers.get('content-type') ?? '';
        check(
          contentType.toLowerCase().includes('text/plain'),
          'OpenAI domain challenge did not return text/plain.',
        );
        const observed = await response.text();
        check(
          observed === challengeExpected,
          'OpenAI domain challenge did not exactly match the expected portal token.',
        );
      } catch (error) {
        check(
          false,
          `OpenAI domain challenge could not be fetched: ${
            error instanceof Error ? error.message : 'unknown error'
          }.`,
        );
      }
    }
  }

  if (failures.length > 0) throw new DirectoryVerificationError(failures, checksRun);
  return {
    checksRun,
    version: expectedVersion,
    toolsVerified: DIRECTORY_TOOL_NAMES.length,
    negativeCapabilitiesVerified: NEGATIVE_TOOL_NAMES.length,
    pagesVerified: PAGE_SPECS.length,
    logoSha256: observedLogoSha256,
    challengeChecked,
  };
}

function parseArgs(argv) {
  const options = {
    mcpOrigin: 'https://mcp.arcandledger.com',
    siteOrigin: 'https://www.arcandledger.com',
    submissionReady: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--submission-ready') {
      options.submissionReady = true;
    } else if (arg === '--mcp-origin' || arg === '--site-origin' || arg === '--expected-version') {
      const value = argv[index + 1];
      if (!value) throw new Error(`${arg} requires a value.`);
      index += 1;
      if (arg === '--mcp-origin') options.mcpOrigin = value;
      if (arg === '--site-origin') options.siteOrigin = value;
      if (arg === '--expected-version') options.expectedVersion = value;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function usage() {
  return `Usage: node scripts/verify-directory-live.mjs [options]

Options:
  --mcp-origin URL         MCP origin (default: https://mcp.arcandledger.com)
  --site-origin URL        Website origin (default: https://www.arcandledger.com)
  --expected-version VER   Expected release version (default: package.json)
  --submission-ready       Also verify the exact OpenAI domain challenge
  -h, --help               Show this help

Submission-ready mode reads the expected challenge from
OPENAI_APPS_CHALLENGE_EXPECTED. The value is never printed.`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  const here = dirname(fileURLToPath(import.meta.url));
  const packageJson = JSON.parse(readFileSync(resolve(here, '..', 'package.json'), 'utf8'));
  const expectedVersion = args.expectedVersion ?? packageJson.version;
  try {
    const report = await verifyDirectoryRelease({
      mcpOrigin: args.mcpOrigin,
      siteOrigin: args.siteOrigin,
      expectedVersion,
      submissionReady: args.submissionReady,
      challengeExpected: process.env.OPENAI_APPS_CHALLENGE_EXPECTED,
    });
    console.log(
      `PASS Arc & Ledger Tax Reference ${report.version}: ${report.checksRun} checks, ` +
        `${report.toolsVerified} tools, ${report.negativeCapabilitiesVerified} unavailable actions, ` +
        `${report.pagesVerified} public pages, approved 512x512 monogram` +
        `${report.challengeChecked ? ', exact OpenAI challenge' : ''}.`,
    );
  } catch (error) {
    if (error instanceof DirectoryVerificationError) {
      console.error(error.message);
      for (const failure of error.failures) console.error(`FAIL ${failure}`);
    } else {
      console.error(error instanceof Error ? error.message : 'Directory release verification failed.');
    }
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (invokedPath === import.meta.url) await main();
