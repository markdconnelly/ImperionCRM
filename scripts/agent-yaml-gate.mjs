// agent.yaml conformance gate — the CI `icm-conformance` check
// (ADR-0088 / issues #699 + #702, part of epic #695).
//
// Validates every workflow `agent.yaml` manifest the backend loader (Backend
// #162) consumes against the CMA agent-object contract, and enforces the two
// cross-file invariants a single manifest cannot express on its own:
//
//   1. The least-privilege subset (#699):
//        workflow.tools     ⊆ domain.tools     ⊆ Constitution
//        workflow.okf_rooms ⊆ domain.okf_rooms ⊆ Constitution
//      (CONSTITUTION.md §3: "workflow ⊆ domain ⊆ Constitution"). The Constitution
//      is the OUTER allow-list, the domain narrows it, the workflow narrows
//      further; widening at any inner tier is a conformance failure.
//
//   2. OKF room resolution (#702): every `okf_rooms` entry — in a manifest AND in
//      a domain's room.yaml budget — must resolve to a real row in the OKF
//      coverage-matrix (docs/database/semantic-layer/coverage-matrix.md, ADR-0086)
//      that (a) carries a `domain` value and (b) has a concept file (✅ IKF
//      status). A room you may read must be a curated, meaning-bearing entity, not
//      a typo or a phantom name. This turns the matrix's domain column from
//      documentation into a gate (CONSTITUTION.md §3 okf_rooms clause).
//
// Design (mirrors scripts/semantic-layer-gate.mjs):
// - Structural checks reimplement the few constraints in icm/agent.schema.json
//   that we depend on, so the gate needs no JSON-Schema runtime dependency
//   (the repo ships no `ajv`). The schema file is the published contract the
//   backend loader validates against; this script is the CI mirror of it plus
//   the cross-file invariant a single-file schema can't express.
// - Pure functions take plain data (no fs) so the vitest suite exercises every
//   branch; the CLI reads the tree and feeds them.
// - A domain's allow-list IS the union of what the Constitution permits as
//   narrowed by the domain's own `room.yaml` budget (see resolveDomainBudget).
//   When a domain declares no budget, the Constitution's allow-list is the
//   bound (the domain neither widens nor narrows).
//
// Pure functions are exported for the suite; main() runs in CI.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";

export const ICM_DIR = "icm";
export const SCHEMA_FILE = "icm/agent.schema.json";
export const COVERAGE_MATRIX = "docs/database/semantic-layer/coverage-matrix.md";

export const VALID_MODELS = ["claude-opus-4-8", "claude-sonnet-4-5", "claude-haiku-4-5"];
export const VALID_RUNGS = ["L0", "L1", "L2", "L3"];
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// ADR-0104 decision 5: a stage that grounds on OKF entity E lists it in its Inputs
// table with an `okf:E` marker (the runtime-load guarantee — the authority rule is in
// context before the stage acts). A grounded entity must be within the workflow's
// declared okf_rooms allow-list (no grounding outside what the manifest permits).
export const STAGE_OKF_MARKER_RE = /\bokf:([a-z0-9_]+)/g;

// ── Structural validation ──────────────────────────────────────────────────
// Reimplements icm/agent.schema.json's load-bearing constraints. Returns an
// array of human-readable error strings ([] == valid).

/**
 * @param {object} manifest parsed agent.yaml object
 * @returns {string[]} structural errors ([] when the shape is valid)
 */
