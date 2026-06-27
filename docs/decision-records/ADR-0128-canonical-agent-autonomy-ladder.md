---
adr: 0128
title: "Canonical agent autonomy ladder — per-level capability semantics + per-action auto_at_level"
status: accepted
date: 2026-06-27
repo: frontend
summary: "Pin a single canonical 1–5 (+L0) autonomy ladder with universal per-level capability semantics that EVERY agent maps onto, plus a deterministic per-action rule (auto_at_level + dial-proof always_gate) for what auto-executes at a given dial. Extends ADR-0109 (which gave the dial + routeAction + hard ceilings but never pinned what each LEVEL means as a capability class). Chase (Sales) is the first worked instance."
tags: [agents, governance]
---

# ADR-0128: Canonical agent autonomy ladder — per-level capability semantics + per-action auto_at_level

> Number claimed at MERGE per system CLAUDE.md §10.3. This ADR is authored against
> the placeholder `NNNN`; just before merge the branch is rebased on current `main`,
> the next free ADR number is taken, this file is renamed, and every reference is
> fixed. No global counter is reserved at authoring time.

| Field | Value |
|---|---|
| **Repo** | frontend (this ADR + action-catalog / `agent.yaml` schema); backend reads `auto_at_level` at dispatch |
| **Status** | Accepted |
| **Date** | 2026-06-27 |
| **Extends** | [ADR-0109](ADR-0109-actuation-autonomy-dial.md) (the 1–5 actuation dial + `routeAction` + hard ceilings) |
| **Cross-references** | [ADR-0118](ADR-0118-data-class-third-rls-axis-action-ceiling.md) (always-gate `data_class`es), the G3 autonomous-delivery doctrine (reversibility gates autonomy; hard ceilings are dial-proof), [ADR-0087](ADR-0087-agent-orchestration-and-observability-layer.md) (one dial as data), [ADR-0061](ADR-0061-icm-business-process-automation.md) (the draft→auto ICM ramp) |

## Problem

ADR-0109 gave us the actuation machinery: a per-workflow **1–5 autonomy dial**
(`agent_autopilot_policy`), a `routeAction` decision that resolves an action to one
of `execute` / `execute_notify` / `cockpit`, and the principle of **dial-proof hard
ceilings** that no level can breach. What it did **not** do is pin what each *level*
**means** as a capability class, nor give a uniform way for each task or workflow to
declare its per-level behaviour.

The gap is real and load-bearing. With the dial defined only as a number from 1 to 5
and no canonical semantics behind each rung, every agent is free to define its own
autonomy ad hoc — Chase's "level 3" and Felix's "level 3" can mean different things,
and "turn the dial up one" means something different in every workspace. That is
drift, and drift in an *autonomy* control is ungovernable: an operator moving a slider
cannot reason about what they just unlocked, and the platform cannot enforce a uniform
ceiling. We need **one ladder that all agents map onto**, and **one deterministic
per-action rule** for what auto-runs at a given dial setting.

## Context

- **ADR-0109's per-workflow dial** lives on `agent_autopilot_policy`; the gauntlet
  enforces it through gate 7 (`actuation_level`) and gate 8 (`hard_ceiling`). This ADR
  defines what the *level value* the dial carries actually means, and how an individual
  action decides whether that level is enough.
- **The action catalog already carries `dataClass` and `always_gate`** per action
  (ADR-0107/0109 lineage). We add one field, `auto_at_level`, alongside them — the
  per-action threshold this ladder needs.
- **The Felix wedge defaults to L1** (propose-then-wait) — the default-safe posture.
  The ladder must keep that posture as its floor so adopting it changes no current
  behaviour until an operator raises a dial.
- **The G3 autonomous-delivery doctrine** is the governing principle: *reversibility
  gates autonomy*, and *hard ceilings are dial-proof*. The ladder encodes exactly this
  — the rungs are ordered by the reversibility/blast-radius of what they auto-execute,
  and the ceiling sits outside the dial entirely.
- **ADR-0118 fixed the always-gate `data_class`es** — `financial`, `security_credentials`,
  and `client_pii` actions always gate regardless of dial. The ladder's hard ceiling
  inherits those classes verbatim and adds the external-commitment class on top.

## Options considered

1. **Per-agent ad-hoc autonomy definitions** (rejected). Each agent defines what its
   levels mean for itself. Pro: maximal local flexibility. Con: the dial means a
   different thing per agent — drift, no uniform ceiling, an operator cannot reason
   about a slider, the platform cannot enforce one rule. Ungovernable; this is exactly
   the problem.
2. **One canonical ladder + per-action thresholds** (chosen). A single ordered set of
   capability classes every agent maps onto, plus a per-action `auto_at_level` so a
   task expresses its own risk profile by tagging its actions. Pro: the dial means the
   same thing everywhere; one enforceable ceiling; deterministic auto-vs-park. Con: each
   agent must map its capabilities onto the shared rungs rather than invent its own —
   which is the entire point.

## Decision

### D1 — The canonical ladder (universal capability semantics)

A single **six-level ladder** (`L0`–`L5`); the ADR-0109 dial value `1–5` selects rungs
`L1`–`L5`, with `L0` the implicit floor below the dial. Every level names a **capability
class**, and the class means the same thing for every agent:

- **L0 — observe.** Read, research, surface. No writes, no proposals. The agent can
  look and report; it cannot change or suggest a change.
