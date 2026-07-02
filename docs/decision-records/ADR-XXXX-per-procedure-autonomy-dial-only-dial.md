---
adr: XXXX
title: "Per-procedure autonomy dial is the only dial"
status: proposed
date: 2026-07-01
repo: frontend
summary: "Consolidate three overlapping autonomy-dial configs into ONE model: a single dial per (agent_key, procedure_key) carrying a 1–5 level + an enabled boolean (light-up-as-built; a disabled procedure never executes and is excluded from the agent's autonomy score). There is NO agent-level master dial. Retire agent_action_autonomy (mig 0158), its ActuationDial UI, and setActionAutonomyAction; reshape agent_autopilot_policy (mig 0123, 0 prod rows) into agent_procedure_policy; strip static autonomy_rung: in agent.yaml to a seed-default annotation the runtime never reads. agent_action_catalog (mig 0217, per-action-kind auto_at_level = risk floor + always_gate = dial-proof hard cap) and the kill-switch (mig 0163) are unchanged and orthogonal. Fire rule: enabled && procedure.level >= auto_at_level && !always_gate (&& the gauntlet passes). Agent autonomy score = round(100 × Σ(enabled levels) / (5 × N_enabled)); 0 enabled → 0%. Amends ADR-0128's ladder application; supersedes the mig-0158 dial model."
tags: [agents, governance]
---

# ADR-XXXX: Per-procedure autonomy dial is the only dial

> Number claimed at MERGE per system CLAUDE.md §10.3 / [ADR-0084](./ADR-0084-merge-time-number-assignment.md).
> Authored against the placeholder `XXXX`; current max is 0140 — take the next free number just
> before merge, rename this file, and fix every `ADR-XXXX` reference (this file, its companions
> ADR-YYYY/ADR-ZZZZ, CONTEXT.md, and the epic body). Docs-only ADR; claims no migration number.

| Field | Value |
|---|---|
| **Repo** | frontend (owns the dial schema + the ICM `agent.yaml` schema, ADR-0042); the **backend gauntlet/dispatcher** is the runtime consumer |
| **Status** | Proposed |
| **Date** | 2026-07-01 |
| **Issue** | #1832 (epic #1829 — Agent GUI rework) |
| **Amends** | [ADR-0128](./ADR-0128-canonical-agent-autonomy-ladder.md) (the L0–L5 ladder still holds; its *application* moves from an agent/action dial to a per-procedure dial) |
| **Supersedes** | the mig-0158 **actuation dial** model (`agent_action_autonomy`, one 1–5 level per `(agent_key, action_class)`) — retired here |
| **Companion** | [ADR-YYYY](./ADR-YYYY-teams-human-gate-rail.md) (Teams human-gate rail), [ADR-ZZZZ](./ADR-ZZZZ-agent-profile-db-source-of-truth.md) (agent profile = DB SoT) |
| **Cross-references** | [ADR-0109](./ADR-0109-actuation-autonomy-dial.md) (the original per-workflow actuation dial + hard ceilings), [ADR-0118](./ADR-0118-data-class-third-rls-axis-action-ceiling.md) (always-gate `data_class`es), [ADR-0139](./ADR-0139-finance-autonomy-explicit-per-workflow.md) (finance carve-out — still holds, expressed per-procedure), [ADR-0042](./ADR-0042-division-of-labor-reads-direct-processes-backend.md) (schema ownership / process boundary) |

## Problem

Autonomy control has accreted **three overlapping dial configs**, and they no longer compose:

1. **`agent_autopilot_policy`** (mig 0123, ADR-0087) — an `L0`–`L3` **rung** per `(agent · workflow · plane)`.
2. **`agent_action_autonomy`** (mig 0158, ADR-0107/0109) — a **1–5 actuation dial** per `(agent_key, action_class)` resolving to an ADR-0055 tier ceiling.
3. **`agent_action_catalog.auto_at_level`** (mig 0217, ADR-0128) — a per-**action-kind** minimum-rung risk floor.

Three planes, three keyings (workflow / action-class / action-kind), three vocabularies for "how much autonomy." An operator moving a slider cannot reason about what they just unlocked, and the platform cannot state one enforceable rule. In Mark's words on 2026-07-01, "the system went off the rails." We need **one dial**, at the granularity the business actually reasons in — the **procedure** (the runbook-sized unit, the Operating Procedure, ADR-0133) — with everything else (the risk floor, the hard cap, the kill-switch) kept as **orthogonal** controls, not competing dials.

