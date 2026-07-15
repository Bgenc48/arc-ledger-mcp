/**
 * ChatGPT Apps SDK widget for the `explain_tax_document` tool.
 *
 * A SELF-CONTAINED HTML document (inline CSS + vanilla JS, zero external
 * requests) served as an MCP UI resource with mimeType `text/html+skybridge`.
 * ChatGPT renders it in a sandboxed iframe and exposes the tool's
 * structuredContent as `window.openai.toolOutput`. The widget only READS that
 * data and draws the document card - it never phones home, matching the firm's
 * no-data-harvesting stance. The single outbound action is a normal link to the
 * first-party next_step.url (the free 15-minute call).
 *
 * The card leads with the document code and what it is, then the boxes that
 * matter and where the numbers land on the return. Circular 230 language is
 * inherited from the tool payload; nothing is asserted here that the tool did
 * not compute. Handles both the recognized-document and unrecognized shapes.
 *
 * Design follows "The Ledger" system (docs/design-system.md) adapted for an
 * iframe with no font CDN, mirroring noticeWidget.ts.
 */
export const TAX_DOCUMENT_WIDGET_HTML = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Your tax document</title>
<style>
  :root {
    --primary: #014BAE;
    --accent: #9A6A2F;
    --ink: #0B1B2B;
    --paper: #FAF8F3;
    --card: #ffffff;
    --line: #e6e0d4;
    --text: #1c2733;
    --muted: #5b6673;
    --chip-bg: #f0ead9;
    --warn: #8a5a00;
    --warn-bg: #fbf1dc;
    --shadow: 0 1px 2px rgba(11,27,43,.06), 0 8px 24px rgba(11,27,43,.05);
    --radius: 12px;
  }
  :root[data-theme="dark"], html.dark {
    --primary: #6ea3e8;
    --accent: #d3a866;
    --ink: #06121e;
    --paper: #0b1b2b;
    --card: #10263c;
    --line: #21384f;
    --text: #e7edf4;
    --muted: #9fb0c2;
    --chip-bg: #17304a;
    --warn: #e6c079;
    --warn-bg: #33260c;
    --shadow: 0 1px 2px rgba(0,0,0,.3), 0 10px 28px rgba(0,0,0,.35);
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --primary: #6ea3e8;
      --accent: #d3a866;
      --ink: #06121e;
      --paper: #0b1b2b;
      --card: #10263c;
      --line: #21384f;
      --text: #e7edf4;
      --muted: #9fb0c2;
      --chip-bg: #17304a;
      --warn: #e6c079;
      --warn-bg: #33260c;
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
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 720px; margin: 0 auto; padding: 18px; }
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
  .code-chip {
    display: inline-block; font-family: ui-monospace, Menlo, monospace; font-size: 11px;
    letter-spacing: .1em; text-transform: uppercase; color: var(--accent);
    background: var(--chip-bg); border-radius: 999px; padding: 3px 10px; margin: 0 0 8px;
  }
  .meta { font-size: 12px; color: var(--muted); margin: 0 0 14px; }
  .meta b { color: var(--text); font-weight: 600; }
  .card {
    background: var(--card); border: 1px solid var(--line); border-radius: var(--radius);
    padding: 14px 16px; box-shadow: var(--shadow); margin: 0 0 14px;
  }
  .card h2 {
    font-family: ui-serif, Georgia, serif; font-weight: 600; font-size: 15px;
    margin: 0 0 6px; color: var(--text);
  }
  .card p { margin: 0; font-size: 13.5px; }
  ol.ledger, ul.ledger { margin: 6px 0 0; padding: 0; list-style: none; counter-reset: l; }
  ol.ledger li, ul.ledger li {
    counter-increment: l; position: relative; padding: 6px 0 6px 30px; font-size: 13px;
    border-top: 1px solid var(--line);
  }
  ol.ledger li:first-child, ul.ledger li:first-child { border-top: none; }
  ol.ledger li::before {
    content: counter(l, decimal-leading-zero); position: absolute; left: 0; top: 6px;
    font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: var(--accent);
  }
  ul.ledger li::before {
    content: ""; position: absolute; left: 9px; top: 15px;
    width: 5px; height: 5px; border-radius: 999px; background: var(--accent);
  }
  .flag {
    border: 1px solid var(--line); border-left-width: 4px; border-left-color: var(--warn);
    background: var(--warn-bg); border-radius: var(--radius); padding: 12px 14px; margin: 0 0 14px;
  }
  .flag h2 { font-family: ui-serif, Georgia, serif; font-weight: 600; font-size: 14px; margin: 0 0 4px; color: var(--warn); }
  .flag p { margin: 0; font-size: 13px; color: var(--text); }
  .cta {
    display: inline-block; margin: 4px 0 6px; background: var(--primary); color: #fff;
    text-decoration: none; font-weight: 600; font-size: 13px; padding: 11px 18px;
    border-radius: 999px;
  }
  .cta:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .disclaimer { margin: 10px 0 0; font-size: 11px; color: var(--muted); font-style: italic; }
  .empty { padding: 28px; text-align: center; color: var(--muted); }
