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

// ADR-0104 decision 6, layer 1 (b): the source→skill registry is `source_skill`,
// whose schema changes are already covered by the migration rule above (it has a
// concept file). The remaining surface is "a referenced skill": a skill RENAME or
// REMOVAL can orphan a `source_skill` row's sanctioned-skill pointer. We flag only
// removals/renames (a deleted SKILL.md) — a pure skill edit is not a pointer risk.
export const SOURCE_SKILL_CONCEPT = `${CONCEPTS_DIR}/source_skill.md`;
export const SKILL_MANIFEST_RE = /^plugins\/imperion-skills\/skills\/([^/]+)\/SKILL\.md$/;

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

/**
 * Skill-pointer rule (ADR-0104 decision 6, layer 1 (b)). A skill removed or renamed
 * under plugins/imperion-skills/skills/ can orphan a `source_skill` sanctioned-skill
 * pointer. If any skill manifest was DELETED in the PR, require the source_skill
 * concept file to be touched (prompting a review of the map) or the escape hatch.
 * Pure skill edits (manifest still present) are not flagged.
 * @param {object} o
 * @param {string[]} o.removedFiles  repo-relative paths DELETED in the PR
 * @param {string[]} o.changedFiles  repo-relative paths changed in the PR
 * @param {boolean} o.hasEscapeHatch PR carries the escape-hatch label
 * @returns {{ ok: boolean, removedSkills: string[], message: string }}
 */
export function evaluateSkillRule({ removedFiles = [], changedFiles = [], hasEscapeHatch }) {
  const removedSkills = removedFiles
    .map((f) => f.match(SKILL_MANIFEST_RE))
    .filter(Boolean)
    .map((m) => m[1])
    .sort();

  if (removedSkills.length === 0) {
    return { ok: true, removedSkills, message: "No skill removed/renamed." };
  }
  const touchedRegistry = new Set(changedFiles).has(SOURCE_SKILL_CONCEPT);
  if (touchedRegistry || hasEscapeHatch) {
    return {
      ok: true,
      removedSkills,
      message: hasEscapeHatch
        ? `Escape hatch '${ESCAPE_HATCH_LABEL}' present — skill removal(s) (${removedSkills.join(", ")}) not gated.`
        : `Skill(s) removed/renamed (${removedSkills.join(", ")}); ${SOURCE_SKILL_CONCEPT} touched — pointer map reviewed.`,
    };
  }
  return {
    ok: false,
    removedSkills,
    message:
      `Skill(s) removed/renamed (${removedSkills.join(", ")}) but ${SOURCE_SKILL_CONCEPT} was not updated.\n` +
      `A source_skill registry pointer may now dangle (ADR-0104 decision 2). Review the sanctioned-skill\n` +
      `map and bump ${SOURCE_SKILL_CONCEPT} (and reconcile any registry rows), OR add the\n` +
      `'${ESCAPE_HATCH_LABEL}' label with justification in the PR body.`,
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────────
// Inputs from env (set by the CI workflow):
//   CHANGED_FILES      newline-separated repo-relative changed paths
//   REMOVED_FILES      newline-separated repo-relative DELETED paths (diff-filter=D)
//   HAS_ESCAPE_HATCH   "true" when the PR carries the escape-hatch label
//   GITHUB_WORKSPACE   repo root (defaults to cwd)
function main() {
  const repoRoot = process.env.GITHUB_WORKSPACE || process.cwd();
  const splitLines = (v) =>
    (v || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  const changedFiles = splitLines(process.env.CHANGED_FILES);
  const removedFiles = splitLines(process.env.REMOVED_FILES);
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
  const skill = evaluateSkillRule({ removedFiles, changedFiles, hasEscapeHatch });

  for (const r of [result, skill]) {
    if (r.ok) console.log(`✓ semantic-layer gate: ${r.message}`);
  }
  if (result.ok && skill.ok) process.exit(0);

  for (const r of [result, skill]) {
    if (!r.ok) {
      console.error(`::error::${r.message.replace(/\n/g, "%0A")}`);
      console.error(r.message);
    }
  }
  process.exit(1);
}

// Run only when invoked directly, not when imported by the test suite.
if (process.argv[1] && process.argv[1].endsWith("semantic-layer-gate.mjs")) {
  main();
}
