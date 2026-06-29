// gen-org-graph.mjs — derive the org graph the /org viz (#1539) renders from the
// single SoT: icm/org.yaml + the icm/** manifests. NEVER hand-edit org-graph.json.
//
// WHY. The org tree (Nova → C-suite → domain agents → workflows → stages) is defined
// once in icm/org.yaml (the structure) + each agent's room.yaml (tools/okf_rooms budget,
// reports_to) + each workflow's agent.yaml + stages/ (the playbooks). Duplicating that
// into a DB schema (an `org_node` table) would be a second source of truth that drifts.
// Instead we GENERATE a static skeleton (src/data/org-graph.json) at build time and the
// /org page overlays live agent state (dial/kill-switch/pending/agent_run) from Postgres
// at request time. This script is the generator; it reuses the conformance gate's zero-dep
// YAML reader (parseAgentYaml) for the block-style room.yaml budgets.
//
// org.yaml uses two YAML shapes the gate's reader does NOT cover — a block-map list under
// `executives:` and an inline flow-map list under `domains:` — so this file carries a small
// purpose-built parser for exactly those (no new dependency; the controlled-file ethos of
// agent-yaml-gate.mjs / adr-index.mjs).
//
// Output is DETERMINISTIC (no timestamps) so regeneration only diffs when icm/ changes.
//
// Usage:
//   node scripts/gen-org-graph.mjs           # write src/data/org-graph.json
//   node scripts/gen-org-graph.mjs --check   # verify the committed file is up to date (CI)

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAgentYaml } from "./agent-yaml-gate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ORG_YAML = join(ROOT, "icm", "org.yaml");
const OUT = join(ROOT, "src", "data", "org-graph.json");

// ── org.yaml mini-parser ─────────────────────────────────────────────────────
// Handles exactly org.yaml's shapes: a top-level `orchestrator:` block map, an
// `executives:` list of block maps, and a `domains:` list of inline flow maps.

/** Strip quotes from a scalar; coerce `true`/`false` to boolean, leave the rest as string. */
function scalar(raw) {
  const s = raw.trim().replace(/\s+#.*$/, "").trim();
  const unq =
    (s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))
      ? s.slice(1, -1)
      : s;
  if (unq === "true") return true;
  if (unq === "false") return false;
  return unq;
}

/** Parse `[a, b]` flow sequence → string[]. */
function flowSeq(raw) {
  const inner = raw.trim().replace(/^\[/, "").replace(/\]$/, "").trim();
  return inner === "" ? [] : inner.split(",").map((p) => scalar(p)).filter((p) => p !== "");
}

