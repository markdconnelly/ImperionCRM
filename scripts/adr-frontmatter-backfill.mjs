#!/usr/bin/env node
// One-time backfill: PREPEND YAML frontmatter to every ADR-*.md in
// docs/decision-records/. Additive only — never alters existing body content.
// Skips files that already start with `---`. Issue #754 / ADR-0090.
//
// Seeding rules:
//   summary  -> curated README "Decision" cell when present, else first sentence
//               of the body's "## Decision" section (trimmed to ~25 words).
//   status   -> leading word of the | **Status** | cell, lowercased.
//   date     -> first YYYY-MM-DD in the | **Date** | cell, else in Status cell.
//   superseded_by -> only when Status says "Superseded [in part] by ADR-XXXX".
//   tags     -> static tag map below (first match wins).
//
// Run from anywhere: `node scripts/adr-frontmatter-backfill.mjs`

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADR_DIR = path.join(__dirname, "..", "docs", "decision-records");

// Tag map: ADR number -> domain tag (first match wins; one primary tag).
const TAG_MAP = {
  platform: ["0001", "0002", "0003", "0005", "0006", "0009", "0017"],
  topology: ["0007", "0018", "0028", "0042"],
  authz: ["0008", "0016", "0030", "0045", "0050"],
  "crm-core": ["0010", "0011", "0014", "0019", "0031"],
  medallion: ["0012", "0032", "0038", "0039", "0041", "0043", "0044"],
  gtm: ["0022", "0023", "0024", "0025", "0026", "0027", "0033", "0035", "0053"],
  "agent-icm": [
    "0004", "0015", "0029", "0048", "0049", "0054", "0055", "0061", "0087",
    "0088", "0089",
  ],
  pm: ["0064", "0065", "0066", "0069", "0070"],
  "crm-parity": ["0067", "0071", "0072", "0073", "0074", "0076", "0077"],
  "sale-delivery": ["0080", "0081"],
  finance: ["0082", "0083", "0085"],
  "security-posture": ["0040", "0051", "0059", "0063"],
  reporting: ["0021", "0062", "0075"],
  surfaces: [
    "0020", "0034", "0036", "0037", "0046", "0047", "0052", "0058", "0078",
  ],
  meta: ["0013", "0056", "0057", "0060", "0084", "0086", "0090"],
};

function tagFor(num) {
  for (const [tag, nums] of Object.entries(TAG_MAP)) {
    if (nums.includes(num)) return tag;
  }
  return null;
}

// Parse the README index "Decision" cell per ADR number (curated summaries).
function loadReadmeSummaries() {
  const readme = fs.readFileSync(path.join(ADR_DIR, "README.md"), "utf8");
  const map = {};
  // | [0001](...) | Title | Status | Date | Decision |
  const rowRe = /^\|\s*\[(\d{4})\]\([^)]*\)\s*\|(.+)\|\s*$/gm;
  let m;
  while ((m = rowRe.exec(readme)) !== null) {
    const num = m[1];
    const cells = m[2].split("|").map((c) => c.trim());
    // cells: [Title, Status, Date, Decision]
    const decision = cells[cells.length - 1];
    if (decision) map[num] = decision;
  }
  return map;
}

function getCell(body, field) {
  const re = new RegExp(`^\\|\\s*\\*\\*${field}\\*\\*\\s*\\|(.+?)\\|\\s*$`, "m");
  const m = body.match(re);
  return m ? m[1].trim() : null;
}

function deriveSummaryFromDecision(body) {
  const m = body.match(/^##\s+Decision\s*\n([\s\S]*?)(?:\n##\s|\n#\s|$)/m);
  if (!m) return null;

  // Walk the Decision section. Skip tables, blockquotes, fenced code. Remember
  // the first "lead-in" line (ends in a colon, introduces a list/table) as a
  // fallback, and capture the first substantive statement otherwise. Wrapped
  // prose lines are joined into one logical paragraph.
  const lines = m[1].split("\n");
  let inFence = false;
  let leadIn = "";
  let candidate = "";

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (candidate) break;
      continue;
    }
    if (line.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (line.startsWith("|") || line.startsWith(">")) {
      if (candidate) break;
      continue;
    }

    const stripped = line.replace(/^(?:\d+\.|[-*])\s+/, "").trim();
    if (!stripped) continue;

    // A bare lead-in (ends in a colon, no sentence punctuation): keep as a
    // fallback but prefer a substantive item that follows.
    const isLeadIn = /:\s*$/.test(stripped) && !/[.!?]/.test(stripped);
    if (isLeadIn) {
      if (!leadIn) leadIn = stripped.replace(/:\s*$/, "");
      continue;
    }

    candidate = stripped;
    break;
  }

  let text = (candidate || leadIn).trim().replace(/:\s*$/, "");
  if (!text) return null;

  // Protect decimals (e.g. "v0.1", "100.5") so they are not split as sentence
  // boundaries, then split into sentences (delimiter kept) plus any trailing
  // remainder that has no terminal punctuation. SENTINEL is a placeholder that
  // never appears in ADR prose.
  const SENTINEL = "";
  const guarded = text.replace(/(\d)\.(\d)/g, `$1${SENTINEL}$2`);
  const rawParts = guarded.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [guarded];
  const sentences = rawParts.map((s) => s.split(SENTINEL).join(".").trim());

  // Take the first sentence; if it is a trivial stub ("Option 3.", a bare list
  // ordinal, or <4 words), keep appending following sentences.
  let sentence = "";
  for (const part of sentences) {
    sentence = sentence ? `${sentence} ${part}` : part;
    const wordCount = sentence
      .replace(/[.!?]/g, " ")
      .split(/\s+/)
      .filter(Boolean).length;
    const stillStub =
      /^option\s+\d+\.?$/i.test(sentence.trim()) ||
      /^\d+\.?$/.test(sentence.trim()) ||
      wordCount < 4;
    if (!stillStub) break;
  }
  sentence = sentence.trim().replace(/:\s*$/, "");
  // Drop bold markers (mid-sentence fragments often start inside **bold**) and
  // tidy doubled spaces; keep inline `code` intact.
  sentence = sentence.replace(/\*\*/g, "").replace(/\s{2,}/g, " ").trim();

  // Trim to ~25 words.
  const words = sentence.split(/\s+/);
  if (words.length > 25) sentence = words.slice(0, 25).join(" ") + "…";
  return sentence;
}

