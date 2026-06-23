---
type: Reference Table
title: agent_tool_grant
entity: agent_tool_grant
archetype: H
description: Per-agent tool allow-list — which tool each registered agent may invoke, with an optional scope. The tool-routing authority ADR-0104 points at (OKF grounds; this grants).
resource: ../../../decision-records/ADR-0087-agent-orchestration-and-observability-layer.md
tags: [reference, config, agent, governance, tool-routing]
data_class: operational
timestamp: 2026-06-22T00:00:00Z
---

# agent_tool_grant

The per-agent **tool allow-list**: one row per `(agent, tool)` the agent is permitted to
invoke, plus an optional `scope` narrowing how. This is the **tool-routing authority** —
the half OKF deliberately is *not* ([ADR-0104](../../../decision-records/ADR-0104-okf-orchestrator-grounding-cortex.md):
OKF grounds on meaning; tool selection lives here + `coverage-matrix.md`). Governed by the
agent orchestration layer ([ADR-0087](../../../decision-records/ADR-0087-agent-orchestration-and-observability-layer.md);
agent platform [ADR-0091](../../../decision-records/ADR-0091-agent-icm-platform-consolidated.md)).
Sibling config: `agent`, `agent_settings` (migration 0056).

## Source of record / authority

**The website is the system of record** (admin-managed agent config; no external merge).
A grant is **deny-by-default**: the orchestrator may invoke a tool for an agent only when a
matching row exists. `scope` (jsonb) further constrains the grant (e.g. allowed providers,
read-vs-write) and is the contract a stage reads before acting — least privilege per
[ADR-0087](../../../decision-records/ADR-0087-agent-orchestration-and-observability-layer.md).
Changes are audited via `agent_run`/`agent_message` (the run ledger).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `agent_id` | uuid | NOT NULL — FK → `agent` (ON DELETE CASCADE) |
| `tool` | text | NOT NULL — the tool/skill identifier the agent may invoke |
| `scope` | jsonb | NOT NULL default `{}` — narrows the grant (providers, read/write, limits); the constraint a stage reads |

UNIQUE `(agent_id, tool)` — one grant per agent-tool pair.

## Joins

- `agent_id` → `agent` (the grantee). Siblings under the same agent: `agent_settings`
  (preset/budget), `agent_autopilot_policy` (the autonomy rung the agent reads, ADR-0087).
- **Consumed by** the orchestrator/ICM at tool-selection time — an ICM stage resolves
  *entity → its sources → the source registry's sanctioned skill* (ADR-0104 decision 2),
  then checks this allow-list before invoking. Every invocation is recorded in the
  `agent_run` ledger.

## Notes

No PII — pure config. `scope` may name providers but never holds a secret (tokens are
Key-Vault-by-reference via `connection`, ADR-0103). Resolve specific grants against the
live read-only DB.