export function validateShape(manifest) {
  const errs = [];
  if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) {
    return ["manifest must be a YAML mapping"];
  }

  const requireStr = (key) => {
    if (typeof manifest[key] !== "string" || manifest[key].length === 0) {
      errs.push(`'${key}' is required and must be a non-empty string`);
      return false;
    }
    return true;
  };
  const requireArr = (key) => {
    if (!Array.isArray(manifest[key])) {
      errs.push(`'${key}' is required and must be an array`);
      return false;
    }
    return true;
  };

  if (requireStr("name") && !NAME_RE.test(manifest.name)) {
    errs.push(`'name' must be kebab-case (got '${manifest.name}')`);
  }
  if (requireStr("model") && !VALID_MODELS.includes(manifest.model)) {
    errs.push(`'model' must be a settled-stack model ${JSON.stringify(VALID_MODELS)} (got '${manifest.model}')`);
  }
  if (requireStr("autonomy_rung") && !VALID_RUNGS.includes(manifest.autonomy_rung)) {
    errs.push(`'autonomy_rung' must be one of ${JSON.stringify(VALID_RUNGS)} (got '${manifest.autonomy_rung}')`);
  }

  if (requireArr("system_compose")) {
    const sc = manifest.system_compose;
    if (sc.length < 3) {
      errs.push("'system_compose' must list at least Constitution -> domain room -> workflow prose");
    } else {
      if (!/CONSTITUTION\.md$/.test(sc[0])) {
        errs.push(`'system_compose' must begin with CONSTITUTION.md (got '${sc[0]}')`);
      }
      if (!/(^|\/)prose\.md$/.test(sc[sc.length - 1])) {
        errs.push(`'system_compose' must end at the workflow prose ('prose.md', got '${sc[sc.length - 1]}')`);
      }
      for (const f of sc) {
        if (typeof f !== "string" || !/\.md$/.test(f)) {
          errs.push(`'system_compose' entries must be .md paths (got '${f}')`);
        }
      }
    }
  }

  for (const key of ["tools", "okf_rooms"]) {
    if (requireArr(key)) {
      const seen = new Set();
      for (const v of manifest[key]) {
        if (typeof v !== "string" || v.length === 0) errs.push(`'${key}' entries must be non-empty strings`);
        else if (seen.has(v)) errs.push(`'${key}' has a duplicate entry '${v}'`);
        else seen.add(v);
      }
    }
  }

  if (manifest.skills !== undefined && !Array.isArray(manifest.skills)) {
    errs.push("'skills' must be an array when present");
  }

  // No secret values inline: mcp_servers carry references only (ADR-0060).
  if (manifest.mcp_servers !== undefined) {
    if (!Array.isArray(manifest.mcp_servers)) {
      errs.push("'mcp_servers' must be an array when present");
    } else {
      for (const s of manifest.mcp_servers) {
        if (s === null || typeof s !== "object" || Array.isArray(s)) {
          errs.push("each 'mcp_servers' entry must be a mapping");
          continue;
        }
        if (typeof s.name !== "string" || !s.name) errs.push("each 'mcp_servers' entry needs a 'name'");
        for (const banned of ["token", "secret", "password", "api_key", "apikey", "key"]) {
          if (banned in s) errs.push(`'mcp_servers' entry '${s.name}' must not carry an inline '${banned}' — use vault_secret_ref`);
        }
      }
    }
  }

  return errs;
}

// ── The subset invariant ────────────────────────────────────────────────────

/**
 * Check workflow ⊆ domain ⊆ constitution for a single allow-list dimension.
 * @param {string} dim          "tools" | "okf_rooms" (for messages)
 * @param {string[]} workflow   the agent.yaml values
 * @param {string[]} domain     the domain budget (already narrowed by constitution)
 * @param {string[]} constitution the outer allow-list
 * @returns {string[]} violation messages ([] == within bounds)
 */
export function checkSubset(dim, workflow, domain, constitution) {
  const errs = [];
  const dSet = new Set(domain);
  const cSet = new Set(constitution);
  // domain must itself be within the constitution (defence in depth)
  for (const v of domain) {
    if (!cSet.has(v)) errs.push(`domain ${dim} '${v}' is outside the Constitution allow-list`);
  }
  for (const v of workflow) {
    if (!dSet.has(v)) {
      errs.push(`workflow ${dim} '${v}' is not in the domain allow-list (widening at the workflow tier is forbidden)`);
    }
  }
  return errs;
}