## Context

- **The procedure is the right grain.** ADR-0133/0136 already make the Operating Procedure the top unit of work with exactly one owning agent; ADR-0128's ladder is a per-agent *ceiling* that every procedure lives under. A per-procedure dial is the natural join of the two — it is what an operator wants to turn ("let Belle auto-run *lead nurture*, keep *contract send* parked"), not a per-action-class abstraction.
- **`agent_autopilot_policy` is empty in prod (0 rows)** — reshaping it is free; no data migration risk.
- **The ladder (ADR-0128) is not being repealed.** L0–L5 remain the capability semantics. What changes is *where the setting lives*: the dial value now hangs off the procedure, not the agent or the action-class.
- **The risk floor and the hard cap already live on the action catalog and are correct.** `agent_action_catalog` (0217) carries per-action-kind `auto_at_level` (the inherent risk floor) and `always_gate` (the dial-proof hard cap → forces human approval). These are NOT dials — they are properties of the action. They stay exactly as they are and combine with the new procedure dial in the fire rule.
- **The kill-switch is orthogonal.** `agent_governance_setting` (mig 0163) is a global stop, not a level; unchanged.
- **The finance carve-out (ADR-0139) still holds.** Finance autonomy is defined explicitly per workflow with a permanent money `always_gate`; expressed in this model it is simply per-procedure rows whose money steps are `always_gate` and whose `enabled`/`level` are set deliberately, never by a global dial. No conflict.

## Options considered

1. **Keep the three planes, document how they compose** (rejected). The composition is the problem — three keyings cannot be reconciled into one operator-legible slider, and drift across them is ungovernable. This is the status quo that "went off the rails."
2. **One agent-level master dial + per-procedure overrides** (rejected). A master dial re-introduces the thing we are removing: turning it moves many procedures at once with blast radius the operator cannot see, and it competes with the per-procedure setting for authority. Mark's call was explicit — **no agent-level master dial**.
3. **One per-procedure dial, everything else orthogonal** (chosen). A single `(agent_key, procedure_key)` dial (level + enabled); the action-kind risk floor and hard cap stay on the catalog; the kill-switch stays global. One dial, one grain, one fire rule.

### Tradeoffs

