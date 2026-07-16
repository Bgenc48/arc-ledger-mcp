/**
 * ChatGPT Apps SDK widget for the `triage_tax_problem` tool.
 *
 * A SELF-CONTAINED HTML document (inline CSS + vanilla JS, zero external
 * requests) served as an MCP UI resource with mimeType `text/html+skybridge`.
 * ChatGPT renders it in a sandboxed iframe and exposes the tool's
 * structuredContent as `window.openai.toolOutput`. The widget only READS that
 * data and draws the action-plan card - it never phones home. The single
 * outbound action is a normal link to the first-party next_step.url.
 *
 * The headline element is the URGENCY banner, color-coded by the tool's
 * `urgency` field (act_now / act_this_week / plan_this_month), followed by the
 * this-week and this-month steps as numbered ledger lists and a what-not-to-do
 * card. `recommended_tools` and `matching_service` are deliberately not drawn:
 * they are model-facing data, and the card keeps a single CTA.
 *
 * Design follows "The Ledger" system (docs/design-system.md) adapted for an
 * iframe with no font CDN, mirroring noticeWidget.ts.
 */
export const ACTION_PLAN_WIDGET_HTML = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Your Tax Action Plan</title>
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
  .chip {
    display: inline-block; font-family: ui-monospace, Menlo, monospace; font-size: 11px;
    letter-spacing: .1em; text-transform: uppercase; color: var(--accent);
    background: var(--chip-bg); border-radius: 999px; padding: 3px 10px; margin: 0 0 8px;
  }
  .urgency {
    display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;
    border: 1px solid var(--line); border-left-width: 4px; border-radius: var(--radius);
    padding: 12px 14px; margin: 0 0 14px; background: var(--card); box-shadow: var(--shadow);
  }
  .urgency.now { border-left-color: var(--danger); background: var(--danger-bg); }
  .urgency.week { border-left-color: var(--warn); background: var(--warn-bg); }
  .urgency.month { border-left-color: var(--primary); }
  .urgency .level {
    font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 18px; font-weight: 600;
    letter-spacing: .02em; line-height: 1.2;
  }
  .urgency.now .level { color: var(--danger); }
  .urgency.week .level { color: var(--warn); }
  .urgency.month .level { color: var(--primary); }
  .urgency .u-label { font-size: 12px; color: var(--muted); }
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
  ul.avoid { margin: 6px 0 0; padding: 0; list-style: none; }
  ul.avoid li {
    position: relative; padding: 6px 0 6px 22px; font-size: 13px;
    border-top: 1px solid var(--line);
  }
  ul.avoid li:first-child { border-top: none; }
  ul.avoid li::before {
    content: "\\00D7"; position: absolute; left: 2px; top: 5px;
    font-family: ui-monospace, Menlo, monospace; font-size: 13px; color: var(--danger);
  }
  .note { font-size: 12.5px; color: var(--muted); margin: 0 0 14px; }
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
  <div class="wrap" id="root"><div class="empty">Building your action plan...</div></div>
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

  function ledger(items) {
    if (!Array.isArray(items) || !items.length) return "";
    return '<ol class="ledger">' + items.map(function (i) {
      return "<li>" + esc(i) + "</li>";
    }).join("") + "</ol>";
  }

  function avoidList(items) {
    if (!Array.isArray(items) || !items.length) return "";
    return '<ul class="avoid">' + items.map(function (i) {
      return "<li>" + esc(i) + "</li>";
    }).join("") + "</ul>";
  }

  var URGENCY = {
    act_now: { cls: "now", level: "Act now", label: "short clocks are running on this one" },
    act_this_week: { cls: "week", level: "Act this week", label: "respond before the window narrows" },
    plan_this_month: { cls: "month", level: "Plan this month", label: "steady steps beat waiting" }
  };

  function urgencyBlock(data) {
    var u = URGENCY[data.urgency];
    if (!u) return "";
    var problem = data.inputs && data.inputs.problem ? String(data.inputs.problem).replace(/_/g, " ") : "";
    return '<div class="urgency ' + u.cls + '">' +
      '<span class="level">' + esc(u.level) + "</span>" +
      '<span class="u-label">' + esc(u.label) + (problem ? " &middot; " + esc(problem) : "") + "</span>" +
      "</div>";
  }

  function ctaHtml(data) {
    var next = data.next_step || {};
    var label = next.label ? esc(next.label) : "Talk to an Enrolled Agent";
    var url = typeof next.url === "string" && next.url.indexOf("https://") === 0 ? esc(next.url) : "";
    return url ? '<a class="cta" href="' + url + '" target="_blank" rel="noopener noreferrer">' + label + "</a>" : "";
  }

  function render() {
    var data = (window.openai && window.openai.toolOutput) || window.__TOOL_OUTPUT__ || null;
    if (!data || !data.urgency) {
      root.innerHTML = '<div class="empty">No plan yet. Say what is going on (a letter, back taxes, unfiled years, a levy) and the plan appears here.</div>';
      return;
    }

    root.innerHTML =
      '<p class="kicker">&sect; Action Plan</p>' +
      "<h1>Your tax action plan</h1>" +
      urgencyBlock(data) +
      (data.what_this_usually_is ? '<div class="card"><h2>What this usually is</h2><p>' + esc(data.what_this_usually_is) + "</p></div>" : "") +
      (Array.isArray(data.this_week) && data.this_week.length ? '<div class="card"><h2>This week</h2>' + ledger(data.this_week) + "</div>" : "") +
      (Array.isArray(data.this_month) && data.this_month.length ? '<div class="card"><h2>This month</h2>' + ledger(data.this_month) + "</div>" : "") +
      (Array.isArray(data.what_not_to_do) && data.what_not_to_do.length ? '<div class="card"><h2>What not to do</h2>' + avoidList(data.what_not_to_do) + "</div>" : "") +
      (data.balance_note ? '<p class="note">' + esc(data.balance_note) + "</p>" : "") +
      (data.filing_note ? '<p class="note">' + esc(data.filing_note) + "</p>" : "") +
      ctaHtml(data) +
      (data.disclaimer ? '<p class="disclaimer">' + esc(data.disclaimer) + "</p>" : "");
  }

  applyTheme();
  render();

  // Apps SDK re-emits globals (theme, toolOutput) as they change.
  window.addEventListener("openai:set_globals", function () { applyTheme(); render(); });
})();
</script>
</body>
</html>`;