// ── The domain-persona composition invariant (ADR-0088 §2) ───────────────────
// A workflow's `system_compose` is the ordered system prompt: Constitution ->
// domain room -> **domain persona** -> workflow prose. The persona file (felix.md,
// chase.md, …) is what gives the worker its voice + guardrails; a workflow that
// composes the room + prose but SKIPS the persona runs un-personated (the gap that
// left lead-response without Chase before #1413). validateShape can't see the tree,
// so this cross-file check lives here: every workflow must compose its domain's
// runtime persona — the domain-dir `.md` that is not `room.md`.

/**
 * @param {string[]} systemCompose       the manifest's system_compose paths
 * @param {string[]} domainPersonaFiles  basenames of the domain's persona file(s)
 *        (domain-dir `.md` minus room.md). Empty => domain has no persona yet (skip).
 * @returns {string[]} violations ([] == a persona is composed, or none to enforce)
 */
export function checkPersonaComposed(systemCompose, domainPersonaFiles) {
  if (!Array.isArray(systemCompose) || domainPersonaFiles.length === 0) return [];
  const composed = new Set(systemCompose.map((p) => String(p).split("/").pop()));
  const hit = domainPersonaFiles.some((f) => composed.has(f));
  return hit
    ? []
    : [
        `system_compose must include the domain runtime persona (one of ` +
          `${JSON.stringify(domainPersonaFiles)}) so the worker is personated, not ` +
          `un-voiced (ADR-0088 §2: Constitution -> room -> persona -> prose)`,
      ];
}

// ── OKF room resolution against the coverage matrix (#702) ───────────────────
// The matrix (docs/database/semantic-layer/coverage-matrix.md) is the canonical
// object → domain → IKF-status map (ADR-0086). Every room an agent may read MUST
// be a row there with a domain AND a concept file. We parse only the data we
// need from the markdown tables; no markdown dependency.

/**
 * Parse the coverage-matrix markdown into a room → {domain, hasConcept} index.
 * Recognised table shape: `| Object | Domain | Archetype | IKF | … |`.
 *  - Object cell may be a markdown link `[name](tables/name.md)` or plain `name`;
 *    the room key is the link text / plain text, lower-cased, first token only
 *    (so `consent_event → current_consent` keys on `consent_event`, and
 *    `[workflow](…) kind=journey` keys on `workflow`).
 *  - hasConcept is true when the IKF cell contains ✅.
 * Rows whose object is itself a markdown link to tables/<x>.md are always
 * concept-bearing; the ✅ marker corroborates. Non-table lines are ignored.
 * @param {string} md raw coverage-matrix.md contents
 * @returns {Record<string,{domain:string,hasConcept:boolean}>}
 */
export function parseCoverageMatrix(md) {
  const index = {};
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith("|")) continue;
    const cells = line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());
    if (cells.length < 4) continue;
    const [objCell, domainCell, , ikfCell] = cells;
    // Skip header (`Object`) and separator (`---`) rows.
    if (/^-+$/.test(objCell) || /^object$/i.test(objCell)) continue;

    // Extract the canonical object name from the first cell.
    const linked = objCell.match(/\[([^\]]+)\]\([^)]*\)/);
    let name = (linked ? linked[1] : objCell).trim();
    // First identifier token only (drops `→ current_consent`, `kind=journey`, …
    // and any comma-separated extras like `sbr_dimension_score, sbr_ticket` —
    // the first is keyed; secondary names are ⏳ and not agent rooms).
    const tok = name.match(/^[a-z0-9_]+/i);
    if (!tok) continue;
    name = tok[0].toLowerCase();

    const domain = domainCell.trim();
    if (!domain) continue;
    const hasConcept = /✅/.test(ikfCell) || Boolean(linked);
    // First definition wins (stable; the matrix lists each object once).
    if (!(name in index)) index[name] = { domain, hasConcept };
  }
  return index;
}

