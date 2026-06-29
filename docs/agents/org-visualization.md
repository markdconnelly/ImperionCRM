# The org visualization (`/org`)

How the Imperion OS agent org is made *visually followable* — Nova → the C-suite →
domain agents → playbooks → stages — on one surface, with the live autonomy dial and
approval queue overlaid.

[← The AI suite](README.md) · Issue #1539 · Epic #1534 · Governing decision:
[ADR #1535](../decision-records/ADR-0131-executive-suite-tier.md) (Executive-Suite tier) ·
Org SoT: [`icm/org.yaml`](../../icm/org.yaml).

---

## 1. Why this surface exists

The org recast (epic #1534) built a 26-agent org: one orchestrator (Nova), five C-suite
executives, and the domain agents under them, each with a tool/room budget and a library
of playbooks (workflows → stages). That structure is **defined as data** in `icm/org.yaml`
plus each agent's `room.yaml` and workflow `agent.yaml`/`stages/`. `/org` makes it
**visually followable** and bolts the **live agent state** (autonomy rung, actuation dial,
mark-gated legs, pending approvals) onto the same picture — the GUI requirement that the
settings and structure being built be clearly illustrated.

## 2. Single source of truth — no duplicate `org_node` schema

The structure is **derived**, never re-entered. `scripts/gen-org-graph.mjs` parses
`icm/org.yaml` (the orchestrator → executives → domains tree) and walks `icm/**` for each
agent's `room.yaml` (tool + OKF-room budget, `reports_to`) and its workflow dirs (each
`agent.yaml` + ordered `stages/`), emitting a deterministic skeleton to
**`src/data/org-graph.json`**:

```
node = { id, kind: orchestrator|executive|domain, persona, reportsTo, ceiling,
         serves, division, built, memberDomains, tools[], okfRooms[],
         workflows[{ slug, stages[] }] }
```

- The generator **reuses the conformance gate's zero-dep YAML reader** (`parseAgentYaml`
  in `scripts/agent-yaml-gate.mjs`) for the block-style `room.yaml`, and carries a small
  purpose-built parser for `org.yaml`'s two shapes the gate's reader doesn't cover (the
  `executives:` block-map list and the `domains:` inline flow-map list). No new YAML
  dependency — the controlled-file ethos of `agent-yaml-gate.mjs` / `adr-index.mjs`.
- Output is **deterministic** (no timestamps) so regeneration only diffs when `icm/`
  changes. Regenerate with `npm run gen:org-graph`.
- **Freshness is gated by `test`:** `scripts/gen-org-graph.test.mjs` runs the generator's
  `--check` (and asserts the tree invariants — one apex, every `reportsTo` resolves, one
  edge per non-root node). A manifest change that isn't regenerated fails CI — the same
  contract as `adr-index`, without touching the CI workflow.

## 3. The page

`src/app/(app)/org/page.tsx` (server component, `force-dynamic`) loads the skeleton and
the live overlay, then renders the react-flow canvas client component
(`src/components/org-tree/org-tree-viz.tsx`, `@xyflow/react` — the first graph lib in the
FE alongside recharts).

- **Canvas** — a tidy top-down tree (orchestrator → executives → domains). Each executive
  card collapses/expands its division; node colour encodes kind, badges encode live state
  (rung, dial, gated, pending). Read-only (no drag/connect) — it visualizes, it doesn't edit.
- **Side panel** — clicking a node opens the structure/settings browser for it: persona,
  ceiling, serves/reports-to, built vs scaffold, the live-state chips, the **tool budget**
  and **OKF rooms**, and the **playbook library** (each workflow → its ordered stages). This
  is the "one surface" — the map and the settings browser are the same view (Q-B).

## 4. The live overlay (defensive, read-only)

`src/lib/org/data.ts` (`readOrgLiveState`) overlays live agent state, read straight from
Postgres (the FE is GUI-only, ADR-0042 — direct reads for rendering are fine). Every read
is wrapped: a missing table or unreachable DB degrades to the **dormant skeleton**
(`live: false`) rather than failing the page (ADR-0007). Signals, keyed by `agent_key`
(best-effort matched to a node id / persona):

| Signal | Source |
|---|---|
| Autonomy rung (L0–L3) + mark-gated | `agent_autopilot_policy` (0123) |
| Actuation dial (1–5) | `agent_action_autonomy` (0158) |
| Pending approvals | `agent_pending_action` (0158, `status='pending'`) |
| 7-day run + spend summary (global) | `agent_run` (0056) — uuid-keyed, so summary-only |

The file-defined org agents have no `agent` table row yet (they ship **propose-only** until
the retrieval substrate hydrates), so `agent_run` feeds only the global activity strip, not
per-node stats. When nothing matches, a node shows "No live data (propose-only / dormant)" —
honest, never fabricated.

## 5. Access

Admin-gated by `canSeeAgentPages` — both the `/org` nav entry (top band, key `org`) and the
page guard — the same predicate as the `/agents` surfaces it visualizes.

## 6. Boundaries & follow-ups

- **Read-only in v1.** The canvas illustrates; changing a dial/grant stays on the existing
  agent surfaces (`/agents`, `/operator/*`) under their gates. Deep run traces stay in
  `/operator/events` + `/jarvis`.
- **On-canvas workflow/stage expansion** is rendered in the side panel in v1; promoting the
  playbook/stage levels onto the canvas itself is a follow-up.
- No secrets, no client PII — the graph is reference config (personas are personas, not
  persons); the live overlay surfaces counts/levels, never row-level data.