// Strip markdown emphasis + links to plain text for scalar parsing.
function plain(s) {
  return s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links -> text
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim();
}

function parseStatus(statusCell) {
  const p = plain(statusCell);
  const first = p.split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, "");
  // Normalize to the allowed set.
  if (first.startsWith("supersed")) return "superseded";
  if (first.startsWith("propos")) return "proposed";
  if (first.startsWith("consolidat")) return "consolidated";
  return "accepted";
}

function parseDate(dateCell, statusCell) {
  const dateRe = /(\d{4}-\d{2}-\d{2})/;
  let m = dateCell && dateCell.match(dateRe);
  if (m) return m[1];
  m = statusCell && statusCell.match(dateRe);
  return m ? m[1] : null;
}

function parseSupersededBy(statusCell) {
  // "Superseded by ADR-0058" / "Superseded in part by ADR-0080" / link form.
  const p = plain(statusCell);
  if (!/^superseded/i.test(p)) return null;
  const refs = [...p.matchAll(/ADR-(\d{4})/g)].map((x) => `ADR-${x[1]}`);
  return refs.length ? [...new Set(refs)] : null;
}

// Minimal YAML scalar quoting: always double-quote string values, escaping " and \.
function yamlString(s) {
  return `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function buildFrontmatter(fm) {
  const lines = ["---"];
  lines.push(`adr: ${fm.adr}`);
  lines.push(`title: ${yamlString(fm.title)}`);
  lines.push(`status: ${fm.status}`);
  lines.push(`date: ${fm.date}`);
  lines.push(`repo: frontend`);
  lines.push(`summary: ${yamlString(fm.summary)}`);
  if (fm.superseded_by) {
    lines.push(`superseded_by: [${fm.superseded_by.map(yamlString).join(", ")}]`);
  }
  if (fm.tags) {
    lines.push(`tags: [${fm.tags}]`);
  }
  lines.push("---");
  lines.push("");
  return lines.join("\n");
}

function main() {
  const summaries = loadReadmeSummaries();
  const files = fs
    .readdirSync(ADR_DIR)
    .filter((f) => /^ADR-\d{4}.*\.md$/.test(f))
    .sort();

  const report = { written: [], skipped: [], fallbackSummary: [], anomalies: [] };

  for (const file of files) {
    const full = path.join(ADR_DIR, file);
    const body = fs.readFileSync(full, "utf8");
    if (body.startsWith("---")) {
      report.skipped.push(file);
      continue;
    }

    const num = file.match(/^ADR-(\d{4})/)[1];

    // Title from H1.
    const h1 = body.match(/^#\s+ADR-\d{4}:\s*(.+?)\s*$/m);
    const title = h1 ? h1[1].trim() : file.replace(/\.md$/, "");
    if (!h1) report.anomalies.push(`${file}: no H1 title matched`);

    const statusCell = getCell(body, "Status");
    const dateCell = getCell(body, "Date");
    if (!statusCell) report.anomalies.push(`${file}: no Status cell`);
    if (!dateCell) report.anomalies.push(`${file}: no Date cell`);

    const status = statusCell ? parseStatus(statusCell) : "accepted";
    const date = parseDate(dateCell, statusCell);
    if (!date) report.anomalies.push(`${file}: no date parsed`);

    let summary = summaries[num];
    if (!summary) {
      summary = deriveSummaryFromDecision(body);
      if (summary) report.fallbackSummary.push(num);
      else report.anomalies.push(`${file}: no summary (no README row, no Decision section)`);
    }

    const superseded_by = statusCell ? parseSupersededBy(statusCell) : null;
    const tags = tagFor(num);

    const fm = buildFrontmatter({
      adr: num,
      title,
      status,
      date: date || "2026-01-01",
      summary: summary || title,
      superseded_by,
      tags,
    });

    fs.writeFileSync(full, fm + body, "utf8");
    report.written.push(file);
  }

  console.log("ADR frontmatter backfill complete.");
  console.log(`  written:  ${report.written.length}`);
  console.log(`  skipped (already had frontmatter): ${report.skipped.length}`);
  console.log(`  summary fell back to Decision sentence: ${report.fallbackSummary.length} -> ${report.fallbackSummary.join(", ")}`);
  if (report.anomalies.length) {
    console.log("  ANOMALIES:");
    for (const a of report.anomalies) console.log(`    - ${a}`);
  } else {
    console.log("  anomalies: none");
  }
}

main();