/**
 * Check a set of OKF rooms resolves against the coverage matrix.
 * Enforces, per room: (1) it is a known matrix object, (2) the row has a concept
 * file, (3) the row carries a domain. Domain-vertical fit is NOT re-checked here:
 * the reviewed domain `room.yaml` budget is the authority for which verticals a
 * domain may read (kernel/horizontal/cross-vertical seams are deliberate), and
 * the subset check already binds the workflow to that budget.
 * @param {string[]} rooms        room names to resolve
 * @param {Record<string,{domain:string,hasConcept:boolean}>} matrix
 * @returns {string[]} violation messages ([] == all resolve)
 */
export function checkRoomResolution(rooms, matrix) {
  const errs = [];
  for (const room of rooms) {
    const row = matrix[room];
    if (!row) {
      errs.push(
        `okf_room '${room}' does not resolve to a coverage-matrix object ` +
          `(${COVERAGE_MATRIX}) — typo, or the room is not a curated OKF entity`,
      );
      continue;
    }
    if (!row.hasConcept) {
      errs.push(
        `okf_room '${room}' resolves to a coverage-matrix row with no concept file ` +
          `(IKF status not ✅) — an agent may only read meaning-bearing entities`,
      );
    }
  }
  return errs;
}

/**
 * Whole-manifest evaluation. All inputs plain data.
 * @param {object} o
 * @param {object} o.manifest        parsed agent.yaml
 * @param {string[]} o.domainTools   the owning domain's tool budget
 * @param {string[]} o.domainRooms   the owning domain's okf_rooms budget
 * @param {string[]} o.constitutionTools  Constitution outer tool allow-list
 * @param {string[]} o.constitutionRooms  Constitution outer room allow-list
 * @param {Record<string,{domain:string,hasConcept:boolean}>} [o.matrix]  parsed
 *        coverage matrix; when provided, okf_rooms are resolved against it (#702)
 * @param {string} [o.label]         path/name for messages
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function evaluateManifest({
  manifest,
  domainTools,
  domainRooms,
  constitutionTools,
  constitutionRooms,
  matrix,
  label = "agent.yaml",
}) {
  const errors = validateShape(manifest).map((e) => `${label}: ${e}`);
  // Only run the subset check once the shape is sane enough to read arrays.
  if (Array.isArray(manifest?.tools)) {
    errors.push(
      ...checkSubset("tools", manifest.tools, domainTools, constitutionTools).map((e) => `${label}: ${e}`),
    );
  }
  if (Array.isArray(manifest?.okf_rooms)) {
    errors.push(
      ...checkSubset("okf_rooms", manifest.okf_rooms, domainRooms, constitutionRooms).map((e) => `${label}: ${e}`),
    );
    if (matrix) {
      errors.push(...checkRoomResolution(manifest.okf_rooms, matrix).map((e) => `${label}: ${e}`));
    }
  }
  errors.push(...checkAdvisoryArchetype(manifest, label));
  return { ok: errors.length === 0, errors };
}

// ── Stage Inputs okf: markers (ADR-0104 decision 5) ─────────────────────────

/** Extract the unique entity names from `okf:<entity>` markers in a stage file. */
export function extractStageOkfMarkers(stageText) {
  const out = new Set();
  let m;
  STAGE_OKF_MARKER_RE.lastIndex = 0;
  while ((m = STAGE_OKF_MARKER_RE.exec(stageText)) !== null) out.add(m[1]);
  return [...out].sort();
}

/**
 * A stage may only ground on entities the workflow declared in okf_rooms. Every
 * `okf:E` marker found in a stage must be in the manifest's okf_rooms allow-list
 * (grounding outside the declared rooms is a least-privilege violation). The
 * matrix-resolution of okf_rooms itself is handled by checkRoomResolution.
 * @param {string[]} markers       entities grounded by the stage (from okf: markers)
 * @param {string[]} workflowRooms the manifest's okf_rooms
 * @param {string} stageLabel      path for messages
 * @returns {string[]} violations
 */