The chosen model means **there is no single knob to "turn an agent up"** — autonomy is granted procedure by procedure. That is deliberate: it forces the operator to grant reach where a procedure has earned it, matching the light-up-as-built ramp, and it makes blast radius legible (you can see exactly which procedures are live). The cost is more rows to manage; mitigated by the seed importer landing every procedure **disabled** by default (#1833) and the profile/deep-dive GUI (#1835/#1836) making the set easy to reason about. The **agent-level autonomy score** (below) recovers a single at-a-glance number without re-introducing a single control.

## Decision

### D1 — One dial: `agent_procedure_policy`

Autonomy is set on exactly one surface: a row per **`(agent_key, procedure_key)`** carrying

- **`level`** `smallint` 1–5 — the ADR-0128 ladder rung this procedure runs at (L0 is the implicit floor below the dial, as in ADR-0128).
- **`enabled`** `boolean NOT NULL DEFAULT false` — **light-up-as-built**. A procedure is dark until an operator turns it on.

There is **no agent-level master dial**. `agent_autopilot_policy` (mig 0123) is reshaped/replaced by `agent_procedure_policy`; the schema change lands in FE #1832.

### D2 — Disabled means dark

A **disabled** procedure (`enabled = false`) **NEVER executes**: an inbound wake for it **parks or declines** (Park/Refuse, per CONTEXT.md dispositions), and the procedure is **excluded from the agent's autonomy score** (D5). "Disabled" is not "level 0 that still runs reads" — it is off.

### D3 — The risk floor and hard cap are orthogonal (unchanged)

`agent_action_catalog` (mig 0217) is unchanged and load-bearing:

- **`auto_at_level`** — the per-action-kind **risk floor**: the minimum rung at which that action-kind auto-executes.
- **`always_gate`** — the **dial-proof hard cap**: the action-kind never auto-executes at any level and **routes to human approval** (the Teams gate, ADR-YYYY).

These are properties of the action, not dials. The always-gate `data_class`es (ADR-0118: `financial` / `security_credentials` / `client_pii`) keep their separate data-class ceiling. The kill-switch (`agent_governance_setting`, mig 0163) stays a global orthogonal stop.

### D4 — The fire rule

An action inside a running procedure **auto-executes IFF**:

```
enabled  AND  procedure.level >= action.auto_at_level  AND  NOT action.always_gate  AND  the gauntlet passes
```

otherwise it **parks** (to the Teams human-gate rail, ADR-YYYY). This is the ADR-0128 D4 rule with the **dial input rebound to the procedure**: the level now comes from `agent_procedure_policy` for the running plan's procedure, not from an agent/action-class dial. The rule stays total and deterministic — no agent discretion.

### D5 — The agent autonomy score

The agent-level number surfaced on the agent cards (#1834) and the profile page (#1835, admin) is a pure function of its **enabled** procedures:

```
autonomy_score = round( 100 × Σ(level over enabled procedures) / (5 × N_enabled) )
```

with `N_enabled = 0 → 0%`. It is an at-a-glance rollup, **not** a control — you cannot set it; it is derived from the per-procedure dials. Disabled procedures contribute nothing (D2).

### D6 — Retirements

- **Retire `agent_action_autonomy` (mig 0158)** — the action-class dial, superseded by D1. Its **ActuationDial UI** and the **`setActionAutonomyAction`** server action are removed (FE #1832 + the profile/deep-dive work).
- **Strip static `autonomy_rung:` in `icm/**/agent.yaml`** to a **seed-default annotation only** — the seed importer (#1833) may read it to set an initial `level`, but the **runtime never reads it**. The dial is DB-resolved.

### D7 — Backend swap

The backend gauntlet/dispatcher **resolves the running plan's procedure** and reads `agent_procedure_policy` for the level, applying D4. This replaces reading `agent_action_autonomy`. Tracked as ImperionCRM_Backend#514 — **safety-bearing; requires line-level orchestrator review before merge.** Gate-7 (`actuation_level`) / gate-8 (`hard_ceiling`) semantics are preserved; only the dial input changes.

## Consequences

### Security impact

- **One enforceable rule.** A single dial + a single fire rule (D4) closes the three-plane drift vector — "how much autonomy does this procedure have" has exactly one answer, auditable per `(agent, procedure)`.
- **The hard cap stays dial-proof.** `always_gate` action-kinds and the ADR-0118 data-class ceiling never auto-execute at any `level` — the highest-blast-radius actions remain structurally outside the dial and route to the human gate (ADR-YYYY).
- **Fail-safe default.** Every procedure lands **disabled** (D2) — reach is opt-in, granted where earned, matching least privilege.

### Cost impact

None structural. A schema reshape (0 prod rows moved) + UI removal + a documented backend swap; no new runtime services, no new provider calls. (The Teams gate the parked actions route to has its own cost note in ADR-YYYY.)

### Operational impact

- **FE:** the migration (#1832) reshapes `agent_autopilot_policy`→`agent_procedure_policy` and drops `agent_action_autonomy`; the ActuationDial UI + `setActionAutonomyAction` are removed; the procedure deep-dive (#1836) gains the `level`+`enabled` controls (`agents:operate`); the score renders on the cards + profile.
- **ICM:** `autonomy_rung:` in `agent.yaml` becomes a seed-default annotation; a later conformance note can assert the runtime never reads it.
- **Backend (cross-repo, ADR-0042):** the dispatcher swap (ImperionCRM_Backend#514) is the one safety-bearing change — reviewed line-by-line.
- **CONTEXT.md** gains *Procedure Dial · Procedure Toggle · Autonomy Score · Hard Cap / Always-Gate*, and the existing *Autonomy Dial* term is annotated as superseded by the Procedure Dial.

## Future considerations

- **Volume-weighting the score** — D5 is an unweighted mean of enabled levels; a later revision may weight by run volume (the ADR-0135 "volume-weighted later" note).
- **Bulk enable/level operations** — an operator convenience (e.g. "enable all L≤2 internal procedures for Felix") that composes the per-procedure dials without re-introducing a master dial.
- **Earned-autonomy automation** — the promotion/demotion state machine (ADR-0121) can *drive* `agent_procedure_policy` rows over time; this ADR fixes the dial it would move (relates #1410).
