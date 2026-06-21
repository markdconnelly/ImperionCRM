---
adr: 0107
title: "Governed action & tool-grant plane"
status: proposed
date: 2026-06-20
repo: frontend
summary: "Turn the declarative ADR-0055 autonomy tiers and the dormant agent_tool_grant table (0056) into an enforced, deny-by-default actuation plane: every sub-agent tool call is checked against a grant; outbound actions move from a hardcoded enum to a typed action-contract catalog; grants carry an evaluated scope; and a tool whose tier exceeds the agent's autopilot ceiling routes to the existing human-approval path instead of executing. The actuation twin of the agent_run ledger and the eval plane — it governs what an agent may DO, not just what it did or whether it was correct."
tags: [meta, agents, security]
---

# ADR-0107: Governed action & tool-grant plane

> **Number is a placeholder.** ADR-0107 is claimed at MERGE per system CLAUDE.md §10.3 —
> the branch that merges second renumbers. Any migration this epic authors (the grant
> seed, the action catalog) is authored against a placeholder number likewise and
> renumbered at merge.

| Field | Value |
|---|---|
| **Repo** | frontend (schema + this ADR); backend owns enforcement runtime |
| **Status** | Proposed |
| **Date** | 2026-06-20 |
| **Epic** | #990 |
| **Cross-references** | ADR-0055 (autonomy tiers T0–T3), ADR-0032 (propose/approve action path), ADR-0087 (orchestration matrix / one run-ledger), ADR-0091 (single-orchestrator platform), ADR-0105 (two-axis RLS access spine), ADR-0106 (eval/quality plane), migration 0056 (`agent_tool_grant`, `agent_run`), migration 0123 (`autopilot_policies`) |

## Problem

The agent platform can **ground and read** under governance, and (after ADR-0106) **measure
whether output is correct** — but what an agent is allowed to **do** is governed only by *code
convention*, not by an enforced plane. Three holes, all verified 2026-06-20:

1. **Tiers are declarative only.** Every sub-agent tool carries an `autonomyTier` (T0 read ·
   T1 internal/undoable write · T2 client-visible · T3, ADR-0055), but
   `ImperionCRM_Backend/src/shared/agent/types.ts` states plainly that *"nothing enforces it
   yet … enforcement (per-grant tier ceilings via `agent_tool_grant`) is v2 work."*
2. **`agent_tool_grant` is dead.** The table exists (migration 0056: `agent_id, tool,
   scope jsonb`) but **no code reads it**. Any sub-agent can call any tool registered to it;
   there is no per-agent allow-list and no scope ceiling.
3. **Outbound actions are a hardcoded 2-value enum.** `ProposedActionKind = send_email |
   send_sms`, and the only execution path (`POST /agent/actions/execute`, ADR-0032) is a
   `switch` over those two kinds. Adding a governed action means editing the endpoint; there is
   no registry, so the catalog cannot be reasoned about, granted against, or audited as data.

We are simultaneously **raising the autonomy dial** (`autopilot_policies`, 0123, moves agents
draft → auto on customer-facing surfaces). Raising autonomy over an unenforced actuation surface
is the highest-risk gap in the agentic OS: a prompt-injected or mis-routed agent can call any
tool its sub-agent exposes, with no allow-list, no scope ceiling, and no tier gate. The
2026-06-20 gap analysis named this the **actuation half** of the OS and ranked it ahead of the
event/trigger substrate precisely because **agents must act safely before events wake them
autonomously**.

## Context

- **One orchestrator, one choke point** (ADR-0091): a single place where permission + audit
  already live, so a grant check has exactly one home.
- **The ledger pattern is settled** (0056): append-only, backend-MI writes, web reads. Grants
  and the action catalog follow the same medallion ownership split — **schema front-end-owned,
  enforcement backend-owned** (§1).
- **Propose/approve already exists** (ADR-0032): sub-agents PROPOSE; the separate, explicitly
  human-approved `agent/actions/execute` path is the ONLY executor and it re-checks consent.
  This ADR generalizes that path; it does not replace its safety property.
- **The autonomy dial is data** (0123, ADR-0087): `autopilot_policies` already expresses a
  per-agent/per-surface ceiling. Tier-ceiling routing reads it rather than inventing a new gate.
- **Reuse, don't wait.** ICM has its own approval queue (#277) on a different timeline; this
  plane reuses the *existing* `agent/actions/execute` approval path so it is not blocked on ICM.

## Options considered

1. **Status quo — declarative tiers + code convention.** Sub-agents are trusted to return
   `proposedAction` rather than self-execute; no grant check.
2. **Harden in code only — a hand-maintained allow-list constant** per sub-agent, no table.
3. **Enforced plane as data** — `agent_tool_grant` becomes the deny-by-default authority; a
   typed action catalog replaces the enum; grant `scope` is evaluated; tier-ceiling routing
   reads `autopilot_policies`. (Chosen.)

### Tradeoffs

| Option | Pro | Con |
|---|---|---|
| 1 Status quo | zero build | unenforced; any sub-agent tool callable; blocks raising autonomy safely; nothing to audit a *denied* action against |
| 2 Code allow-list | no schema | drifts from the data the rest of the agent core lives in; not grant-by-agent at runtime; no admin surface; no scope |
| 3 Enforced plane | deny-by-default at one choke point; grants + catalog are data (auditable, admin-manageable, RLS-able under ADR-0105); reuses the existing approval path and the autonomy-dial table; turns the dormant 0056 table live | we build the check, the catalog, and the admin UI ourselves |

