#!/usr/bin/env node
// ADR index generator + linter (ADR-0090, issue #754).
//
// Default run:
//   - Regenerates the index table in docs/decision-records/README.md between the
//     markers <!-- ADR-INDEX:START --> and <!-- ADR-INDEX:END -->.
//   - Writes docs/decision-records/adr-index.json (the machine manifest).
//
// --check:
//   Exits non-zero if any of:
//     (a) a duplicate `adr` number,
//     (b) the README between-markers differs from a fresh generation (drift),
//     (c) adr-index.json is stale,
//     (d) any ADR is missing required frontmatter (adr/title/status/date/summary).
//   Prints clear errors; writes nothing.
//
// Pure Node ESM, no dependencies. Frontmatter is preferred; if a file has none,
// the generator falls back to its H1 + the | **Status** | table cell so the
// index still lists it (the lint, however, requires frontmatter).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADR_DIR = path.join(__dirname, "..", "docs", "decision-records");
const README = path.join(ADR_DIR, "README.md");
const MANIFEST = path.join(ADR_DIR, "adr-index.json");
const START = "<!-- ADR-INDEX:START -->";
const END = "<!-- ADR-INDEX:END -->";
const REQUIRED = ["adr", "title", "status", "date", "summary"];

const checkMode = process.argv.includes("--check");