export function checkStageMarkers(markers, workflowRooms, stageLabel) {
  const allow = new Set(workflowRooms);
  const errs = [];
  for (const e of markers) {
    if (!allow.has(e)) {
      errs.push(
        `${stageLabel}: stage grounds on 'okf:${e}' but '${e}' is not in the workflow's ` +
          `okf_rooms allow-list — a stage may only load concepts the manifest declares (ADR-0104 §5)`,
      );
    }
  }
  return errs;
}

// ── The executive tier: reports_to + delegate-only (#1535 / #1536) ──────────
// Above icm/domains/ sits icm/executive/<role>/: one orchestrator + 5 C-suite
// agents, each a room.yaml with the same {tools, okf_rooms} shape PLUS a
// reports_to scalar. The org tree is data in icm/org.yaml; these two checks make
// the structure a gate, not just documentation (CONSTITUTION.md §9).

export const EXEC_DIR = "icm/executive";
export const DOMAINS_DIR = "icm/domains";
export const ORCHESTRATOR_SLUG = "orchestrator";
// The executive tier is delegate-only: an executive room.yaml may grant only
// these — no actuation tool — so the ADR-0128 L2 ceiling is structural (#1535).
export const ALLOWED_EXECUTIVE_TOOLS = [
  "pg.read",
  "knowledge.search",
  "memory.recall",
  "delegate",
  "handoff",
];

/**
 * Every domain/executive room must report to a valid manager. Domains report to
 * a C-suite role (an icm/executive/<role>/ dir, excluding the orchestrator);
 * executives report to the orchestrator; the orchestrator reports to no one.
 * @param {object} o
 * @param {"domain"|"executive"} o.tier
 * @param {string} o.slug            the dir name (domain or executive role)
 * @param {string|null} o.reportsTo  the room.yaml reports_to value (null if absent)
 * @param {string[]} o.executiveSlugs  C-suite role slugs (exec dirs minus orchestrator)
 * @returns {string[]} violations ([] == resolves)
 */
export function checkReportsTo({ tier, slug, reportsTo, executiveSlugs }) {
  const errs = [];
  if (tier === "executive" && slug === ORCHESTRATOR_SLUG) {
    if (reportsTo) errs.push(`the orchestrator ('${slug}') is the top node and must not declare reports_to (got '${reportsTo}')`);
    return errs;
  }
  if (!reportsTo) {
    errs.push(`${tier} '${slug}' must declare reports_to in its room.yaml`);
    return errs;
  }
  if (tier === "executive") {
    if (reportsTo !== ORCHESTRATOR_SLUG) {
      errs.push(`executive '${slug}' must report to '${ORCHESTRATOR_SLUG}' (got '${reportsTo}')`);
    }
  } else {
    if (!executiveSlugs.includes(reportsTo)) {
      errs.push(
        `domain '${slug}' reports_to '${reportsTo}', which is not a C-suite role — ` +
          `must be one of ${JSON.stringify(executiveSlugs)} (an icm/executive/<role>/ dir)`,
      );
    }
  }
  return errs;
}

/**
 * The executive tier is delegate-only: no actuation tool may appear in an
 * executive room.yaml (the L2 ceiling is structural, #1535).
 * @param {string[]} execTools   the executive room.yaml tools
 * @param {string} label         path for messages
 * @param {string[]} [allowed]   the delegate-only allow-list
 * @returns {string[]} violations ([] == delegate-only)
 */
export function checkExecutiveDelegateOnly(execTools, label, allowed = ALLOWED_EXECUTIVE_TOOLS) {
  const allow = new Set(allowed);
  const errs = [];
  for (const t of execTools || []) {
    if (!allow.has(t)) {
      errs.push(
        `${label}: executive tier is delegate-only — tool '${t}' is an actuation/` +
          `direct tool not permitted at the executive tier (allowed: ${JSON.stringify(allowed)})`,
      );
    }
  }
  return errs;
}