/** Parse the body of an inline `{ k: v, k2: [a,b], ... }` flow map → object. */
function flowMap(raw) {
  const inner = raw.trim().replace(/^\{/, "").replace(/\}$/, "").trim();
  const out = {};
  // Split on commas that are NOT inside [...] and NOT inside a quoted string (so
  // `domains: [a, b]` stays one pair and `summary: "a, b"` stays one value).
  const parts = [];
  let depth = 0;
  let quote = null;
  let buf = "";
  for (const ch of inner) {
    if (quote) {
      if (ch === quote) quote = null;
      buf += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
      continue;
    }
    if (ch === "[") depth++;
    if (ch === "]") depth--;
    if (ch === "," && depth === 0) {
      parts.push(buf);
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf.trim() !== "") parts.push(buf);
  for (const part of parts) {
    const idx = part.indexOf(":");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const rest = part.slice(idx + 1).trim();
    out[key] = rest.startsWith("[") ? flowSeq(rest) : scalar(rest);
  }
  return out;
}

/** Parse icm/org.yaml into { orchestrator, executives[], domains[], humans[] }. */
function parseOrgYaml(text) {
  const lines = text.split(/\r?\n/);
  const result = { orchestrator: {}, executives: [], domains: [], humans: [] };
  let section = null; // 'orchestrator' | 'executives' | 'domains' | 'humans'
  let curExec = null;

  for (const raw of lines) {
    const line = raw.replace(/\s+#.*$/, "");
    if (line.trim() === "" || line.trim().startsWith("#")) continue;

    // Top-level section headers (column 0, `key:` with nothing after).
    const top = line.match(/^([A-Za-z0-9_]+):\s*$/);
    if (top) {
      section = top[1];
      curExec = null;
      continue;
    }

    if (section === "orchestrator") {
      const kv = line.match(/^\s+([A-Za-z0-9_]+):\s*(.*)$/);
      if (kv) result.orchestrator[kv[1]] = scalar(kv[2]);
      continue;
    }

    if (section === "executives") {
      const item = line.match(/^\s*-\s*([A-Za-z0-9_]+):\s*(.*)$/);
      if (item) {
        curExec = {};
        result.executives.push(curExec);
        curExec[item[1]] = scalar(item[2]);
        continue;
      }
      const kv = line.match(/^\s+([A-Za-z0-9_]+):\s*(.*)$/);
      if (kv && curExec) {
        curExec[kv[1]] = kv[2].trim().startsWith("[") ? flowSeq(kv[2]) : scalar(kv[2]);
      }
      continue;
    }

    if (section === "domains") {
      const item = line.match(/^\s*-\s*(\{.*\})\s*$/);
      if (item) result.domains.push(flowMap(item[1]));
      continue;
    }

    if (section === "humans") {
      const item = line.match(/^\s*-\s*(\{.*\})\s*$/);
      if (item) result.humans.push(flowMap(item[1]));
      continue;
    }
  }
  return result;
}

// ── budget + workflow walk (reuse the gate's block-style reader) ─────────────

/** room.yaml → { reportsTo, tools[], okfRooms[] }; defensive when absent. */
function readRoom(dir) {
  const path = join(ROOT, dir, "room.yaml");
  if (!existsSync(path)) return { reportsTo: null, tools: [], okfRooms: [] };
  const o = parseAgentYaml(readFileSync(path, "utf8"));
  return {
    reportsTo: typeof o.reports_to === "string" ? o.reports_to : null,
    tools: Array.isArray(o.tools) ? o.tools : [],
    okfRooms: Array.isArray(o.okf_rooms) ? o.okf_rooms : [],
  };
}

/** Each subdir of `dir` holding an agent.yaml is a workflow; list its ordered stages. */
function readWorkflows(dir) {
  const base = join(ROOT, dir);
  if (!existsSync(base)) return [];
  const workflows = [];
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const wfDir = join(base, entry.name);
    if (!existsSync(join(wfDir, "agent.yaml"))) continue;
    const stagesDir = join(wfDir, "stages");
    const stages = existsSync(stagesDir)
      ? readdirSync(stagesDir, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name)
          .sort()
      : [];
    workflows.push({ slug: entry.name, stages });
  }
  return workflows.sort((a, b) => a.slug.localeCompare(b.slug));
}

// ── build the graph ──────────────────────────────────────────────────────────

function build() {
  const org = parseOrgYaml(readFileSync(ORG_YAML, "utf8"));
  const nodes = [];
  const edges = [];

  // Orchestrator (apex; reports to no one).
  const o = org.orchestrator;
  const oRoom = readRoom(o.dir);
  nodes.push({
    id: o.role,
    kind: "orchestrator",
    persona: o.persona ?? null,
    reportsTo: null,
    humanManager: o.human_manager ?? null,
    ceiling: o.ceiling ?? null,
    serves: o.serves ?? null,
    division: null,
    title: o.title ?? null,
    summary: o.summary ?? null,
    built: true,
    memberDomains: [],
    tools: oRoom.tools,
    okfRooms: oRoom.okfRooms,
    workflows: readWorkflows(o.dir),
  });

  // Executives (report to the orchestrator).
  for (const e of org.executives) {
    const room = readRoom(e.dir);
    nodes.push({
      id: e.role,
      kind: "executive",
      persona: e.persona ?? null,
      reportsTo: e.reports_to ?? o.role,
      humanManager: e.human_manager ?? null,
      ceiling: e.ceiling ?? null,
      serves: e.serves ?? null,
      division: e.division ?? null,
      title: e.title ?? null,
      summary: e.summary ?? null,
      built: true,
      memberDomains: Array.isArray(e.domains) ? e.domains : [],
      tools: room.tools,
      okfRooms: room.okfRooms,
      workflows: readWorkflows(e.dir),
    });
    edges.push({ from: e.reports_to ?? o.role, to: e.role });
  }

  // Domain agents (report to a C-suite role).
  for (const d of org.domains) {
    const dir = `icm/domains/${d.domain}`;
    const room = readRoom(dir);
    nodes.push({
      id: d.domain,
      kind: "domain",
      persona: d.persona ?? null,
      reportsTo: d.reports_to ?? room.reportsTo ?? null,
      humanManager: d.human_manager ?? null,
      ceiling: d.ceiling ?? null,
      serves: null,
      division: null,
      title: d.title ?? null,
      summary: d.summary ?? null,
      built: d.built === true,
      memberDomains: [],
      tools: room.tools,
      okfRooms: room.okfRooms,
      workflows: readWorkflows(dir),
    });
    if (d.reports_to) edges.push({ from: d.reports_to, to: d.domain });
  }

  // The human org layer (the 7 staff). Kept PARALLEL to nodes/edges (not in the
  // agent tree) so the "one orchestrator root + |nodes|-1 edges" invariant holds;
  // agents point in via node.humanManager. `reports_to: null` (top) parses to the
  // literal string "null" via the flow-map reader — coerce it back to null here.
  const humans = org.humans.map((h) => ({
    key: h.key,
    name: h.name ?? null,
    role: h.role ?? null,
    title: h.title ?? null,
    summary: h.summary ?? null,
    reportsTo: h.reports_to && h.reports_to !== "null" ? h.reports_to : null,
  }));

  return {
    _generated: "scripts/gen-org-graph.mjs from icm/org.yaml + icm/** — DO NOT EDIT BY HAND",
    orchestrator: o.role,
    nodes,
    edges,
    humans,
  };
}

function main() {
  const graph = build();
  const json = JSON.stringify(graph, null, 2) + "\n";
  const check = process.argv.includes("--check");
  if (check) {
    const current = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
    if (current !== json) {
      console.error(
        "org-graph.json is stale — run `npm run gen:org-graph` and commit src/data/org-graph.json.",
      );
      process.exit(1);
    }
    console.log(`org-graph.json up to date (${graph.nodes.length} nodes).`);
    return;
  }
  writeFileSync(OUT, json);
  console.log(`Wrote ${OUT} (${graph.nodes.length} nodes, ${graph.edges.length} edges).`);
}

main();
