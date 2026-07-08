/**
 * Output-side sanitization for any caller-supplied text that gets echoed back
 * into a tool/prompt response. Tool results are rendered by the consuming LLM,
 * so raw echo is a prompt-injection channel: a hostile caller could plant
 * markdown links or instructions in a transcript. Every echoed string MUST go
 * through one of these helpers (see also describeIssues in mcp.ts, which never
 * echoes values at all).
 */

/** Keep only safe printable characters; collapse whitespace; cap length. */
export function sanitizeText(raw: string, maxLen = 200): string {
  return Array.from(raw)
    .filter((ch) => {
      const c = ch.codePointAt(0) ?? 0;
      return c >= 0x20 && c !== 0x7f; // drop control chars incl. NUL and DEL
    })
    .join('')
    .replace(/[[\]()<>`{}\\]/g, '') // strip markdown-link / code / brace syntax
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

/**
 * Canonicalize an echoed US state: a clean 2-letter code comes back uppercased;
 * anything else is summarized rather than echoed.
 */
export function sanitizeStateEcho(state: string | undefined, isCa: boolean): string {
  if (isCa) return 'CA';
  if (!state) return 'unknown';
  const trimmed = state.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  const clean = sanitizeText(trimmed, 30);
  return /^[A-Za-z .-]{2,30}$/.test(clean) ? clean : 'other';
}

/** Restrict an unrecognized notice-code echo to a plausible code shape. */
export function sanitizeNoticeCodeEcho(canonical: string): string {
  const clean = canonical.replace(/[^A-Z0-9]/g, '').slice(0, 12);
  return clean || 'unknown';
}
