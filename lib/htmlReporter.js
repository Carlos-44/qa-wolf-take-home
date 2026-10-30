const fs = require("fs");
const path = require("path");

/**
 * Generates a styled HTML report for the Hacker News sort-order validation.
 * Writes to reports/report.html.
 */
function generateHtmlReport({ articles, sorted, mismatches, outOfOrderPairs, countOk, passed }) {
  const reportsDir = path.join(process.cwd(), "reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const runAt = new Date().toISOString();
  const total = articles.length;
  const failCount = mismatches.length + outOfOrderPairs.length;
  const passCount = total - failCount;

  const mismatchSet = new Set(mismatches.map((m) => m.collected.id));
  const outOfOrderSet = new Set(outOfOrderPairs.flatMap((p) => [p.current ? String(p.position) : ""]));

  const rows = articles
    .map((article, i) => {
      const expected = sorted[i];
      const isMismatch = article.id !== expected.id;
      const rowClass = isMismatch ? "fail" : "pass";
      const badge = isMismatch ? '<span class="badge fail-badge">FAIL</span>' : '<span class="badge pass-badge">OK</span>';
      const ts = new Date(article.timestamp).toISOString().replace(".000Z", "Z");
      return `
        <tr class="${rowClass}">
          <td>${i + 1}</td>
          <td><code>${article.id}</code></td>
          <td>${ts}</td>
          <td>${badge}</td>
          <td class="title-cell">${escapeHtml(article.title)}</td>
        </tr>`;
    })
    .join("\n");

  const statusClass = passed ? "status-pass" : "status-fail";
  const statusText = passed ? "PASS" : "FAIL";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>HN Sort Validation Report</title>
  <style>
    :root {
      --green: #22c55e;
      --red: #ef4444;
      --gray: #6b7280;
      --bg: #0f172a;
      --surface: #1e293b;
      --border: #334155;
      --text: #e2e8f0;
      --text-muted: #94a3b8;
      --code-bg: #0f172a;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', system-ui, sans-serif; font-size: 14px; line-height: 1.5; }
    .header { background: var(--surface); border-bottom: 1px solid var(--border); padding: 24px 32px; }
    .header h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
    .header .meta { color: var(--text-muted); font-size: 12px; margin-top: 4px; }
    .summary { display: flex; gap: 16px; padding: 24px 32px; flex-wrap: wrap; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 16px 20px; flex: 1; min-width: 160px; }
    .card .label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .card .value { font-size: 28px; font-weight: 700; margin-top: 4px; }
    .card.pass .value { color: var(--green); }
    .card.fail .value { color: var(--red); }
    .card.neutral .value { color: var(--text); }
    .status-badge { display: inline-flex; align-items: center; padding: 6px 18px; border-radius: 20px; font-size: 15px; font-weight: 700; letter-spacing: 0.5px; }
    .status-pass { background: rgba(34,197,94,0.15); color: var(--green); border: 1px solid var(--green); }
    .status-fail { background: rgba(239,68,68,0.15); color: var(--red); border: 1px solid var(--red); }
    .table-wrap { padding: 0 32px 32px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: var(--surface); color: var(--text-muted); font-weight: 600; text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--border); font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; position: sticky; top: 0; }
    td { padding: 8px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
    tr.pass td { background: rgba(34,197,94,0.04); }
    tr.fail td { background: rgba(239,68,68,0.08); }
    tr:hover td { filter: brightness(1.1); }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
    .pass-badge { background: rgba(34,197,94,0.2); color: var(--green); }
    .fail-badge { background: rgba(239,68,68,0.2); color: var(--red); }
    code { font-family: 'Cascadia Code', 'Fira Code', monospace; background: var(--code-bg); padding: 2px 5px; border-radius: 3px; color: #7dd3fc; }
    .title-cell { max-width: 480px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .section-label { padding: 20px 32px 8px; font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Hacker News Sort Validation</h1>
    <div class="meta">Run at ${runAt} &nbsp;|&nbsp; <span class="${statusClass} status-badge">${statusText}</span></div>
  </div>

  <div class="summary">
    <div class="card neutral">
      <div class="label">Articles Collected</div>
      <div class="value">${total}</div>
    </div>
    <div class="card ${passCount === total ? 'pass' : 'fail'}">
      <div class="label">In-Order</div>
      <div class="value">${passCount}</div>
    </div>
    <div class="card ${failCount === 0 ? 'pass' : 'fail'}">
      <div class="label">Violations</div>
      <div class="value">${failCount}</div>
    </div>
    <div class="card neutral">
      <div class="label">Mismatches vs Merge Sort</div>
      <div class="value">${mismatches.length}</div>
    </div>
    <div class="card neutral">
      <div class="label">Adjacent Pair Violations</div>
      <div class="value">${outOfOrderPairs.length}</div>
    </div>
  </div>

  <div class="section-label">Article Detail (${total} articles)</div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Article ID</th>
          <th>Posted (UTC)</th>
          <th>Status</th>
          <th>Title</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>
</body>
</html>`;

  const outPath = path.join(reportsDir, "report.html");
  fs.writeFileSync(outPath, html, "utf8");
  return outPath;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = { generateHtmlReport };
