import { beforeEach, describe, expect, it } from 'vitest';
import worker from '../src/index.ts';
import { _resetBuckets } from '../src/lib/rateLimit.ts';
import {
  DirectoryVerificationError,
  sha256Hex,
  verifyDirectoryRelease,
} from '../scripts/verify-directory-live.mjs';

const MCP_ORIGIN = 'https://mcp.arcandledger.com';
const SITE_ORIGIN = 'https://www.arcandledger.com';
const EXPECTED_VERSION = '0.15.1';
const CHALLENGE = 'openai-directory-verifier-test-token';

function fakePng(width = 512, height = 512) {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  bytes.set([73, 72, 68, 82], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

function sitePage(path, pageSuffix = '') {
  const textByPath = {
    '/mcp/directory/':
      'Arc & Ledger Tax Reference https://mcp.arcandledger.com/directory/mcp ' +
      'No tool inputs, outputs, names, or per-call analytics',
    '/mcp/privacy/':
      'Arc & Ledger does not retain tool inputs or outputs. ' +
      'We do not sell personal information or MCP tool inputs. ' +
      'There is no tool-call input, tool-call output, tool name, or per-call analytics log.',
    '/terms-of-service/':
      'The directory connector does not need those items. They cannot prepare or file a return.',
    '/mcp/support/':
      'Tax Reference support. Do not email Social Security numbers. ' +
      'Support requests do not create a practitioner-client relationship.',
  };
  const text = textByPath[path];
  return text ? new Response(`<html><body>${text}${pageSuffix}</body></html>`, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  }) : new Response('Not Found', { status: 404 });
}

function buildFetch({ version = EXPECTED_VERSION, logo = fakePng(), pageSuffix = '' } = {}) {
  let directoryPosts = 0;
  const fetchImpl = async (input, init = {}) => {
    const url = new URL(String(input));
    if (url.origin === MCP_ORIGIN) {
      if (url.pathname === '/directory/mcp' && init.method === 'POST') directoryPosts += 1;
      const headers = new Headers(init.headers);
      headers.set('cf-connecting-ip', '203.0.113.77');
      return worker.fetch(
        new Request(url, { ...init, headers }),
        { SERVER_VERSION: version, OPENAI_APPS_CHALLENGE: CHALLENGE },
      );
    }
    if (url.origin === SITE_ORIGIN && url.pathname === '/logos/monogram-ink.png') {
      return new Response(logo, { status: 200, headers: { 'content-type': 'image/png' } });
    }
    if (url.origin === SITE_ORIGIN) return sitePage(url.pathname, pageSuffix);
    return new Response('Not Found', { status: 404 });
  };
  return { fetchImpl, getDirectoryPosts: () => directoryPosts };
}

describe('live directory release verifier', () => {
  beforeEach(() => _resetBuckets());

  it('verifies the real Worker surface with fictional inputs in one batch', async () => {
    const logo = fakePng();
    const { fetchImpl, getDirectoryPosts } = buildFetch({ logo });
    const report = await verifyDirectoryRelease({
      fetchImpl,
      mcpOrigin: MCP_ORIGIN,
      siteOrigin: SITE_ORIGIN,
      expectedVersion: EXPECTED_VERSION,
      expectedLogoSha256: sha256Hex(logo),
      submissionReady: true,
      challengeExpected: CHALLENGE,
    });

    expect(report.version).toBe(EXPECTED_VERSION);
    expect(report.toolsVerified).toBe(13);
    expect(report.negativeCapabilitiesVerified).toBe(3);
    expect(report.pagesVerified).toBe(4);
    expect(report.challengeChecked).toBe(true);
    expect(report.checksRun).toBe(1160);
    expect(getDirectoryPosts()).toBe(1);
  });

  it('fails closed when the deployed version does not match', async () => {
    const logo = fakePng();
    const { fetchImpl } = buildFetch({ version: '0.14.0', logo });

    try {
      await verifyDirectoryRelease({
        fetchImpl,
        mcpOrigin: MCP_ORIGIN,
        siteOrigin: SITE_ORIGIN,
        expectedVersion: EXPECTED_VERSION,
        expectedLogoSha256: sha256Hex(logo),
      });
      throw new Error('Expected verification to fail.');
    } catch (error) {
      expect(error).toBeInstanceOf(DirectoryVerificationError);
      expect(error.failures).toContain('GET /version must report 0.15.1.');
      expect(error.failures).toContain('Initialize version must be 0.15.1.');
      expect(error.failures).toContain('decode_irs_notice server_version must be 0.15.1.');
    }
  });

  it('fails closed when a directory page contains a sales call to action', async () => {
    const logo = fakePng();
    const { fetchImpl } = buildFetch({ logo, pageSuffix: ' Get a fixed-fee quote' });

    await expect(verifyDirectoryRelease({
      fetchImpl,
      mcpOrigin: MCP_ORIGIN,
      siteOrigin: SITE_ORIGIN,
      expectedVersion: EXPECTED_VERSION,
      expectedLogoSha256: sha256Hex(logo),
    })).rejects.toMatchObject({
      failures: expect.arrayContaining([
        'directory documentation contains prohibited promotional text: "Get a fixed-fee quote".',
      ]),
    });
  });
});
