---
type: Control Table
title: agent_autopilot_policy
entity: agent_autopilot_policy
archetype: H
description: The data-driven autonomy dial — one current autonomy rung (L0–L3) + Mark-gate flag per (agent · workflow · plane). Archetype H app-native governance/config; ramping a rung is a data change, not a code change.
resource: ../../../decision-records/ADR-0087-agent-orchestration-and-observability-layer.md
tags: [config, governance, agents, autonomy, orchestration, archetype-h, app-native, horizontal]
data_class: operational
timestamp: 2026-06-22T00:00:00Z
---

# agent_autopilot_policy

The **autonomy dial**, stored as data: the current autonomy *rung* an orchestration agent
runs at, plus whether its sensitive legs still funnel to the single human queue. Governed by
[ADR-0087](../../../decision-records/ADR-0087-agent-orchestration-and-observability-layer.md)
(the orchestration & observability matrix), which makes **"autonomy is one dial, stored as
data"** load-bearing — ramping an agent after testing, or pulling it back, is a **data
change, not a code change**. Created by migration `0123`
([#721](https://github.com/markdconnelly/ImperionCRM/issues/721)). The roster of agents and
their target rungs lives in [orchestration-matrix](../../../agents/orchestration-matrix.md).

It is an **archetype H** (reference / config / governance) **app-native control table** — the
twin of `agent_settings` / `agent_tool_grant`, in the horizontal (Constitution-owned)
governance domain. It is **not** silver data, **not** pipeline-merged, and **not** the
similarly-named `autopilot_policies` (migration `0038`, an unrelated Intune Autopilot
device-posture *bronze* table — the name collision is exactly why this table is singular and
prefixed `agent_`).

## Source of record / authority

- **The website is the SoR for the dial.** Each row is the CURRENT autonomy rung for one
  `(agent_key, workflow_key, plane)` — set by an admin (or the Canon-steward agent) and read
  by every tier of the matrix. There is no external source; this is governance config the
  platform owns.
- **The rung ladder (lowest authority first):** `L0` observe (read-only) → `L1` draft
  (propose, hold for a human) → `L2` act-gated (idempotent write) → `L3` auto (autonomous).
- **`mark_gated` is orthogonal to the rung, not a fifth rung.** When set, the agent's
  customer-facing / money / prod-migration / deploy / X.0.0 legs still funnel to the single
  human queue (the 🔒 Mark-gate) **regardless of rung** — an `L3 + mark_gated` agent is
  autonomous *except* for those legs (ADR-0087 security impact).
- **Resolution is most-specific-wins:** a row whose `workflow_key` matches the requested
  workflow beats the `'*'` (agent-default) row. **No matching row ⇒ the safe default**
  (`L1` draft): gating is data, so "no opinion" must mean "stay conservative", never "more
  autonomy" (`src/lib/autonomy-dial.ts` `resolveRung`; a null policy also fails closed to
  gated).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | surrogate PK |
| `agent_key` | text | stable agent roster key (matches orchestration-matrix), e.g. `collections` · `lead-response` · `time-payroll`. Config key, **not** a person |
| `workflow_key` | text | the work-unit the rung scopes to, or `'*'` = the agent default for every workflow (a sentinel, not NULL — so it is a real row in the unique key) |
| `plane` | `agent_plane` enum | `icm` (product runtime) · `coding` (meta-layer) · `infra` (platform/SRE) — ADR-0087's two-planes-one-methodology |
| `rung` | `autonomy_rung` enum | `L0` observe · `L1` draft · `L2` act-gated · `L3` auto (default `L1`) |
| `mark_gated` | boolean | when true, sensitive legs funnel to the 🔒 human queue regardless of `rung` (default `false`) |
| `note` | text | optional human note on why the rung is where it is (e.g. "ramped to L2 after UAT"). Not PII |
| `created_at` / `updated_at` | timestamptz | dial timestamps |

Unique on `(agent_key, workflow_key, plane)` — one CURRENT rung per agent/workflow/plane;
re-ramping is an upsert on that key.

## Joins

- **No FKs.** `agent_key` / `workflow_key` are stable string keys into the orchestration
  roster (docs, not a table), kept loose on purpose so the dial can name an agent or workflow
  before any runtime row for it exists.
- **Consumers:** every tier of the [orchestration matrix](../../../agents/orchestration-matrix.md)
  reads its rung here (the ⚙️ dial that "governs every act"). The front-end read accessor is
  `agent.getAutonomyPolicy({ agentKey, workflowKey?, plane })` (returns null ⇒ caller uses
  the safe default); the `agents:operate`-gated write is a server action (admin-only). The
  **backend** orchestration agents read the rung to make their autonomy data-driven — e.g.
  the Collections AR-dunning agent (BE #156), today hardcoding an `L1` cap, will read it here
  (a separate backend follow-up). Run telemetry stays in `agent_run` (not this table).

## Notes

App-native governance/config — it holds **only** agent-config keys (`agent_key`,
`workflow_key`, `plane`) plus the rung/flag/note. **No PII, no client identifiers, no
secrets, no code knowledge.** `note` is an internal operational note (never a person or
client). Writes are gated by `agents:operate` (admin-only, ADR-0050/0030); reads-for-render
follow the ADR-0042 division of labor. Resolve any live rung value against the read-only DB
(CLAUDE.md §8) — this file is meaning, not data.
