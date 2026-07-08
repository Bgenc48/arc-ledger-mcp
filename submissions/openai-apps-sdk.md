# OpenAI Apps SDK - submission payload

Follow the live guidelines before submitting:
- App submission guidelines: https://developers.openai.com/apps-sdk/app-submission-guidelines
- Developer guidelines: https://developers.openai.com/apps-sdk

Our app is informational with no in-chat purchases, which keeps it in the
lowest-friction review lane.

---

## App metadata
- **App name:** Arc & Ledger Tax Tools
- **Developer:** Arc & Ledger Accounting (Enrolled Agent firm, est. 2016)
- **Category:** Finance / Tax (informational). If service/tax categories are gated at review time, note the rejection reason and resubmit when the category opens; the server is unchanged either way.
- **Short description / full description / example prompts:** see `listing-copy.md`.
- **Support contact:** info@arcandledger.com
- **Privacy policy:** https://www.arcandledger.com/mcp/privacy
- **Documentation:** https://www.arcandledger.com/mcp

## Technical connection
- **MCP endpoint:** `https://mcp.arcandledger.com/mcp` (Streamable HTTP)
- **Auth:** none (public, read-only)
- **Tools (15):** decode_irs_notice, check_fbar_fatca, compare_llc_scorp, estimate_quarterly_taxes, estimate_rental_income, deadline_calendar, check_itin_eligibility, estimate_irs_penalty, compare_formation_states, check_sales_tax_nexus, estimate_reasonable_comp, estimate_augusta_rule, estimate_accountable_plan, get_fee_quote, book_consultation (all read-only; each returns structured content).
- **Resources (4):** arcledger://office, arcledger://services, arcledger://fee-catalog, arcledger://tool-directory (read-only first-party JSON).
- **Prompts (5):** three English + two Turkish (abd_sirket_vergi_takvimi, itin_almali_miyim) for international founders.
- **Apps SDK component (SHIPPED):** `compare_formation_states` renders an in-chat comparison widget (`ui://widget/formation-states.html`, `text/html+skybridge`). The tool advertises it via `openai/outputTemplate` on tools/list and stamps it on each tools/call result; the widget reads `window.openai.toolOutput`, is fully self-contained (inline CSS/JS, light + dark themes), and its `openai/widgetCSP` declares ZERO external connect/resource domains - it makes no network requests of any kind. Remaining tools return structured data + text and can gain widgets incrementally.

## Review expectations & our answers
- **Developer verification:** complete OpenAI developer verification for Arc & Ledger.
- **Purchases in chat?** No. No checkout happens in the assistant; handoff links open the firm's own pages.
- **Data collected / stored?** None stored. Inputs processed in memory; anonymous 30-day logs only. No PII, no health data.
- **Regulated advice?** Informational only; not tax advice; no practitioner-client relationship (Circular 230 disclosure on every response and on the docs page).
- **Testing:** tested in ChatGPT developer mode against the live endpoint (Phase 7). All twelve tools invoked with realistic prompts; transcripts saved.

## Testing steps (ChatGPT developer mode)
1. Add the connector with URL `https://mcp.arcandledger.com/mcp` (no auth).
2. Confirm the twelve tools (and four resources) appear with their titles and descriptions.
3. Run one prompt per tool (see `listing-copy.md` example prompts).
4. Verify each response includes the disclaimer, a source_url, and a first-party next_step link.
5. Save transcripts as the worked examples / screenshots.

## Assets
Same as the Anthropic submission (`assets/`): logo, favicon, 5 response screenshots + paired prompts.

## If the category is gated
Document the exact rejection reason here and resubmit when service/tax merchants are admitted. No server change is required.
