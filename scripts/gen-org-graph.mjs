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
const OUT_PROC = join(ROOT, "src", "data", "agent-procedures.json");

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

// ── procedure + step detail walk (the /org/[agentId] surface, #1612) ─────────
// Parse each workflow's agent.yaml (manifest) + CONTEXT.md (routing) + every
// stages/NN/CONTEXT.md (the step contract) into a render-ready shape. Kept in a
// SEPARATE artifact (src/data/agent-procedures.json) loaded server-side only, so
// the rich prose never bloats the /org client bundle. The markdown shape is the
// controlled house format (icm/CONVENTIONS.md); this is a purpose-built reader for
// exactly it (the zero-dep ethos of agent-yaml-gate.mjs / this file's org parser).

/** Split a CONTEXT.md into a preamble + `## Section` blocks keyed by a slug. */
function splitSections(md) {
  const out = { _preamble: [] };
  let cur = "_preamble";
  for (const line of md.split(/\r?\n/)) {
    const h = line.match(/^##\s+(.*)$/);
    if (h) {
      cur = h[1].trim().toLowerCase().replace(/[^a-z]/g, "");
      out[cur] = [];
      continue;
    }
    out[cur].push(line);
  }
  return out;
}

/** Pull `**Field:** value` (value may wrap to the blank line) from preamble lines. */
function boldField(lines, field) {
  const text = lines.join("\n");
  const re = new RegExp(`\\*\\*${field}:\\*\\*\\s*([\\s\\S]*?)(?:\\n\\s*\\n|$)`);
  const m = text.match(re);
  return m ? m[1].replace(/\s+/g, " ").trim() : null;
}

/** Numbered `## Process` list → [{ tag, text }]; tag = the leading `[script]` marker. */
function parseProcess(lines) {
  const steps = [];
  let cur = null;
  const push = () => {
    if (cur == null) return;
    const t = cur.trim();
    const m = t.match(/^`\[([a-z-]+)\]`\s*([\s\S]*)$/);
    steps.push(
      m
        ? { tag: m[1], text: m[2].replace(/\s+/g, " ").trim() }
        : { tag: null, text: t.replace(/\s+/g, " ").trim() },
    );
    cur = null;
  };
  for (const raw of lines) {
    const m = raw.match(/^\s*\d+\.\s+(.*)$/);
    if (m) {
      push();
      cur = m[1];
    } else if (cur != null && raw.trim() !== "") {
      cur += " " + raw.trim();
    }
  }
  push();
  return steps;
}

/** A markdown pipe-table → { headers[], rows[][] } (separator + blank rows dropped). */
function parseTable(lines) {
  const cellRows = lines
    .filter((l) => l.trim().startsWith("|"))
    .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()))
    .filter((cells) => !cells.every((c) => c === "" || /^:?-+:?$/.test(c)));
  if (cellRows.length === 0) return { headers: [], rows: [] };
  return { headers: cellRows[0], rows: cellRows.slice(1) };
}

/** `- [ ] check` / `- [x] check` lines → ["check", …]. */
function parseChecklist(lines) {
  return lines
    .map((l) => l.match(/^\s*-\s*\[[ xX]?\]\s*(.*)$/))
    .filter(Boolean)
    .map((m) => m[1].trim());
}

/** Join a section's non-blank lines into one trimmed paragraph (Outputs / Checkpoint). */
function joinProse(lines) {
  return (lines ?? []).join("\n").replace(/\s+/g, " ").trim();
}

