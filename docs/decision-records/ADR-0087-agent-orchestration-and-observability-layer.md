---
adr: 0087
title: "Agent orchestration & observability layer"
status: consolidated
date: 2026-06-15
repo: frontend
summary: "Adopt a five-tier agent taxonomy documented in"
tags: [agent-icm]
consolidated_into: ADR-0091
---
# ADR-0087: Agent orchestration & observability layer

> Consolidated into [ADR-0091](ADR-0091-agent-icm-platform-consolidated.md). Retained for history.

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-15 |
| **Cross-references** | ADR-0061 (ICM) · ADR-0086 (OKF) · ADR-0048 (AI Agents page) · backend ADR-0036 (orchestrator runtime) · backend ADR-0039 (board) |

## Problem

ICM (ADR-0061) defines business-process *workspaces* and the AI Agents page (ADR-0048)
exposes orchestrator settings, but there is **no single map of the agents themselves** —
their responsibilities, their autonomy posture, what context each loads, and which roles
*watch* the system rather than act on it. We can build executors but cannot answer "who
owns this work-unit, at what autonomy, reading which context, and who notices when it
breaks." Observability roles (health, drift, reconciliation-assurance) are absent
entirely, so a workflow that silently stops looks identical to one that found nothing.

## Context

Two planes already run agents: the **ICM product runtime** (backend orchestrator,
draft→auto dial) and the **agentic-coding meta-layer** (Claude Code sessions across the
four repos, governed by system CLAUDE.md §3/§10 with standing-OK autonomy). They are the
same Interpreted Context Methodology (ICM, Van Clief arXiv:2603.16021) applied to
different work-units: a *trigger* vs. a *GitHub issue*. Both answer the same three
routing questions — **where am I · what context do I load · which tools + how much
autonomy** — which are exactly the OKF "rooms" (ADR-0086) and the ICM autonomy dial.

The substrate already exists in prod: `agent_run`/`agent_message`/`agent_memory`
(telemetry), `autopilot_policies` (+`_golden`) (the dial), `workflow_*` (the ICM engine),
and `audit_log`. This is a wiring/doctrine decision, not new infrastructure.

## Options considered

1. **Status quo** — per-agent docs only (ADR-0048 model), no system view.
2. **External orchestration framework** — adopt a heavyweight agent framework.
3. **Lightweight orchestration matrix + dial-as-data**, grounded in ICM/OKF/the doctrine.

### Tradeoffs

(1) leaves observability and cross-plane autonomy undefined. (2) violates the
modular-monolith principle (§2.4) and duplicates `workflow_*`/`autopilot_policies`.
(3) is plain-text, version-controlled, and reuses existing substrate — consistent with
the doctrine's four traits.

## Decision

Adopt a **five-tier agent taxonomy** documented in
[`docs/agents/orchestration-matrix.md`](../agents/orchestration-matrix.md):

1. **Triage** — one role parameterized by domain (service-ticket · project-task · lead ·
   coding-issue); stamps each incoming unit with archetype · owner · autonomy rung · gate flag.
2. **Dispatch** — Router · Scheduler · Concurrency-governor. **Code primitives, not
   personas.**
3. **Execute** — the ICM executors and coding builders (the existing roster).
4. **Observe / Govern** *(new)* — Run-ledger · Health/SLA monitor · Platform/SRE health ·
   Drift detector · Reconciler · Controller (reconciliation-assurance) · Gatekeeper ·
   Policy/guardrail.
5. **Spine** — Canon steward (keeps OKF / skills / ADR / handoff registries fresh).

Three load-bearing rules:

- **Autonomy is one dial, stored as data.** Every tier reads its rung
  (L0 Observe → L1 Draft → L2 Act-gated → L3 Auto → 🔒 Mark-gate) from
  `autopilot_policies`. Gating an action or ramping it after testing is a **data change,
  not a code change** — unifying the ICM draft→auto ramp (ADR-0061) with the coding-plane
  standing-OKs (system CLAUDE.md §10.4).
- **The run ledger is `agent_run`** (one format, both planes) — no new store.
- **OKF concept files are the per-agent context "rooms"** (ADR-0086), consumed at the
  **section** level: triagers read *definitions*, reconcilers read *authority + joins*,
  the guardrail reads *PII-notes*, drift reads *schema*. This lets the
  guardrail/drift/reconciler wire generically across all entities.

## Consequences

### Security impact

The **gatekeeper** funnels every Mark-gated action (prod-migration apply, creds/consent,
customer-facing/PII sends, deploys) to one human queue — making the §10.4 review cap
explicit. The **guardrail** enforces the OKF PII-free rule and autonomy-rung ceilings as
a generic consumer of every concept file's PII-note. No new attack surface: all roles run
inside the existing identity-gated orchestrator (backend ADR-0035).

### Cost impact

None structural — reuses `agent_run` cost metering (ADR-0032). Observe-tier roles are
mostly L0/L1 (read + report), keeping premium-model spend on the execute tier.

### Operational impact

Observe/Govern closes a known wound: a Platform/SRE health role pointed at Function
health would have caught the dormant-trigger problem (deploys land code but triggers stay
unsynced) currently invisible until something fails to fire. The Controller blocks period
close while any reconciliation exception is open.

## Future considerations

- **Collections + Controller** agents are blocked on an AR/invoice silver entity that does
  not exist (#668, own-vs-mirror decision is Mark-gated).
- The **Reconciler/Controller** OKF room needs the `expense_reconciliation` concept file
  (archetype F, ⏳ planned, #536).
- Dispatch-tier primitives may later harden into typed services; the matrix stays the
  contract.
