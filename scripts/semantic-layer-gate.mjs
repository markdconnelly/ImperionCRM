// Semantic-layer docs-gate (ADR-0086 / issue #535).
//
// Enforces the OKF cross-repo sync contract (system CLAUDE.md §11) mechanically:
// a PR whose migrations add/alter/drop a silver table that already has an OKF
// concept file under docs/database/semantic-layer/tables/ MUST also touch that
// concept file in the same PR (at minimum bump its `timestamp`). Otherwise the
// curated meaning layer silently rots away from the schema.
//
// Design notes
// - The set of "concept-bearing silver entities" is derived from the bundle
//   itself: each tables/<entity>.md is one silver entity whose physical object
//   name == <entity>. No hand-maintained mapping to drift.
// - Detection is DDL-anchored (CREATE/ALTER/DROP TABLE|VIEW <entity>) on the
//   CHANGED migration files only, with SQL comments stripped first. Word-boundary
//   matching means `expense_item` does NOT match its bronze feed
//   `website_expense_item` or its view `expense_item_all` (an underscore is a word
//   char, so there is no boundary between `item` and `_all`). Low false-positive,
//   low false-negative.
// - NEW silver entities (a migration creating a silver table that has no concept
//   file yet) are deliberately OUT OF SCOPE — there is no reliable signal that a
//   brand-new table is "silver" vs bronze/reference/config. That is the expansion
//   path (#536) and is caught at review, not here.
// - Escape hatch: the `semantic-layer-not-affected` PR label (justified in the PR
//   body), mirroring `docs-not-needed`.
//
// Pure functions are exported for the vitest suite; main() runs in CI.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const CONCEPTS_DIR = "docs/database/semantic-layer/tables";
export const COVERAGE_MATRIX = "docs/database/semantic-layer/coverage-matrix.md";
export const MIGRATIONS_DIR = "db/migrations";
export const ESCAPE_HATCH_LABEL = "semantic-layer-not-affected";

const MIGRATION_RE = /^db\/migrations\/\d+_.*\.sql$/;

/** Strip `-- line` and block comments so prose never triggers a DDL match. */
export function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ") // block comments
    .replace(/--[^\n]*/g, " "); // line comments
}

/** Concept entity names (file stems) from the bundle's tables/ directory. */
export function listConceptEntities(repoRoot, dir = CONCEPTS_DIR) {
  return readdirSync(join(repoRoot, dir))
    .filter((f) => f.endsWith(".md") && f !== "index.md")
    .map((f) => f.replace(/\.md$/, ""))
    .sort();
}

/** True if `sql` contains a CREATE/ALTER/DROP of TABLE|VIEW named exactly `entity`. */
export function migrationTouchesEntity(sql, entity) {
  const e = entity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // create [or replace] [materialized] table|view [if [not] exists] [only] <entity>
  const re = new RegExp(
    `\\b(?:create|alter|drop)\\s+` +
      `(?:or\\s+replace\\s+)?(?:materialized\\s+)?` +
      `(?:table|view)\\s+` +
      `(?:if\\s+(?:not\\s+)?exists\\s+)?(?:only\\s+)?` +
      `"?${e}"?\\b`,
    "i",
  );
  return re.test(sql);
}

/**
 * Core decision. All inputs are plain data so the suite can exercise every branch.
 * @param {object} o
 * @param {string[]} o.changedFiles    repo-relative paths changed in the PR
 * @param {Record<string,string>} o.migrationSql  changed-migration path -> SQL text
 * @param {string[]} o.conceptEntities entity stems that have a concept file
 * @param {boolean} o.hasEscapeHatch   PR carries the escape-hatch label
 * @returns {{ ok: boolean, touched: string[], missing: {entity:string,file:string}[], message: string }}
 */
export function evaluateGate({ changedFiles, migrationSql, conceptEntities, hasEscapeHatch }) {
  const changed = new Set(changedFiles);
  const changedMigrations = changedFiles.filter((f) => MIGRATION_RE.test(f));

  const touched = new Set();
  for (const path of changedMigrations) {
    const raw = migrationSql[path];
    if (!raw) continue;
    const sql = stripSqlComments(raw);
    for (const entity of conceptEntities) {
      if (migrationTouchesEntity(sql, entity)) touched.add(entity);
    }
  }

  const missing = [];
  for (const entity of [...touched].sort()) {
    const file = `${CONCEPTS_DIR}/${entity}.md`;
    if (!changed.has(file)) missing.push({ entity, file });
  }

  if (missing.length === 0) {
    const note = touched.size
      ? `Silver entities touched (${[...touched].sort().join(", ")}) all have matching bundle updates.`
      : "No concept-bearing silver migration in this PR.";
    return { ok: true, touched: [...touched].sort(), missing, message: note };
  }

  if (hasEscapeHatch) {
    return {
      ok: true,
      touched: [...touched].sort(),
      missing,
      message:
        `Escape hatch '${ESCAPE_HATCH_LABEL}' present — skipping gate despite ` +
        `unsynced concept file(s): ${missing.map((m) => m.file).join(", ")}.`,
    };
  }

  const lines = missing.map(
    (m) => `  • migration changes silver '${m.entity}' but ${m.file} was not updated`,
  );
  return {
    ok: false,
    touched: [...touched].sort(),
    missing,
    message:
      "Semantic-layer bundle out of sync with silver migration(s) (ADR-0086 §11):\n" +
      lines.join("\n") +
      `\n\nUpdate each listed concept file (at minimum bump its 'timestamp', and the` +
      `\nmatching ${COVERAGE_MATRIX} row if shape/authority/joins changed), OR add the` +
      `\n'${ESCAPE_HATCH_LABEL}' label with justification in the PR body.`,
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────────
// Inputs from env (set by the CI workflow):
//   CHANGED_FILES      newline-separated repo-relative changed paths
//   HAS_ESCAPE_HATCH   "true" when the PR carries the escape-hatch label
//   GITHUB_WORKSPACE   repo root (defaults to cwd)
function main() {
  const repoRoot = process.env.GITHUB_WORKSPACE || process.cwd();
  const changedFiles = (process.env.CHANGED_FILES || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const hasEscapeHatch = (process.env.HAS_ESCAPE_HATCH || "").toLowerCase() === "true";

  const conceptEntities = listConceptEntities(repoRoot);
  const migrationSql = {};
  for (const f of changedFiles) {
    if (!MIGRATION_RE.test(f)) continue;
    try {
      migrationSql[f] = readFileSync(join(repoRoot, f), "utf8");
    } catch {
      // Deleted migration (rename/revert) — nothing to scan.
    }
  }

  const result = evaluateGate({ changedFiles, migrationSql, conceptEntities, hasEscapeHatch });
  if (result.ok) {
    console.log(`✓ semantic-layer gate: ${result.message}`);
    process.exit(0);
  }
  console.error(`::error::${result.message.replace(/\n/g, "%0A")}`);
  console.error(result.message);
  process.exit(1);
}

// Run only when invoked directly, not when imported by the test suite.
if (process.argv[1] && process.argv[1].endsWith("semantic-layer-gate.mjs")) {
  main();
}
