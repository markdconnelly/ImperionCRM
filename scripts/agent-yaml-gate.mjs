// agent.yaml conformance gate (ADR-0088 / issue #699, part of epic #695).
//
// Validates every workspace `agent.yaml` manifest the backend loader (Backend
// #162) consumes against the CMA agent-object contract, and enforces the
// least-privilege subset invariant the loader cannot get from one file alone:
//
//     workflow.tools     ⊆ domain.tools     ⊆ Constitution
//     workflow.okf_rooms ⊆ domain.okf_rooms ⊆ Constitution
//
// (CONSTITUTION.md §3: "workflow ⊆ domain ⊆ Constitution"). The Constitution is
// the OUTER allow-list, the domain narrows it, the workflow narrows further;
// widening at any inner tier is a conformance failure.
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

export const VALID_MODELS = ["claude-opus-4-8", "claude-sonnet-4-5", "claude-haiku-4-5"];
export const VALID_RUNGS = ["L0", "L1", "L2", "L3"];
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

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

/**
 * Whole-manifest evaluation. All inputs plain data.
 * @param {object} o
 * @param {object} o.manifest        parsed agent.yaml
 * @param {string[]} o.domainTools   the owning domain's tool budget
 * @param {string[]} o.domainRooms   the owning domain's okf_rooms budget
 * @param {string[]} o.constitutionTools  Constitution outer tool allow-list
 * @param {string[]} o.constitutionRooms  Constitution outer room allow-list
 * @param {string} [o.label]         path/name for messages
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function evaluateManifest({
  manifest,
  domainTools,
  domainRooms,
  constitutionTools,
  constitutionRooms,
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
  }
  return { ok: errors.length === 0, errors };
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
  };
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

  if (manifests.length === 0) {
    console.log("✓ agent.yaml gate: no workspace manifests yet (domain tier not populated) — schema + validator in place.");
    process.exit(0);
  }

  const constitution =
    readBudget(join(icmRoot, "CONSTITUTION.yaml")) || { tools: null, okf_rooms: null };

  const allErrors = [];
  for (const file of manifests) {
    const manifest = parseAgentYaml(readFileSync(file, "utf8"));
    // Domain budget: the manifest sits at icm/domains/<d>/<wf>/agent.yaml.
    const domainDir = dirname(dirname(file));
    const domain = readBudget(join(domainDir, "room.yaml")) || { tools: null, okf_rooms: null };

    // Undeclared upper tier => that tier's bound is the next-lower declared list
    // (no widening possible against an absent allow-list).
    const cTools = constitution.tools;
    const cRooms = constitution.okf_rooms;
    const dTools = domain.tools ?? (Array.isArray(manifest.tools) ? manifest.tools : []);
    const dRooms = domain.okf_rooms ?? (Array.isArray(manifest.okf_rooms) ? manifest.okf_rooms : []);

    const { errors } = evaluateManifest({
      manifest,
      domainTools: dTools,
      domainRooms: dRooms,
      constitutionTools: cTools ?? dTools,
      constitutionRooms: cRooms ?? dRooms,
      label: relative(repoRoot, file).replace(/\\/g, "/"),
    });
    allErrors.push(...errors);
  }

  if (allErrors.length === 0) {
    console.log(`✓ agent.yaml gate: ${manifests.length} manifest(s) conform (shape + workflow ⊆ domain ⊆ Constitution).`);
    process.exit(0);
  }
  const msg = "agent.yaml conformance failures (ADR-0088 §2-3):\n" + allErrors.map((e) => `  • ${e}`).join("\n");
  console.error(`::error::${msg.replace(/\n/g, "%0A")}`);
  console.error(msg);
  process.exit(1);
}

// Run only when invoked directly, not when imported by the test suite.
if (process.argv[1] && resolve(process.argv[1]).endsWith("agent-yaml-gate.mjs")) {
  main();
}