- **L1 — propose.** Drafts and proposals only. Everything the agent produces **parks**
  for a human. This is the **default-safe wedge posture** (Felix's default).
- **L2 — auto-internal.** Auto-executes **internal, REVERSIBLE** writes — CRM hygiene,
  creating/documenting records, internal notes. Anything **customer-facing still parks**.
- **L3 — auto-low-risk-external.** Auto-sends **standard, low-risk external** touches
  with **execute-then-notify** (the action runs, a human is told). **Higher-stakes
  external** touches still park.
- **L4 — reversible-auto.** Broad auto-execution of **REVERSIBLE** actions behind an
  **undo window**. **Irreversible** actions still park.
- **L5 — max-within-ceiling.** Maximal autonomy: everything auto-executes **except the
  hard ceiling**.

The rungs are ordered by the reversibility and blast-radius of what they auto-execute
(the G3 doctrine made concrete): internal-reversible → low-risk-external → broadly-
reversible-with-undo → everything-but-the-ceiling.

### D2 — The dial-proof hard ceiling

Actions tagged **`always_gate`** **NEVER auto-execute at ANY level** — they always park
to the cockpit. The ceiling has two components:

- **External commitments that bind the company** — pricing, discount, or term
  commitments, and send-for-signature. These are commitments a customer can hold the
  company to; they are never an agent's call.
- **The always-gate `data_class`es** (ADR-0118) — `financial`, `security_credentials`,
  `client_pii`.

**The dial raises the floor, never breaches the ceiling.** Turning a dial to L5 grants
maximal autonomy *below* the ceiling and changes nothing above it. The ceiling is not a
high level on the dial — it is *outside* the dial.

### D3 — Per-action declaration

Every catalog action carries two fields:

- **`auto_at_level`** — the **minimum dial level at which the action auto-executes**.
  Below it, the action parks.
- **`always_gate`** — the **dial-proof** flag: when set, the action never auto-executes,
  regardless of `auto_at_level` or the dial.

A task or workflow **expresses its risk profile by tagging its actions**: a low-risk
internal write gets `auto_at_level: 2`; a standard external acknowledgement gets
`auto_at_level: 3`; a customer-facing commitment gets `always_gate: true`. The ladder is
the vocabulary; the per-action tags are how each workflow speaks it.

### D4 — Deterministic selection

An action **auto-executes IFF**:

```
dial ≥ auto_at_level   AND   NOT always_gate   AND   the gauntlet passes
```

otherwise it **parks to the cockpit**. This is enforced at runtime by gauntlet gate 7
(`actuation_level`) and gate 8 (`hard_ceiling`); the per-workflow `agent_autopilot_policy`
is the **dial input**. The rule is total and deterministic — there is no agent
discretion in the auto-vs-park decision.

### D5 — Universal mapping

**Every agent maps its capabilities onto the SAME ladder** — the dial means the same
thing everywhere. This is the template the remaining six agents follow. **Chase (Sales)
is the first worked instance** (below).

#### Chase (Sales) — worked instance

| Level | What Chase auto-executes |
|---|---|
| **L0 — observe** | Read leads/accounts/opportunities; confirm a lead's score. No writes. |
| **L1 — propose** | Draft lead responses, social replies, renewal-repricing recommendations, opportunity proposals — all **park**. (Chase's default.) |
| **L2 — auto-internal** | Auto-create + document the opportunity (internal, reversible write). Customer-facing still parks. |
| **L3 — auto-low-risk-external** | Send a standard, low-risk acknowledgement, **execute-then-notify**. Higher-stakes external still parks. |
| **L4 — reversible-auto** | Broad auto-execution of reversible actions behind an undo window. |
| **L5 — max-within-ceiling** | Maximal autonomy below the ceiling. |
| **HARD CEILING (dial-proof)** | Customer-facing **commitments** — renewal/quote **send-for-signature**, **pricing / discount / term** commitments — **always park**, at every level. |

## Consequences

### Security

- **Uniform, enforceable autonomy.** One ladder, one ceiling, one deterministic rule.
  An operator can reason about a slider; the platform can enforce a single contract.
- **The hard ceiling is dial-proof.** External commitments and the always-gate
  `data_class`es never auto-execute, regardless of the dial — the highest-blast-radius
  actions are structurally outside autonomy.
- **No per-agent ad-hoc autonomy.** The drift vector is closed: every agent maps onto
  the same rungs, so "level N" is a single, audited meaning across the roster.

### Cost

- None structural. The change is a schema field plus documentation; no new runtime
  services, no new provider calls.

### Operational

- **The action catalog + `agent.yaml` manifests gain `auto_at_level`.** The field sits
  alongside the existing `dataClass` / `always_gate` per action.
- **The dial UI can show what each level unlocks per agent** — the ladder gives the
  slider a legend, derived from each agent's per-action tags.
- **This is the template for the remaining six agents.** Chase is worked here; Belle,
  Audrey, Vance, Pierce, Celeste, and Vera each map onto the same rungs as their
  workspaces are built.
- **Cross-repo.** The front end owns the action-catalog + `agent.yaml` schema gaining
  `auto_at_level` (schema ownership, ADR-0042); the **backend gauntlet reads it** at
  dispatch and is the runtime authority (repos do not share code).

## Future

- Map the remaining six agents onto the ladder as their workspaces are built (one
  worked instance per agent, following the Chase template).
- The dial UI legend ("what L3 unlocks for Chase") derived from per-action
  `auto_at_level` is a follow-up surface.
- The undo-window mechanism L4 relies on (reversible-auto with a recall window) is a
  backend concern tracked with the gauntlet wiring; this ADR fixes the semantics, not
  the implementation.