</style>
</head>
<body>
  <div class="wrap" id="root"><div class="empty">Loading your tax document...</div></div>
<script>
(function () {
  var root = document.getElementById("root");

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function applyTheme() {
    var api = window.openai || {};
    var theme = api.theme || api.displayMode;
    if (theme === "dark" || theme === "light") {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }

  function list(items, ordered) {
    if (!Array.isArray(items) || !items.length) return "";
    var tag = ordered ? "ol" : "ul";
    return "<" + tag + ' class="ledger">' + items.map(function (i) {
      return "<li>" + esc(i) + "</li>";
    }).join("") + "</" + tag + ">";
  }

  function ctaHtml(data) {
    var next = data.next_step || {};
    var label = next.label ? esc(next.label) : "Ask an Enrolled Agent about this form";
    var url = typeof next.url === "string" && next.url.indexOf("https://") === 0 ? esc(next.url) : "";
    return url ? '<a class="cta" href="' + url + '" target="_blank" rel="noopener noreferrer">' + label + "</a>" : "";
  }

  function render() {
    var data = (window.openai && window.openai.toolOutput) || window.__TOOL_OUTPUT__ || null;
    if (!data || !data.document) {
      root.innerHTML = '<div class="empty">No document yet. Share the form name printed on it (for example W-2, 1099-K, or Schedule K-1).</div>';
      return;
    }

    if (data.recognized) {
      var boxes = data.key_boxes || [];
      var checks = data.check_before_filing || [];
      root.innerHTML =
        '<p class="kicker">&sect; Tax Document</p>' +
        '<span class="code-chip">' + esc(data.document) + "</span>" +
        "<h1>" + esc(data.title || data.document) + "</h1>" +
        (data.who_sends_it_and_when ? '<p class="meta"><b>Who sends it:</b> ' + esc(data.who_sends_it_and_when) + "</p>" : "") +
        (data.what_it_is ? '<div class="card"><h2>What it is</h2><p>' + esc(data.what_it_is) + "</p></div>" : "") +
        (data.where_it_goes_on_your_return ? '<div class="card"><h2>Where it goes on your return</h2><p>' + esc(data.where_it_goes_on_your_return) + "</p></div>" : "") +
        (boxes.length ? '<div class="card"><h2>Boxes that matter</h2>' + list(boxes, false) + "</div>" : "") +
        (checks.length ? '<div class="card"><h2>Check before you file</h2>' + list(checks, true) + "</div>" : "") +
        (data.if_wrong_or_missing ? '<div class="flag"><h2>If it is wrong or missing</h2><p>' + esc(data.if_wrong_or_missing) + "</p></div>" : "") +
        (data.how_the_irs_uses_it ? '<div class="card"><h2>How the IRS uses it</h2><p>' + esc(data.how_the_irs_uses_it) + "</p></div>" : "") +
        ctaHtml(data) +
        (data.disclaimer ? '<p class="disclaimer">' + esc(data.disclaimer) + "</p>" : "");
    } else {
      root.innerHTML =
        '<p class="kicker">&sect; Tax Document</p>' +
        '<span class="code-chip">' + esc(data.document) + "</span>" +
        "<h1>How to read your tax document</h1>" +
        (data.message ? '<div class="card"><p>' + esc(data.message) + "</p></div>" : "") +
        (Array.isArray(data.how_to_read_any_tax_form) && data.how_to_read_any_tax_form.length
          ? '<div class="card"><h2>Step by step</h2>' + list(data.how_to_read_any_tax_form, true) + "</div>"
          : "") +
        ctaHtml(data) +
        (data.disclaimer ? '<p class="disclaimer">' + esc(data.disclaimer) + "</p>" : "");
    }
  }

  applyTheme();
  render();

  // Apps SDK re-emits globals (theme, toolOutput) as they change.
  window.addEventListener("openai:set_globals", function () { applyTheme(); render(); });
})();
</script>
</body>
</html>`;