/** One stages/NN-name/CONTEXT.md → the step contract. */
function readStage(stagesDir, slug) {
  const path = join(stagesDir, slug, "CONTEXT.md");
  const empty = {
    slug,
    name: slug.replace(/^\d+-/, ""),
    job: null,
    process: [],
    inputs: { headers: [], rows: [] },
    outputs: null,
    audit: [],
    checkpoint: null,
  };
  if (!existsSync(path)) return empty;
  const sec = splitSections(readFileSync(path, "utf8"));
  const titleLine = sec._preamble.find((l) => /^#\s+/.test(l)) ?? "";
  const name =
    titleLine
      .replace(/^#\s+/, "")
      .replace(/^Stage\s+\d+\s*[—-]\s*/i, "")
      .replace(/·.*$/, "")
      .trim() || slug.replace(/^\d+-/, "");
  return {
    slug,
    name,
    job: boldField(sec._preamble, "Job"),
    process: parseProcess(sec.process ?? []),
    inputs: parseTable(sec.inputs ?? []),
    outputs: joinProse(sec.outputs) || null,
    audit: parseChecklist(sec.audit ?? []),
    checkpoint: sec.checkpoint ? joinProse(sec.checkpoint) || null : null,
  };
}

/** Each workflow dir → manifest settings + routing + the ordered step contracts. */
function readProcedures(dir) {
  const base = join(ROOT, dir);
  if (!existsSync(base)) return [];
  const procs = [];
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const wfDir = join(base, entry.name);
    const manifestPath = join(wfDir, "agent.yaml");
    if (!existsSync(manifestPath)) continue;
    const m = parseAgentYaml(readFileSync(manifestPath, "utf8"));
    const ctxPath = join(wfDir, "CONTEXT.md");
    const ctx = existsSync(ctxPath)
      ? splitSections(readFileSync(ctxPath, "utf8"))
      : { _preamble: [] };
    const titleLine = ctx._preamble.find((l) => /^#\s+/.test(l)) ?? "";
    const stagesDir = join(wfDir, "stages");
    const stageSlugs = existsSync(stagesDir)
      ? readdirSync(stagesDir, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name)
          .sort()
      : [];
    procs.push({
      slug: entry.name,
      title: titleLine.replace(/^#\s+/, "").replace(/^Workflow:\s*/i, "").trim() || entry.name,
      job: boldField(ctx._preamble, "Job"),
      trigger: boldField(ctx._preamble, "Trigger"),
      model: typeof m.model === "string" ? m.model : null,
      autonomyRung: typeof m.autonomy_rung === "string" ? m.autonomy_rung : null,
      autoMaySelfApprove:
        typeof m.auto_may_self_approve === "string" ? m.auto_may_self_approve : null,
      tools: Array.isArray(m.tools) ? m.tools : [],
      okfRooms: Array.isArray(m.okf_rooms) ? m.okf_rooms : [],
      skills: Array.isArray(m.skills) ? m.skills : [],
      stages: stageSlugs.map((s) => readStage(stagesDir, s)),
    });
  }
  return procs.sort((a, b) => a.slug.localeCompare(b.slug));
}

/** agentId → { persona, kind, procedures[] } for every node in the graph. */
function buildProcedures(graph) {
  const dirFor = (node) => {
    if (node.kind === "domain") return `icm/domains/${node.id}`;
    if (node.kind === "orchestrator") return "icm/executive/orchestrator";
    return `icm/executive/${node.id}`;
  };
  const agents = {};
  for (const node of graph.nodes) {
    agents[node.id] = {
      id: node.id,
      persona: node.persona,
      kind: node.kind,
      procedures: readProcedures(dirFor(node)),
    };
  }
  return {
    _generated: "scripts/gen-org-graph.mjs from icm/** — DO NOT EDIT BY HAND",
    agents,
  };
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
  const procedures = buildProcedures(graph);
  const artifacts = [
    { path: OUT, label: "org-graph.json", json: JSON.stringify(graph, null, 2) + "\n" },
    {
      path: OUT_PROC,
      label: "agent-procedures.json",
      json: JSON.stringify(procedures, null, 2) + "\n",
    },
  ];

  if (process.argv.includes("--check")) {
    for (const a of artifacts) {
      const current = existsSync(a.path) ? readFileSync(a.path, "utf8") : "";
      if (current !== a.json) {
        console.error(
          `${a.label} is stale — run \`npm run gen:org-graph\` and commit src/data/${a.label}.`,
        );
        process.exit(1);
      }
    }
    const stageCount = Object.values(procedures.agents).reduce(
      (n, a) => n + a.procedures.reduce((m, p) => m + p.stages.length, 0),
      0,
    );
    console.log(
      `org-graph.json up to date (${graph.nodes.length} nodes); agent-procedures.json up to date (${stageCount} stages).`,
    );
    return;
  }

  for (const a of artifacts) writeFileSync(a.path, a.json);
  console.log(
    `Wrote ${OUT} (${graph.nodes.length} nodes, ${graph.edges.length} edges) + ${OUT_PROC}.`,
  );
}

main();