// ── The advisory tier: read-only consultation desks (B10, CONSTITUTION.md §10) ──
// A workflow tagged `archetype: advisory` FIELDS a delegated domain question and
// returns a cited answer to the delegating agent — no actuation, no side effect,
// no send. The "no side effect" property is made structural, not a promise (the
// §9 delegate-only precedent applied at the workflow tier): an advisory workflow
// MUST be L0 and may carry only read-only retrieval tools.
export const ADVISORY_ARCHETYPE = "advisory";
export const ADVISORY_ALLOWED_TOOLS = ["pg.read", "knowledge.search", "memory.recall"];

/**
 * An advisory-archetype workflow is read-only by construction (CONSTITUTION §10):
 * autonomy_rung MUST be L0 and tools MUST be a subset of the read-only retrieval
 * set — no actuation tool (send.*, *.write, booking.link, delegate/handoff). L0 +
 * no-actuation makes "nothing to approve / no side effect" a gate, not a promise.
 * Only runs when the manifest declares `archetype: advisory`; absent = ordinary.
 * @param {object} manifest  the parsed agent.yaml
 * @param {string} label     path for messages
 * @param {string[]} [allowed] the read-only retrieval allow-list
 * @returns {string[]} violations ([] == conforms or not an advisory workflow)
 */
export function checkAdvisoryArchetype(manifest, label, allowed = ADVISORY_ALLOWED_TOOLS) {
  if (manifest?.archetype !== ADVISORY_ARCHETYPE) return [];
  const errs = [];
  if (manifest.autonomy_rung !== "L0") {
    errs.push(
      `${label}: advisory archetype is read-only — autonomy_rung must be 'L0' ` +
        `(got '${manifest.autonomy_rung}'); an advisory desk has nothing to actuate (CONSTITUTION §10).`,
    );
  }
  const allow = new Set(allowed);
  for (const t of manifest.tools || []) {
    if (!allow.has(t)) {
      errs.push(
        `${label}: advisory archetype is read-only — tool '${t}' is an actuation/direct tool ` +
          `not permitted in a consultation desk (allowed: ${JSON.stringify(allowed)}) (CONSTITUTION §10).`,
      );
    }
  }
  return errs;
}

// ── Minimal YAML reader (flow-style, no dependency) ─────────────────────────
// The manifests are deliberately simple: scalars, `[a, b]` flow sequences, and
// `- item` block sequences. We parse exactly that subset rather than add a YAML
// dependency. mcp_servers (rare, nested) fall back to being skipped by the
// reader and validated structurally only when present as a mapping list.

/** Parse a flow scalar: strip quotes, coerce nothing (all values stay strings). */
function scalar(raw) {
  const s = raw.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

/** Parse `[a, b, c]` or `[]` flow sequence into string[]. */
function flowSeq(raw) {
  const inner = raw.trim().replace(/^\[/, "").replace(/\]$/, "").trim();
  if (inner === "") return [];
  return inner.split(",").map((p) => scalar(p)).filter((p) => p !== "");
}

/**
 * Parse the agent.yaml subset into an object. Block sequences (`- x`) under a
 * key and flow sequences (`[x, y]`) both yield arrays.
 * @param {string} text raw file contents
 * @returns {object}
 */
export function parseAgentYaml(text) {
  const out = {};
  const lines = text.split(/\r?\n/);
  let curKey = null;
  for (let raw of lines) {
    const line = raw.replace(/\s+#.*$/, ""); // strip trailing comments
    if (line.trim() === "" || line.trim().startsWith("#")) continue;

    const block = line.match(/^\s*-\s+(.*)$/);
    if (block && curKey) {
      if (!Array.isArray(out[curKey])) out[curKey] = [];
      out[curKey].push(scalar(block[1]));
      continue;
    }

    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, rest] = kv;
    curKey = key;
    if (rest.trim() === "") {
      out[key] = undefined; // block sequence/mapping follows on indented lines
    } else if (rest.trim().startsWith("[")) {
      out[key] = flowSeq(rest);
    } else {
      out[key] = scalar(rest);
    }
  }
  return out;
}

// ── Tree resolution (CLI side) ───────────────────────────────────────────────
// Domain/Constitution budgets live in optional sibling files:
//   icm/CONSTITUTION.yaml      { tools: [...], okf_rooms: [...] }  (outer)
//   icm/domains/<d>/room.yaml  { tools: [...], okf_rooms: [...] }  (narrows)
// When absent, the budget is unconstrained-from-above for that tier and the
// check degrades to "no widening below an undeclared tier" — i.e. an absent
// Constitution budget means the domain bound is authoritative, and an absent
// domain budget means the agent's own list is its own bound (vacuously passes
// the subset, still fully shape-checked). This lets the schema + doc ship
// before the domain tier's budget files do (those land with the domain rooms).

function readBudget(path) {
  if (!existsSync(path)) return null;
  const obj = parseAgentYaml(readFileSync(path, "utf8"));
  return {
    tools: Array.isArray(obj.tools) ? obj.tools : [],
    okf_rooms: Array.isArray(obj.okf_rooms) ? obj.okf_rooms : [],
    reports_to: typeof obj.reports_to === "string" ? obj.reports_to : null,
  };
}

/** Directory names (with a room.yaml) directly under a root, sorted. */
function roomDirsUnder(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(root, e.name, "room.yaml")))
    .map((e) => e.name)
    .sort();
}

