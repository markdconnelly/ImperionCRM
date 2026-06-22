---
adr: 0109
title: "Actuation autonomy dial (1–5) + approval cockpit queue"
status: proposed
date: 2026-06-21
repo: frontend
summary: "Implement ADR-0107 D4/D5: a per-agent 1–5 actuation autonomy dial that resolves to an ADR-0055 tier ceiling, with above-ceiling actions routed to a native approval cockpit. Reconciles the new actuation dial with the existing L0–L3 ICM-orchestration rung (agent_autopilot_policy, 0123) as ONE dial CONCEPT over TWO planes: a dedicated agent_action_autonomy table (level 1–5 + tunable ceilings) for actuation, distinct from the ICM rung table; plus agent_pending_action as the cockpit queue. Fail-closed default level 1 keeps today's behavior (every send approved)."
tags: [meta, agents, security]
---

# ADR-0109: Actuation autonomy dial (1–5) + approval cockpit queue

> Number claimed at MERGE per system CLAUDE.md §10.3. The migration this ADR
> describes is authored against a placeholder and renumbered at merge.

| Field | Value |
|---|---|
| **Repo** | frontend (schema + this ADR); backend owns dial→ceiling routing + execute |
| **Status** | Proposed |
| **Date** | 2026-06-21 |
| **Epic** | #990 · slice 2E (#996) |
| **Cross-references** | ADR-0107 (governed action/tool-grant plane — D4 dial, D5 cockpit), ADR-0055 (autonomy tiers T0–T3), ADR-0087 (the one autonomy dial as data), ADR-0032 (propose/approve action path), migration 0056 (`agent_run`, `agent_tool_grant`), migration 0123 (`agent_autopilot_policy` — L0–L3 ICM rung) |

## Problem

ADR-0107 D4 specifies a **1–5 autonomy dial** per agent that maps to an ADR-0055 tier
ceiling: an action whose tier exceeds the ceiling routes to a **native approval cockpit**
(D5) instead of executing. D4 says the level "lives on `autopilot_policies`." But the only
such table, `agent_autopilot_policy` (0123, ADR-0087), is a **different dial**:

- It is keyed by **ICM roster `agent_key`** (`collections`, `lead-response`, …) × `workflow_key` × `plane`, and carries an **L0–L3 `rung`** (observe/draft/act-gated/auto) that gates an **ICM workflow act-leg** — not the actuation tier of an outbound action.
- Its `rung` is `NOT NULL` and load-bearing for the orchestration agents (e.g. BE #156 collections). Overloading that row with a nullable 1–5 actuation level would mix two unrelated axes on one key.

So "put the level on `autopilot_policies`" cannot be taken literally without conflating two distinct controls.

## Context

- **One dial is a *concept*, not necessarily one table** (ADR-0087). The canon is "autonomy is data an operator can see and move," not "exactly one row type." The ICM rung governs *workflow orchestration*; the ADR-0107 dial governs *action actuation* (tier → execute/cockpit). They are two planes of the same idea.
- **The actuation dial keys differently.** It is per acting agent (sub-agent name, or `*` global default) × action-class — not per ICM workflow. Forcing it onto the ICM-roster key is lossy.
- **The cockpit needs a persisted queue.** Today a `proposedAction` is returned synchronously to the chat caller and shown inline; nothing is persisted. A *native cockpit listing pending actions across agents* requires a durable queue row written at route time.
- **The CRM orchestrator does not write `agent_run` yet** (it writes `audit_log` `agent.turn`; ADR-0049 §6 defers the run-ledger move). ADR-0107 D4 says "record level/ceiling/routing on `agent_run`"; for this path that store is not populated, so we record the routing decision on the **pending-action row + `audit_log`** instead, and revisit once the orchestrator moves onto `agent_run`.

## Decision

**One dial concept, two planes, two coherent tables.**

### D1 — Dedicated actuation-dial table `agent_action_autonomy`
A new governance/control table (archetype H, the twin of `agent_autopilot_policy` and `agent_tool_grant`):

- Keyed `(agent_key, action_class)` — `agent_key` = acting sub-agent name or `'*'` (global default); `action_class` = `'*'` (default) or a specific action kind (e.g. `send_email`) for the per-action-class override D4 calls for.
- `level smallint NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5)` — **fail-closed at 1 (Manual)**: with no row and the default, only T0 runs unattended and every T1+ action routes to the cockpit, i.e. **today's behavior is unchanged** until an operator raises the dial.
- `ceilings jsonb NOT NULL DEFAULT '{}'` — the tunable level→tier boundaries (levels 1 & 5 are fixed by definition; 2–4 default per ADR-0107 and are overridable here without a schema change).

### D2 — Level → tier-ceiling resolution (pure, shared)
A pure helper resolves a level (+ optional `ceilings` override) to an ADR-0055 tier ceiling:
`1→T0` (approve everything above reads), `2→T1`, `3→T2`, `4→T3` (auto all, notify + undo), `5→T3` (silent). An action with `tier ≤ ceiling` executes inline; `tier > ceiling` routes to the cockpit. Fail-closed: an unknown level resolves to level 1.

### D3 — Cockpit queue `agent_pending_action`
A durable queue the backend writes when an action is routed above the ceiling: proposing `agent_key`, `action_kind`, `tier`, the execute `payload` (action + delivery), `rationale`, `target_contact_id`, the resolved `level`/`ceiling`, `status` (`pending|approved|rejected|executed|expired`), and decision provenance (`decided_by_user_id`, `decided_at`, `interaction_id`). The cockpit (D5/2E-4) reads it; approve/reject goes through the backend, which re-checks consent and runs the existing `agent/actions/execute` catalog (2C) — the ADR-0032 property preserved.

### D4 — Ownership / grants
Schema is front-end-owned (ADR-0042). The web role reads+writes the dial (operator slider via an `agents:operate`-gated server action, exactly like the 0123 dial) and **reads** the queue; the backend **reads** the dial (resolution at dispatch) and **writes** the queue (enqueue + decide/execute). No PII, no secrets — config keys + action payloads only (the payload carries a drafted body + target, same sensitivity as the existing proposedAction, never a credential).

## Options considered

1. **Overload `agent_autopilot_policy` with a nullable `autonomy_level`.** Pro: one table, literal reading of ADR-0107. Con: conflates the ICM rung axis (NOT-NULL, roster-keyed) with the actuation level (per-sub-agent/action-class); every ICM row grows a meaningless column and vice-versa.
2. **Dedicated `agent_action_autonomy` table (chosen).** Pro: each table stays coherent; correct keying; the ICM rung is untouched (no risk to BE #156). Con: two tables for "one dial" — mitigated by documenting them as two planes of one concept and resolving both from data.
3. **No persisted queue — keep actions inline-only.** Rejected: a *native cockpit across agents* (D5) is impossible without a durable, cross-run queue.

## Consequences

- **Safe by default.** Fail-closed level 1 means nothing auto-executes that didn't already require approval; the only day-one change is that an above-ceiling action can be *persisted to the cockpit* instead of only shown inline (backend wiring is 2E-2). The standing test-pool rule (no live sends until Mark opens the stage) is unaffected — consent + the executor still gate every send.
- **The tier label becomes load-bearing.** ADR-0055 tiers stop being decoration; the dial reads them.
- **Two dial tables coexist.** Future work may unify ICM rung + actuation level behind one operator surface; that is a separate decision, explicitly out of scope here.
- **`agent_run` recording deferred.** Routing is recorded on the pending-action row + audit until the orchestrator moves onto `agent_run` (ADR-0049 §6).

This ADR ships **schema + helper + this doc** (2E-1); behavior changes land in 2E-2 (backend), 2E-3 (slider), 2E-4 (cockpit).

## Amendment (2026-06-22, #996 close-out) — dispatch-resolution contract + `agent_run` recording

The two deferrals above are now resolved, closing parent #996:

- **Dispatch-resolution is now an explicit, pure FE contract.** D2's level→ceiling helper plus the action catalog (#994, ADR-0107 D2) are tied into a single `resolveDispatch(actionKind, agentKey, dials)` in `src/lib/agent/action-dispatch.ts`: it reads the action's tier from the catalog (an **uncatalogued kind is T3** — fail-closed), picks the **most-specific** dial row (`(agent,class)` → `(agent,*)` → `(*,class)` → `(*,*)` → none ⇒ level 1), and returns the routing decision (`execute` / `execute_notify` / `cockpit`) + the record. The **backend dispatcher (BE #250) remains authoritative** at runtime and mirrors this logic (repos don't share code, ADR-0042); this is the front-end half the operator surfaces preview against.
- **`agent_run` recording is no longer deferred.** The original deferral was "the CRM orchestrator doesn't write `agent_run` yet." The Jarvis run-ledger (migration 0163, #1064, ADR-0080) put the orchestrator onto `agent_run`, so the columns now have a writer. Migration **0176** (RENUMBER AT MERGE) adds `resolved_level` / `resolved_ceiling` / `route_decision` to `agent_run` — the same record the pending-action row already carries for parked actions (D3), now also recorded for actions that **execute inline** (L3–L5). Backend writes; web `SELECT`s for the glass-box trace. This satisfies ADR-0107 D4's "record level/ceiling/routing on `agent_run`" verbatim.
