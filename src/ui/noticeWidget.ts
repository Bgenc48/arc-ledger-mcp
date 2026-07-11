/**
 * ChatGPT Apps SDK widget for the `decode_irs_notice` tool.
 *
 * A SELF-CONTAINED HTML document (inline CSS + vanilla JS, zero external
 * requests) served as an MCP UI resource with mimeType `text/html+skybridge`.
 * ChatGPT renders it in a sandboxed iframe and exposes the tool's
 * structuredContent as `window.openai.toolOutput`. The widget only READS that
 * data and draws the notice card - it never phones home, matching the firm's
 * no-data-harvesting stance. The single outbound action is a normal link to the
 * first-party next_step.url (the Notice Rescue secure upload).
 *
 * The headline element is the DEADLINE with days-remaining, color-coded by the
 * tool's `deadline.status` (past due / urgent / open). Circular 230 language is
 * inherited from the tool payload; nothing is asserted here that the tool did
 * not compute. Handles both the recognized-notice and unrecognized-code shapes.
 *
 * Design follows "The Ledger" system (docs/design-system.md) adapted for an
 * iframe with no font CDN, mirroring formationStatesWidget.ts.
 */
export const IRS_NOTICE_WIDGET_HTML = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Your IRS Notice</title>
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
    --danger: #b3261e;
    --danger-bg: #fbeceb;
    --warn: #8a5a00;
    --warn-bg: #fbf1dc;
    --ok: #0f5132;
    --ok-bg: #e7f1ec;
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
    --danger: #f4b0aa;
    --danger-bg: #3a1614;
    --warn: #e6c079;
    --warn-bg: #33260c;
    --ok: #a7d3ba;
    --ok-bg: #10281c;
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
      --danger: #f4b0aa;
      --danger-bg: #3a1614;
      --warn: #e6c079;
      --warn-bg: #33260c;
      --ok: #a7d3ba;
      --ok-bg: #10281c;
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
  .sub { color: var(--muted); margin: 0 0 16px; font-size: 13px; }
  .code-chip {
    display: inline-block; font-family: ui-monospace, Menlo, monospace; font-size: 11px;
    letter-spacing: .1em; text-transform: uppercase; color: var(--accent);
    background: var(--chip-bg); border-radius: 999px; padding: 3px 10px; margin: 0 0 8px;
  }
  .deadline {
    display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;
    border: 1px solid var(--line); border-left-width: 4px; border-radius: var(--radius);
    padding: 12px 14px; margin: 0 0 14px; background: var(--card); box-shadow: var(--shadow);
  }
  .deadline.past { border-left-color: var(--danger); background: var(--danger-bg); }
  .deadline.urgent { border-left-color: var(--warn); background: var(--warn-bg); }
  .deadline.open { border-left-color: var(--primary); }
  .deadline .days {
    font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 24px; font-weight: 600;
    font-variant-numeric: tabular-nums; line-height: 1;
  }
  .deadline.past .days { color: var(--danger); }
  .deadline.urgent .days { color: var(--warn); }
  .deadline.open .days { color: var(--primary); }
  .deadline .dl-label { font-size: 12px; color: var(--muted); }
  .deadline .dl-label b { color: var(--text); font-weight: 600; }
  .card {
    background: var(--card); border: 1px solid var(--line); border-radius: var(--radius);
    padding: 14px 16px; box-shadow: var(--shadow); margin: 0 0 14px;
  }
  .card h2 {
    font-family: ui-serif, Georgia, serif; font-weight: 600; font-size: 15px;
    margin: 0 0 6px; color: var(--text);
  }
  .card p { margin: 0; font-size: 13.5px; }
  ol.ledger { margin: 6px 0 0; padding: 0; list-style: none; counter-reset: l; }
  ol.ledger li {
    counter-increment: l; position: relative; padding: 6px 0 6px 30px; font-size: 13px;
    border-top: 1px solid var(--line);
  }
  ol.ledger li:first-child { border-top: none; }
  ol.ledger li::before {
    content: counter(l, decimal-leading-zero); position: absolute; left: 0; top: 6px;
    font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: var(--accent);
  }
  .ignored { font-size: 13px; color: var(--text); }
  .ignored b { color: var(--danger); }
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
  <div class="wrap" id="root"><div class="empty">Loading your IRS notice...</div></div>
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

  function list(items) {
    if (!Array.isArray(items) || !items.length) return "";
    return '<ol class="ledger">' + items.map(function (i) {
      return "<li>" + esc(i) + "</li>";
    }).join("") + "</ol>";
  }

  function deadlineBlock(d) {
    if (!d) return "";
    // A computed deadline with days_remaining is the headline; otherwise fall
    // back to the descriptive phrase the tool supplied.
    if (typeof d.days_remaining === "number" && d.computed_deadline) {
      var status = d.status === "past due" ? "past" : d.status === "urgent" ? "urgent" : "open";
      var n = d.days_remaining;
      var big = status === "past" ? String(Math.abs(n)) : String(n);
      var word = status === "past"
        ? "day" + (Math.abs(n) === 1 ? "" : "s") + " past due"
        : "day" + (n === 1 ? "" : "s") + " left";
      return '<div class="deadline ' + status + '">' +
        '<span class="days">' + esc(big) + "</span>" +
        '<span class="dl-label">' + esc(word) + " &middot; <b>" + esc(d.computed_deadline) + "</b></span>" +
        "</div>";
    }
    if (d.description) {
      return '<div class="deadline open"><span class="dl-label"><b>Deadline:</b> ' + esc(d.description) + "</span></div>";
    }
    return "";
  }

  function ctaHtml(data) {
    var next = data.next_step || {};
    var label = next.label ? esc(next.label) : "Upload your notice to an Enrolled Agent";
    var url = typeof next.url === "string" && next.url.indexOf("https://") === 0 ? esc(next.url) : "";
    return url ? '<a class="cta" href="' + url + '" target="_blank" rel="noopener noreferrer">' + label + "</a>" : "";
  }

  function render() {
    var data = (window.openai && window.openai.toolOutput) || window.__TOOL_OUTPUT__ || null;
    if (!data || !data.notice_code) {
      root.innerHTML = '<div class="empty">No notice yet. Share the code on your IRS letter (for example CP2000 or LT11).</div>';
      return;
    }

    // Recognized notice: full card. Unrecognized: how-to-read fallback.
    if (data.recognized) {
      var options = data.your_options || [];
      root.innerHTML =
        '<p class="kicker">&sect; IRS Notice</p>' +
        '<span class="code-chip">' + esc(data.notice_code) + "</span>" +
        "<h1>" + esc(data.title || data.notice_code) + "</h1>" +
        deadlineBlock(data.deadline) +
        (data.what_it_means ? '<div class="card"><h2>What it means</h2><p>' + esc(data.what_it_means) + "</p></div>" : "") +
        (options.length ? '<div class="card"><h2>Your options</h2>' + list(options) + "</div>" : "") +
        (data.what_happens_if_ignored ? '<p class="ignored"><b>If ignored:</b> ' + esc(data.what_happens_if_ignored) + "</p>" : "") +
        ctaHtml(data) +
        (data.disclaimer ? '<p class="disclaimer">' + esc(data.disclaimer) + "</p>" : "");
    } else {
      root.innerHTML =
        '<p class="kicker">&sect; IRS Notice</p>' +
        '<span class="code-chip">' + esc(data.notice_code) + "</span>" +
        "<h1>How to read your IRS notice</h1>" +
        (data.message ? '<div class="card"><p>' + esc(data.message) + "</p></div>" : "") +
        (Array.isArray(data.how_to_read_any_notice) && data.how_to_read_any_notice.length
          ? '<div class="card"><h2>Step by step</h2>' + list(data.how_to_read_any_notice) + "</div>"
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