/** Recursively find every agent.yaml under a root. */
export function findAgentManifests(root) {
  const found = [];
  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.name === "agent.yaml") found.push(p);
    }
  };
  if (existsSync(root)) walk(root);
  return found;
}

function main() {
  const repoRoot = process.env.GITHUB_WORKSPACE || process.cwd();
  const icmRoot = join(repoRoot, ICM_DIR);
  const manifests = findAgentManifests(icmRoot);

  const constitution =
    readBudget(join(icmRoot, "CONSTITUTION.yaml")) || { tools: null, okf_rooms: null };

  // Coverage matrix (#702): resolve okf_rooms against the canonical OKF map. When
  // absent (should not happen in this repo), room resolution is skipped — the
  // shape + subset checks still run.
  const matrixPath = join(repoRoot, COVERAGE_MATRIX);
  const matrix = existsSync(matrixPath) ? parseCoverageMatrix(readFileSync(matrixPath, "utf8")) : null;
  if (!matrix) {
    console.log(`! ${COVERAGE_MATRIX} not found — skipping OKF room resolution (#702).`);
  }

  const allErrors = [];

  // ── Executive-tier conformance (#1535 / #1536): reports_to resolution +
  // delegate-only budgets. Runs over room.yaml files (not agent.yaml manifests),
  // so it holds even before a domain has any workflow. Manager slugs come from the
  // filesystem (icm/executive/<role>/), so org.yaml stays the human/GUI SoT while
  // the gate stays self-contained.
  const execSlugs = roomDirsUnder(join(repoRoot, EXEC_DIR));
  const cSuiteSlugs = execSlugs.filter((s) => s !== ORCHESTRATOR_SLUG);
  for (const slug of execSlugs) {
    const roomPath = join(repoRoot, EXEC_DIR, slug, "room.yaml");
    const budget = readBudget(roomPath) || { tools: [], okf_rooms: [], reports_to: null };
    const label = relative(repoRoot, roomPath).replace(/\\/g, "/");
    allErrors.push(
      ...checkReportsTo({ tier: "executive", slug, reportsTo: budget.reports_to, executiveSlugs: cSuiteSlugs }).map((e) => `${label}: ${e}`),
    );
    allErrors.push(...checkExecutiveDelegateOnly(budget.tools, label));
    if (matrix && Array.isArray(budget.okf_rooms)) {
      allErrors.push(...checkRoomResolution(budget.okf_rooms, matrix).map((e) => `${label}: ${e}`));
    }
  }
  for (const slug of roomDirsUnder(join(repoRoot, DOMAINS_DIR))) {
    const roomPath = join(repoRoot, DOMAINS_DIR, slug, "room.yaml");
    const budget = readBudget(roomPath) || { tools: [], okf_rooms: [], reports_to: null };
    const label = relative(repoRoot, roomPath).replace(/\\/g, "/");
    allErrors.push(
      ...checkReportsTo({ tier: "domain", slug, reportsTo: budget.reports_to, executiveSlugs: cSuiteSlugs }).map((e) => `${label}: ${e}`),
    );
  }

  for (const file of manifests) {
    const manifest = parseAgentYaml(readFileSync(file, "utf8"));
    // Domain budget: the manifest sits at icm/domains/<d>/<wf>/agent.yaml.
    const domainDir = dirname(dirname(file));
    const domain = readBudget(join(domainDir, "room.yaml")) || { tools: null, okf_rooms: null };

    // The domain's own room.yaml rooms must also resolve (catches a typo in the
    // budget itself, not only in a workflow that happens to narrow to it).
    if (matrix && Array.isArray(domain.okf_rooms)) {
      const domainLabel = relative(repoRoot, join(domainDir, "room.yaml")).replace(/\\/g, "/");
      allErrors.push(...checkRoomResolution(domain.okf_rooms, matrix).map((e) => `${domainLabel}: ${e}`));
    }

    // Undeclared upper tier => that tier's bound is the next-lower declared list
    // (no widening possible against an absent allow-list).
    const cTools = constitution.tools;
    const cRooms = constitution.okf_rooms;
    const dTools = domain.tools ?? (Array.isArray(manifest.tools) ? manifest.tools : []);
    const dRooms = domain.okf_rooms ?? (Array.isArray(manifest.okf_rooms) ? manifest.okf_rooms : []);

    const label = relative(repoRoot, file).replace(/\\/g, "/");
    const { errors } = evaluateManifest({
      manifest,
      domainTools: dTools,
      domainRooms: dRooms,
      constitutionTools: cTools ?? dTools,
      constitutionRooms: cRooms ?? dRooms,
      matrix,
      label,
    });
    allErrors.push(...errors);

    // The domain persona must be composed (ADR-0088 §2): the domain-dir `.md`
    // files that are not room.md are the runtime persona(s); a workflow must
    // compose one. Only enforced once the domain has a persona file.
    const domainPersonaFiles = readdirSync(domainDir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".md") && e.name !== "room.md")
      .map((e) => e.name);
    allErrors.push(
      ...checkPersonaComposed(manifest.system_compose, domainPersonaFiles).map((e) => `${label}: ${e}`),
    );

    // ADR-0104 §5: a stage's `okf:` markers must be within the workflow's okf_rooms.
    const stagesDir = join(dirname(file), "stages");
    if (existsSync(stagesDir) && Array.isArray(manifest.okf_rooms)) {
      for (const ent of readdirSync(stagesDir, { withFileTypes: true })) {
        if (!ent.isDirectory()) continue;
        const stageCtx = join(stagesDir, ent.name, "CONTEXT.md");
        if (!existsSync(stageCtx)) continue;
        const markers = extractStageOkfMarkers(readFileSync(stageCtx, "utf8"));
        const stageLabel = relative(repoRoot, stageCtx).replace(/\\/g, "/");
        allErrors.push(...checkStageMarkers(markers, manifest.okf_rooms, stageLabel));
      }
    }
  }

  if (allErrors.length === 0) {
    const roomNote = matrix ? " + okf_rooms resolve to the coverage matrix" : "";
    console.log(
      `✓ icm-conformance: ${manifests.length} manifest(s) conform ` +
        `(shape + workflow ⊆ domain ⊆ Constitution${roomNote}).`,
    );
    process.exit(0);
  }
  const msg = "icm-conformance failures (ADR-0088 §2-3; #702):\n" + allErrors.map((e) => `  • ${e}`).join("\n");
  console.error(`::error::${msg.replace(/\n/g, "%0A")}`);
  console.error(msg);
  process.exit(1);
}

// Run only when invoked directly, not when imported by the test suite.
if (process.argv[1] && resolve(process.argv[1]).endsWith("agent-yaml-gate.mjs")) {
  main();
}
