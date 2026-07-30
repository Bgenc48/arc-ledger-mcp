/**
 * ChatGPT Apps SDK widget for the `compare_formation_states` tool.
 *
 * This is a SELF-CONTAINED HTML document (inline CSS + vanilla JS, zero external
 * requests) served as an MCP UI resource with mimeType `text/html+skybridge`.
 * ChatGPT renders it in a sandboxed iframe and exposes the tool's
 * structuredContent as `window.openai.toolOutput`. The widget only READS that
 * data and draws a comparison - it never phones home, matching the firm's
 * no-data-harvesting stance. The single outbound action is a normal link to the
 * first-party next_step.url.
 *
 * Design follows "The Ledger" system (docs/design-system.md) adapted for an
 * iframe with no font CDN: system serif for display, system sans for body,
 * system mono for figures; royal-blue primary, brass accent, ivory/ink grounds;
 * light + dark themes. Circular 230 language is inherited from the tool payload.
 */
export const FORMATION_STATES_WIDGET_HTML = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>US Formation State Comparison</title>
<style>
  :root {
    --primary: #014BAE;
    --primary-soft: #2f6fca;
    --accent: #9A6A2F;
    --ink: #0B1B2B;
    --paper: #FAF8F3;
    --card: #ffffff;
    --line: #e6e0d4;
    --text: #1c2733;
    --muted: #5b6673;
    --chip-bg: #f0ead9;
    --shadow: 0 1px 2px rgba(11,27,43,.06), 0 8px 24px rgba(11,27,43,.05);
    --radius: 12px;
  }
  :root[data-theme="dark"], html.dark {
    --primary: #6ea3e8;
    --primary-soft: #8fbaf0;
    --accent: #d3a866;
    --ink: #06121e;
    --paper: #0b1b2b;
    --card: #10263c;
    --line: #21384f;
    --text: #e7edf4;
    --muted: #9fb0c2;
    --chip-bg: #17304a;
    --shadow: 0 1px 2px rgba(0,0,0,.3), 0 10px 28px rgba(0,0,0,.35);
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --primary: #6ea3e8;
      --primary-soft: #8fbaf0;
      --accent: #d3a866;
      --ink: #06121e;
      --paper: #0b1b2b;
      --card: #10263c;
      --line: #21384f;
      --text: #e7edf4;
      --muted: #9fb0c2;
      --chip-bg: #17304a;
      --shadow: 0 1px 2px rgba(0,0,0,.3), 0 10px 28px rgba(0,0,0,.35);
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--paper);
    color: var(--text);
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 860px; margin: 0 auto; padding: 18px; }
  .kicker {
    font-family: ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace;
    font-size: 11px; letter-spacing: .14em; text-transform: uppercase;
    color: var(--accent); margin: 0 0 6px;
  }
  h1 {
    font-family: ui-serif, Georgia, "Times New Roman", serif;
    font-weight: 600; font-size: 22px; line-height: 1.2; margin: 0 0 4px;
    color: var(--text); text-wrap: balance;
  }
  .sub { color: var(--muted); margin: 0 0 16px; font-size: 13px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
  .card {
    position: relative; background: var(--card); border: 1px solid var(--line);
    border-radius: var(--radius); padding: 14px 14px 16px; box-shadow: var(--shadow);
    display: flex; flex-direction: column; gap: 10px;
  }
  .card.rec { border-color: var(--accent); }
  .card.rec::before {
    content: ""; position: absolute; inset: -1px -1px auto -1px; height: 3px;
    background: var(--accent); border-radius: var(--radius) var(--radius) 0 0;
  }
  .chip {
    display: inline-block; font-family: ui-monospace, Menlo, monospace; font-size: 10px;
    letter-spacing: .1em; text-transform: uppercase; color: var(--accent);
    background: var(--chip-bg); border-radius: 999px; padding: 2px 8px; align-self: flex-start;
  }
  .state {
    font-family: ui-serif, Georgia, serif; font-weight: 600; font-size: 17px;
    margin: 0; color: var(--text);
  }
  .fee {
    font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 20px;
    font-weight: 600; color: var(--primary); font-variant-numeric: tabular-nums;
  }
  .fee small { display: block; font-size: 10px; font-weight: 400; letter-spacing: .08em;
    text-transform: uppercase; color: var(--muted); font-family: inherit; margin-top: 2px; }
  dl { margin: 0; display: grid; grid-template-columns: 1fr auto; gap: 4px 8px; font-size: 12.5px; }
  dt { color: var(--muted); }
  dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; font-family: ui-monospace, Menlo, monospace; }
  .best { font-size: 12px; color: var(--muted); border-top: 1px solid var(--line); padding-top: 8px; margin: 0; }
  .why {
    margin: 18px 0 0; padding: 14px 16px; background: var(--ink); color: #eaf1f9;
    border-radius: var(--radius); font-size: 13px; line-height: 1.55;
  }
  :root[data-theme="dark"] .why, html.dark .why { background: #081726; border: 1px solid var(--line); }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .why { background: #081726; border: 1px solid var(--line); } }
  .why b { color: var(--accent); }
  .note { margin: 12px 0 0; font-size: 12px; color: var(--muted); }
  .cta {
    display: inline-block; margin: 16px 0 6px; background: var(--primary); color: #fff;
    text-decoration: none; font-weight: 600; font-size: 13px; padding: 10px 18px;
    border-radius: 999px;
  }
  .cta:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .disclaimer { margin: 10px 0 0; font-size: 11px; color: var(--muted); font-style: italic; }
  .empty { padding: 28px; text-align: center; color: var(--muted); }
  @media (prefers-reduced-motion: no-preference) { .card { transition: none; } }

  /* Brand band + trust footer (visual refresh 2026-07) */
  .brandbar {
    display: flex; align-items: center; gap: 10px;
    margin: -18px -18px 16px; padding: 12px 18px;
    background: linear-gradient(135deg, #07203F 0%, #0B1B2B 55%, #014BAE 135%);
    color: #fff;
  }
  .brand-name { font-family: ui-serif, Georgia, serif; font-weight: 600; font-size: 15px; letter-spacing: .02em; }
  .brand-name .amp { color: #C9A227; }
  .brand-label {
    margin-left: auto; font-family: ui-monospace, Menlo, monospace; font-size: 10.5px;
    letter-spacing: .14em; text-transform: uppercase; color: #d3a866;
  }
  .trustbar {
    display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap;
    margin: 14px 0 0; padding: 10px 2px 0; border-top: 1px solid var(--line);
    font-size: 11px; color: var(--muted);
  }
  .trust-domain { font-family: ui-monospace, Menlo, monospace; letter-spacing: .06em; color: var(--accent); }
</style>
</head>
<body>
  <div class="wrap" id="root"><div class="empty">Loading formation comparison...</div></div>
<script>
(function () {
  var root = document.getElementById("root");

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* Brand band + trust footer helpers (visual refresh 2026-07) */
  var BRAND_MARK = '<svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="26" height="26" rx="6" fill="#C9A227"/><text x="13" y="17.5" text-anchor="middle" font-family="Georgia, serif" font-size="10.5" font-weight="700" fill="#07203F">A&amp;L</text></svg>';
  function brandBar(label) {
    return '<div class="brandbar">' + BRAND_MARK +
      '<span class="brand-name">Arc <span class="amp">&amp;</span> Ledger</span>' +
      '<span class="brand-label">' + esc(label) + "</span></div>";
  }
  function trustBar() {
    return '<div class="trustbar"><span>Read-only &middot; No account &middot; No data stored &middot; Sources: IRS.gov &amp; FinCEN</span>' +
      '<span class="trust-domain">arcandledger.com</span></div>';
  }

  function applyTheme() {
    var api = window.openai || {};
    var theme = api.theme || api.displayMode;
    if (theme === "dark" || theme === "light") {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }

  function boolText(v, yes, no) { return v ? yes : no; }

  function render() {
    var data = (window.openai && window.openai.toolOutput) || window.__TOOL_OUTPUT__ || null;
    if (!data || !Array.isArray(data.states) || data.states.length === 0) {
      root.innerHTML = '<div class="empty">No comparison data yet. Ask which US state to form your LLC in.</div>';
      return;
    }

    var cards = data.states.map(function (s) {
      var rows = [
        ["Annual cost", esc(s.annual_ongoing_fees)],
        ["Franchise tax", esc(s.franchise_tax)],
        ["State income tax", boolText(s.state_income_tax, "Yes", "None")],
        ["Approval", esc(s.typical_approval)]
      ].map(function (r) { return "<dt>" + r[0] + "</dt><dd>" + r[1] + "</dd>"; }).join("");

      return (
        '<div class="card' + (s.recommended ? " rec" : "") + '">' +
          (s.recommended ? '<span class="chip">Recommended</span>' : "") +
          '<h3 class="state">' + esc(s.state) + "</h3>" +
          '<div class="fee">' + esc(s.first_year_government_fees) + "<small>First-year gov. fees</small></div>" +
          "<dl>" + rows + "</dl>" +
          '<p class="best">' + esc(s.best_for) + "</p>" +
        "</div>"
      );
    }).join("");

    var next = data.next_step || {};
    var ctaLabel = next.label ? esc(next.label) : "Talk to an Enrolled Agent";
    var ctaUrl = typeof next.url === "string" && next.url.indexOf("https://") === 0 ? esc(next.url) : "";

    root.innerHTML =
      brandBar("US Formation") +
      "<h1>" + esc(data.recommended_state || "State comparison") + " looks best for you</h1>" +
      '<p class="sub">Government fees only - our formation service fee is separate.</p>' +
      '<div class="grid">' + cards + "</div>" +
      (data.why ? '<div class="why"><b>Why:</b> ' + esc(data.why) + "</div>" : "") +
      (data.note ? '<p class="note">' + esc(data.note) + "</p>" : "") +
      (ctaUrl ? '<a class="cta" href="' + ctaUrl + '" target="_blank" rel="noopener noreferrer">' + ctaLabel + "</a>" : "") +
      (data.disclaimer ? '<p class="disclaimer">' + esc(data.disclaimer) + "</p>" : "") + trustBar();
  }

  applyTheme();
  render();

  // Apps SDK re-emits globals (theme, toolOutput) as they change.
  window.addEventListener("openai:set_globals", function () { applyTheme(); render(); });
})();
</script>
</body>
</html>`;
