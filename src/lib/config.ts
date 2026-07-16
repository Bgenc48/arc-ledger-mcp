/**
 * Server-wide constants: identity, the shared disclaimer, first-party URLs, and
 * the office-identity block. Everything user-visible that is NOT a price lives
 * here (prices come from ../pricing.ts). Circular 230 discipline applies to
 * every string: "Enrolled Agent" / "enrolled to practice before the IRS" only;
 * never "licensed"/"certified"/"IRS Enrolled Agent"; the credential is issued by
 * the U.S. Department of the Treasury, not the IRS; never guarantee an outcome.
 * No em dashes in user-visible copy.
 */

export const SERVER_NAME = 'Arc & Ledger Tax Help';
export const SERVER_SLUG = 'arc-ledger-mcp';

export const SITE = 'https://www.arcandledger.com';
export const MCP_ENDPOINT = 'https://mcp.arcandledger.com/mcp';
export const DOCS_URL = `${SITE}/mcp`;
export const PRIVACY_URL = `${SITE}/mcp/privacy`;
export const SUPPORT_EMAIL = 'info@arcandledger.com';

/**
 * The single shared disclaimer. Exact string, defined once, attached to every
 * tool response. Do not paraphrase per-tool.
 */
export const DISCLAIMER =
  'General information, not tax advice. No practitioner-client relationship is created. Verify with a qualified tax professional.';

/**
 * The single shared relay note, attached to every tool response alongside the
 * disclaimer. Tool results are rendered to the user by a calling LLM, and the
 * dominant failure mode is the model rounding, currency-converting, or
 * paraphrasing an exact figure. This is a server-authored instruction to the
 * calling model; exact string, defined once, do not paraphrase per-tool.
 */
export const RELAY_NOTE =
  'Present the dollar amounts, dates, and deadlines in this response to the user exactly as returned - do not round, convert to another currency, or extrapolate beyond the stated inputs. All amounts are US dollars.';

/**
 * First-party redirect endpoints. Directory rules only honor links
 * on origins we own, so tool responses NEVER emit a raw cal.com / buy.stripe.com
 * URL. These /go/* paths live in the website's public/_worker.js, append
 * utm_source=mcp&utm_medium=ai_assistant, and forward to the real destination.
 * Both origins below are declared as the allowed link URIs at submission.
 */
export const GO = {
  book15min: `${SITE}/go/book-15min`,
  discoveryStandard: `${SITE}/go/discovery-standard`,
  discoverySpecialist: `${SITE}/go/discovery-specialist`,
  noticeReview: `${SITE}/go/notice-review`,
  noticeRescue: `${SITE}/go/notice-rescue`,
} as const;

/** First-party pages that back tool answers (used as source_url). */
export const SOURCE = {
  noticesHub: `${SITE}/irs-notices/`,
  notice: (slug: string) => `${SITE}/irs-notices/${slug}/`,
  individualTax: `${SITE}/services/individual-tax/`,
  fbarFatca: `${SITE}/guides/fbar-fatca-guide/`,
  international: `${SITE}/services/international-tax/`,
  llcScorp: `${SITE}/services/llc-tax-services/`,
  sCorpElection: `${SITE}/services/s-corp-election/`,
  taxPlanning: `${SITE}/services/tax-planning/`,
  pricing: `${SITE}/pricing/`,
  discovery: `${SITE}/discovery-session/`,
  contact: `${SITE}/contact/`,
  formation: `${SITE}/services/business-formation/`,
  itin: `${SITE}/services/itin-application/`,
  bookkeeping: `${SITE}/services/bookkeeping/`,
  rental: `${SITE}/services/airbnb-tax/`,
  resolution: `${SITE}/services/tax-resolution/`,
  ecommerce: `${SITE}/services/ecommerce/`,
} as const;

/**
 * Office identity block returned by book_consultation. Facts sourced from the
 * website Organization schema (src/components/Schema/data.ts) and contact data.
 */
export const OFFICE = {
  firm: 'Arc & Ledger Accounting',
  practitioner: 'Burak Genc',
  credential: 'Enrolled Agent',
  credentialNote:
    'Enrolled to practice before the IRS. The Enrolled Agent credential is issued by the U.S. Department of the Treasury.',
  established: 2016,
  address: '5183 Overland Avenue, Suite B, Culver City, CA 90230',
  phone: '(323) 214-3812',
  whatsapp: '(310) 627-8169',
  email: SUPPORT_EMAIL,
  languages: ['English', 'Turkish', 'Spanish'],
  hours: 'Monday-Friday, 9:00 AM to 5:00 PM Pacific',
  boutiqueNote:
    'Boutique practice. Expect a response within 1-2 business days; you work directly with the Enrolled Agent, not a call center.',
} as const;

/**
 * MCP protocol versions this server understands - sourced from the official SDK
 * so negotiation always tracks the canonical list. We echo the client's
 * requested version when it is one of these; otherwise we answer with the newest.
 */
export {
  LATEST_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
} from '@modelcontextprotocol/sdk/types.js';