## Decision

Make the actuation plane **enforced and deny-by-default**, mirroring the ledger/eval ownership
split. Five decisions, one per slice of epic #990:

### D1 — Deny-by-default tool grants (slice 2B, the tracer bullet)
The sub-agent tool-dispatch boundary (the loop that invokes `SubAgentTool.run`) **asserts a
grant exists for `(agent_id, tool)` before execution.** Absent a grant the tool is **refused**:
the loop returns an `is_error` tool result to the model (never a failed turn — the existing
contract) and writes an **audit row** for the denial. To preserve current behavior the flip
ships with a **seed migration** that grants every currently-registered sub-agent tool to the
agents that expose it; deny-by-default therefore changes *nothing* on day one and changes
*everything* the moment a tool is added without a grant.

### D2 — Typed action-contract catalog (slice 2C)
Replace `ProposedActionKind` with a **registered catalog**. Each action declares: `kind`,
**input schema** (zod/json-schema), **autonomy tier** (ADR-0055), **consent class**, and an
**executor binding**. `agent/actions/execute` resolves + validates via the catalog instead of a
`switch`; `send_email`/`send_sms` migrate in with identical behavior (consent re-check
preserved). Adding a governed action becomes a catalog entry, not an endpoint edit. The catalog
is the join target grants reference by `tool`/`action` name.

### D3 — Evaluated grant scope (slice 2D)
`agent_tool_grant.scope` (jsonb) becomes **meaningful**: a structured predicate the dispatch
check evaluates against the call (e.g. an Autotask write limited to certain queues/accounts/
tenants). Out-of-scope calls are refused + audited exactly like an absent grant. A per-agent
**grants admin surface** (front end, role-gated) views/grants/revokes tools and edits scope.

### D4 — Tier-ceiling routing into the existing approval path (slice 2E)
When an action's tier **exceeds** the agent's `autopilot_policies` ceiling, the dispatch routes
it to the **existing** human-approval path (`agent/actions/execute`) and tells the model it is
pending approval; **at or below** the ceiling it executes inline. The routing decision is
recorded on `agent_run`. This finally connects the declarative ADR-0055 tier to the ADR-0087
autonomy dial — the tier label stops being decoration.

### D5 — Audit + scope provenance on the run
Every grant decision (allow / deny-no-grant / deny-out-of-scope / route-to-approval) is
auditable, and the effective grant set for a run is reflected in `agent_run.permission_scope`
so the ledger answers *"what was this agent permitted to do at the time"* — the actuation
counterpart to the eval plane's *"was it correct."*

Slice 2A (this ADR) ships **docs only** — no code, no flip — exactly the access-spine /
eval-plane slice-1 precedent (plumbing decided before any behavior changes).

## Consequences

### Security impact

- **Least privilege becomes real for agents.** Deny-by-default + per-agent grants + scope is
  Zero-Trust/least-privilege (§5) applied to the agent's hands, not just its eyes. A
  prompt-injected agent can no longer reach a tool it was never granted, nor exceed a scope.
- **Tier ceilings stop an autonomy mistake before a send.** Raising `autopilot_policies` can no
  longer silently let a T2/T3 action auto-execute — above-ceiling actions route to a human.
- **The denial path is itself an audit signal.** A spike in deny-no-grant / out-of-scope events
  is a detection surface (insider/injection), feeding the same audit/Sentinel posture.
- **Grants are RLS-governable** under ADR-0105 once the access spine lands.
- No secrets in schema, ADR, catalog, or grants (the literal rule: **Never commit secrets**).

### Cost impact

- Negligible. The grant check is a keyed DB lookup (cacheable per run); the catalog is in-memory
  + a small table. No new vendor, no new model calls (the tier gate is a comparison, not a
  judge). The cost it *avoids* — a mis-actuated client-facing send — dwarfs it.

### Operational impact

- New dormant migration(s) (Mark-gated prod apply, like every migration): the grant seed
  (2B) and, if the catalog is table-backed, an `agent_action_def` table (2C).
- The deny-by-default flip is **behavior-preserving only if the seed is complete** — 2B's
  acceptance criteria pin a regression that every existing sub-agent flow still runs. Blast
  radius (graphify `affected` on the tool-dispatch module) is listed in the 2B PR.
- Adds a per-agent grants admin surface (2D) reading/writing under the existing agent-core grant.

## Future considerations

- **Grants as the substrate for the event/trigger plane (#991).** When events wake agents, the
  acting identity's grant set is exactly what bounds an autonomous run — this plane is the
  prerequisite that makes reactive autonomy safe.
- **Per-action SLOs + cost ceilings.** The catalog is the natural place to hang per-action rate
  limits and spend ceilings (ties to `agent_run.cost_usd`).
- **Eval coverage of denials.** A `tool-grant` / `scope` tag class in the eval plane (ADR-0106)
  can pin that a guardrail-removing regression (an over-broad grant) is caught before it ships.
- **Capability discovery.** Once the catalog is data, the orchestrator can advertise an agent's
  *granted* tools rather than its *registered* tools — tightening the model's own option set.
