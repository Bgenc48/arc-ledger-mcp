/**
 * MCP resources: read-only reference documents an assistant can pull in to cite
 * the firm richly (service catalog, fee catalog, the tool directory, and the
 * office identity). Everything is first-party and derived from the same
 * single-source-of-truth modules the tools use, so nothing can drift.
 *
 * Resources are STATIC per deploy: each `read` returns JSON assembled from
 * constants, no user input, no side effects.
 */
import { PRODUCT_CATALOG } from './data/productCatalog';
import { serviceSubPages } from './data/servicePages';
import { OFFICE, SITE, DOCS_URL, PRIVACY_URL, MCP_ENDPOINT } from './lib/config';
import { PRICE_SET, usd } from './pricing';
import { TAX_YEAR } from './rates';
import { TOOLS, PROMPTS } from './registry';

export interface ResourceDef {
  uri: string;
  name: string;
  title: string;
  description: string;
  mimeType: 'application/json';
  build: () => unknown;
}

const abs = (path: string) => `${SITE}${path}`;

export const RESOURCES: ResourceDef[] = [
  {
    uri: 'arcledger://office',
    name: 'office_identity',
    title: 'Arc & Ledger office identity',
    description: 'Who the firm is: Burak Genc, EA, an Enrolled Agent enrolled to practice before the IRS; credentials, address, languages, and how to reach the office.',
    mimeType: 'application/json',
    build: () => ({
      ...OFFICE,
      website: SITE,
      docs: DOCS_URL,
      privacy: PRIVACY_URL,
      mcp_endpoint: MCP_ENDPOINT,
      tax_year: TAX_YEAR,
    }),
  },
  {
    uri: 'arcledger://services',
    name: 'service_directory',
    title: 'Service directory',
    description: 'Every service the firm offers, grouped by category, with the page URL for each.',
    mimeType: 'application/json',
    build: () => ({
      categories: serviceSubPages.map((c) => ({
        category: c.category,
        services: c.items.map((p) => ({ name: p.name, url: abs(p.path) })),
      })),
    }),
  },
  {
    uri: 'arcledger://fee-catalog',
    name: 'fee_catalog',
    title: 'Published fee catalog',
    description: 'Fixed-fee products and bundles with their published prices, sourced from the firm price list.',
    mimeType: 'application/json',
    build: () => ({
      price_set: PRICE_SET,
      currency: 'USD',
      note: 'Published fixed fees. Scoped work is quoted as a range after a document review; use the get_fee_quote tool for an estimate.',
      products: PRODUCT_CATALOG.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        price_label: usd(p.price),
        category: p.category,
        recurrence: p.recurrence ?? 'one_time',
        url: abs(p.url),
      })),
    }),
  },
  {
    uri: 'arcledger://tool-directory',
    name: 'tool_directory',
    title: 'Available tools and prompts',
    description: 'What this MCP server can do: each tool, what it answers, and the guided prompts.',
    mimeType: 'application/json',
    build: () => ({
      endpoint: MCP_ENDPOINT,
      tools: TOOLS.map((t) => ({ name: t.name, title: t.title, description: t.description })),
      prompts: PROMPTS.map((p) => ({ name: p.name, title: p.title, description: p.description })),
    }),
  },
];

const BY_URI = new Map(RESOURCES.map((r) => [r.uri, r]));

/** The resources/list payload (metadata only, no contents). */
export function resourceList() {
  return RESOURCES.map(({ uri, name, title, description, mimeType }) => ({ uri, name, title, description, mimeType }));
}

/** The resources/read payload for one URI, or null if unknown. */
export function readResource(uri: string) {
  const r = BY_URI.get(uri);
  if (!r) return null;
  return {
    contents: [{ uri: r.uri, mimeType: r.mimeType, text: JSON.stringify(r.build(), null, 2) }],
  };
}