// ---- Minimal YAML frontmatter reader (simple scalars + inline arrays) -------
function parseFrontmatter(raw) {
  // Normalize line endings so CRLF files parse identically to LF files.
  const content = raw.replace(/\r\n/g, "\n");
  if (!content.startsWith("---")) return null;
  const end = content.indexOf("\n---", 3);
  if (end === -1) return null;
  const block = content.slice(3, end).replace(/^\n/, "");
  const fm = {};
  for (const line of block.split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (val === "") {
      fm[key] = null;
    } else if (val.startsWith("[")) {
      // inline array: [ "a", "b" ]
      fm[key] = val
        .slice(1, val.lastIndexOf("]"))
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      fm[key] = val.replace(/^["']|["']$/g, "");
    }
  }
  return fm;
}

// ---- Fallback parsing from the body (H1 + Status table cell) ----------------
function fallbackFromBody(content, num) {
  const h1 = content.match(/^#\s+ADR-\d{4}:\s*(.+?)\s*$/m);
  const statusCell = content.match(
    /^\|\s*\*\*Status\*\*\s*\|(.+?)\|\s*$/m
  );
  const dateCell = content.match(/^\|\s*\*\*Date\*\*\s*\|(.+?)\|\s*$/m);
  const status = statusCell
    ? statusCell[1].replace(/\*\*/g, "").trim().split(/\s+/)[0].toLowerCase()
    : "accepted";
  const dateMatch = (dateCell ? dateCell[1] : "").match(/(\d{4}-\d{2}-\d{2})/);
  return {
    adr: num,
    title: h1 ? h1[1].trim() : `ADR-${num}`,
    status: status.replace(/[^a-z]/g, "") || "accepted",
    date: dateMatch ? dateMatch[1] : "",
    summary: "",
    tags: null,
    superseded_by: null,
    consolidated_into: null,
  };
}

function loadAdrs() {
  const files = fs
    .readdirSync(ADR_DIR)
    .filter((f) => /^ADR-\d{4}.*\.md$/.test(f))
    .sort();

  const entries = [];
  const missing = [];

  for (const file of files) {
    const num = file.match(/^ADR-(\d{4})/)[1];
    const content = fs.readFileSync(path.join(ADR_DIR, file), "utf8");
    const fm = parseFrontmatter(content);

    let entry;
    if (fm) {
      const lacking = REQUIRED.filter(
        (k) => fm[k] === undefined || fm[k] === null || fm[k] === ""
      );
      if (lacking.length) missing.push(`${file}: missing frontmatter ${lacking.join(", ")}`);
      entry = {
        adr: String(fm.adr ?? num).padStart(4, "0"),
        title: fm.title || "",
        status: (fm.status || "").toLowerCase(),
        date: fm.date || "",
        tags: fm.tags || null,
        summary: fm.summary || "",
        file,
        superseded_by: fm.superseded_by || null,
        consolidated_into: fm.consolidated_into || null,
      };
    } else {
      missing.push(`${file}: no YAML frontmatter`);
      entry = { ...fallbackFromBody(content, num), file };
    }
    entries.push(entry);
  }

  entries.sort((a, b) => a.adr.localeCompare(b.adr));
  return { entries, missing };
}

// ---- Rendering --------------------------------------------------------------
function statusLabel(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function renderTable(entries) {
  const rows = [
    "| ID | Title | Status | Tags | Summary |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const e of entries) {
    const link = `[${e.adr}](./${e.file})`;
    const tags = e.tags && e.tags.length ? e.tags.join(", ") : "—";
    // Escape pipes inside cell text so the table stays well-formed.
    const title = (e.title || "").replace(/\|/g, "\\|");
    const summary = (e.summary || "").replace(/\|/g, "\\|");
    rows.push(
      `| ${link} | ${title} | ${statusLabel(e.status)} | ${tags} | ${summary} |`
    );
  }
  return rows.join("\n");
}

function buildReadme(currentReadme, entries) {
  const table = renderTable(entries);
  const block = `${START}\n\n${table}\n\n${END}`;
  if (currentReadme.includes(START) && currentReadme.includes(END)) {
    const re = new RegExp(
      `${escapeRe(START)}[\\s\\S]*?${escapeRe(END)}`,
      "m"
    );
    return currentReadme.replace(re, block);
  }
  // Markers absent: replace the first legacy "| ID | Title | ..." table that
  // follows the "## Index" heading, else append the block at the end.
  const legacyRe = /\| ID \| Title \|[\s\S]*?\n(?:\|.*\n)+/m;
  if (legacyRe.test(currentReadme)) {
    return currentReadme.replace(legacyRe, block + "\n");
  }
  return currentReadme.replace(/\s*$/, "\n\n") + block + "\n";
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function manifestJson(entries) {
  const arr = entries.map((e) => ({
    adr: e.adr,
    title: e.title,
    status: e.status,
    date: e.date,
    tags: e.tags || [],
    summary: e.summary,
    file: e.file,
    superseded_by: e.superseded_by || [],
    consolidated_into: e.consolidated_into || null,
  }));
  return JSON.stringify(arr, null, 2) + "\n";
}

// ---- Main -------------------------------------------------------------------
function main() {
  const { entries, missing } = loadAdrs();

  // Duplicate detection.
  const seen = new Map();
  const dupes = [];
  for (const e of entries) {
    if (seen.has(e.adr)) dupes.push(`${e.adr}: ${seen.get(e.adr)} and ${e.file}`);
    else seen.set(e.adr, e.file);
  }

  const currentReadme = fs.readFileSync(README, "utf8");
  const nextReadme = buildReadme(currentReadme, entries);
  const nextManifest = manifestJson(entries);

  if (checkMode) {
    const errors = [];
    if (dupes.length) {
      errors.push("Duplicate ADR numbers:");
      for (const d of dupes) errors.push(`  - ${d}`);
    }
    if (missing.length) {
      errors.push("ADRs with missing/invalid frontmatter:");
      for (const m of missing) errors.push(`  - ${m}`);
    }
    if (nextReadme !== currentReadme) {
      errors.push(
        "README index is out of date (run `node scripts/adr-index.mjs` and commit)."
      );
    }
    const currentManifest = fs.existsSync(MANIFEST)
      ? fs.readFileSync(MANIFEST, "utf8")
      : "";
    if (nextManifest !== currentManifest) {
      errors.push(
        "adr-index.json is stale (run `node scripts/adr-index.mjs` and commit)."
      );
    }
    if (errors.length) {
      console.error("ADR index check FAILED:\n" + errors.join("\n"));
      process.exit(1);
    }
    console.log(`ADR index check passed (${entries.length} ADRs).`);
    return;
  }

  // Generate mode: warn on problems but still write the index.
  if (dupes.length) {
    console.warn("WARNING — duplicate ADR numbers:\n  " + dupes.join("\n  "));
  }
  if (missing.length) {
    console.warn(
      "WARNING — ADRs missing frontmatter (listed in index via body fallback):\n  " +
        missing.join("\n  ")
    );
  }
  fs.writeFileSync(README, nextReadme, "utf8");
  fs.writeFileSync(MANIFEST, nextManifest, "utf8");
  console.log(
    `Wrote index for ${entries.length} ADRs -> README.md + adr-index.json`
  );
}

main();
