---
adr: 0088
title: "ICM agent runtime on self-hosted Managed Agents + domain-tiered context"
status: consolidated
date: 2026-06-16
repo: frontend
summary: "Adopt self-hosted Managed Agents as the ICM product-runtime executor, and"
tags: [agent-icm]
consolidated_into: ADR-0091
---
# ADR-0088: ICM agent runtime on self-hosted Managed Agents + domain-tiered context

> Consolidated into [ADR-0091](ADR-0091-agent-icm-platform-consolidated.md). Retained for history.

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-16 |
| **Cross-references** | ADR-0061 (ICM, amended) · ADR-0087 (orchestration matrix) · ADR-0086 (OKF) · ADR-0058 (approval-gated send) · ADR-0043 (settled AI stack) · backend ADR-0036 (orchestrator runtime, superseded for the loop) |

## Problem

ICM (ADR-0061) defines business-process *workspaces* as flat folders under
`icm/workspaces/`, executed by the in-house backend orchestrator loop (backend
ADR-0036). Two gaps have emerged as the agent layer scales past the `lead-response`
pilot:

1. **No domain tier.** Workspaces are flat, so context that is common to a whole
   business area (Finance's QBO posture, its OKF rooms, its gate) is either restated
   per workflow or absent. Provisioning (which tools/model/skills a worker gets) is
   *implicit* — stages tag `[haiku]`/`[sonnet]` and cite skills, but nothing declares
   the worker's least-privilege envelope.
2. **We hand-build the loop.** The backend orchestrator (ADR-0036) re-implements the
   agent loop, versioning, sessions, compaction, and would have to re-implement
   rubric-graded outcomes and multi-agent threads. That is undifferentiated work that
   Anthropic's Managed Agents (CMA) now provides — but **cloud** CMA would flow client
   PII into Anthropic-hosted containers, which fails our Mythos-Proof data-residency
   posture for the operational path.

## Context

The agent layer is the Interpreted Context Methodology applied to a *trigger → workflow
run* (ADR-0087). Every worker answers three routing questions — **where am I · what
context do I load · which tools + how much autonomy** — which map to the OKF "rooms"
(ADR-0086) and the autonomy dial (`autopilot_policies`).

The Claude API forces a split we must respect: a request carries `system` (prose
string), and `model`/`tools`/`mcp_servers`/`skills` as **separate structured fields**.
Least-privilege and provisioning are therefore structured by design — they cannot live
in prose — and prompt caching rewards a **frozen** `system` prefix. CMA formalizes
exactly this shape: a versioned **agent** object (`system` + structured fields), with a
**session** per run.

CMA offers three deployment shapes. **cloud** (Anthropic-hosted sandbox) — rejected for
the operational path on data residency. **pure in-house** (ADR-0036) — conforms but
rebuilds the loop. **self-hosted** — Anthropic runs the loop; the sandbox runs on *our*
infra via an outbound-polling `EnvironmentWorker`; credentials, gating, and audit stay
ours.

## Options considered

1. **Status quo** — flat workspaces + in-house loop (ADR-0036).
2. **Cloud Managed Agents** — adopt CMA, Anthropic-hosted sandbox.
3. **Self-hosted Managed Agents + domain-tiered context** — CMA loop, our sandbox, a
   new domain tier, and a declarative `agent.yaml` manifest per workspace.

### Tradeoffs

(1) keeps full control but leaves the domain tier and declarative provisioning unbuilt
and forecloses CMA's outcomes/threads/session built-ins. (2) sheds the most ops burden
but breaches data residency for client-PII workflows — a non-starter for the operational
path. (3) keeps client data, Key Vault custody, and the ADR-0058 send gate on our
infra while gaining CMA's versioned agents, sessions, outcomes, and config-as-data; the
cost is operating the worker and mirroring CMA session events into our `agent_run`
ledger.

## Decision

Adopt **self-hosted Managed Agents** as the ICM product-runtime executor, and
restructure the `icm/` tree around a **layered context hierarchy**.

1. **Domain tier.** `icm/domains/<domain>/` groups workflows by bounded context (nine
   verticals: Marketing, Sales, Delivery & Projects, Service Desk, Customer Success,
   Finance, People, Knowledge, Security Ops). Each carries a thin `room.md` (domain
   prose) and domain-shared `skills/`. Horizontals — Governance/Policy, Identity/Access,
   Observability, Data Platform, Engineering — are **inherited from a top-level
   `CONSTITUTION.md`, never peer folders**. Shared kernel entities: `account`,
   `contact`, `employee`, `contract`.

2. **Declarative `agent.yaml` per workspace** = the CMA agent object. The backend loader
   composes `system` from `CONSTITUTION.md` + the domain `room.md` + the workflow prose
   (stable → cached prefix); `model`/`tools`/`skills`/`mcp_servers`/`autonomy_rung`/
   `okf_rooms` are structured fields where least-privilege is enforced. A workflow's
   `tools`/`okf_rooms` must be a subset of its domain's. The prose file is **not** named
   `CLAUDE.md` (that name auto-loads in the Claude Code dev tool during dry-runs); the
   loader reads by explicit path.

3. **Ephemeral, run-scoped workers.** A trigger → deterministic triage/dispatch (code,
   ADR-0087) → a session provisioned from the workspace `agent.yaml`. No long-lived
   per-domain agent; the agent object is created once and versioned, the session is the
   per-run spin-up.

4. **Self-hosted sandbox.** Tools execute in our infra via an `EnvironmentWorker`
   (`config:{type:"self_hosted"}`). Sends exit only through ADR-0058; secrets stay
   host-side (Key Vault; vaults only for MCP OAuth). CMA session events are mirrored into
   `agent_run`/`agent_message` so our Postgres ledger stays the audit canon.

This **amends ADR-0061** (adds the domain tier + declarative manifest + Constitution) and
**supersedes backend ADR-0036 for the loop** (Anthropic runs it; the backend becomes the
worker host + loader + ledger mirror). It makes ADR-0087's "rooms" physical files.

## Consequences

### Security impact

Client PII and operational data never leave our infra — the sandbox is ours
(self-hosted), satisfying Mythos-Proof / the unified security standard. The
`ANTHROPIC_ENVIRONMENT_KEY` becomes a new custodied secret (Key Vault; rotate on
exposure; never on the worker host's tool-process env). Least-privilege is enforced
structurally via `agent.yaml` `tools`/`okf_rooms` ⊆ domain ⊆ Constitution, not by prose.
Gating (ADR-0058, Mark-gate) is expressed as `always_ask` + host-side custom tools. The
control-plane (`x-api-key`) must be called from outside the worker host.

### Cost impact

Inference draws standard token limits; self-hosted adds no Anthropic sandbox-hours
charge (we run the compute, as today). Net compute is comparable to ADR-0036; we trade
loop-maintenance effort for worker + ledger-mirror effort.

### Operational impact

New runtime components in the backend: the `EnvironmentWorker`, the `agent.yaml` → CMA
agent loader (versions on change), and the session-event → `agent_run` mirror. CMA is
first-party-API / Claude-Platform-on-AWS only (not Bedrock/Vertex/Foundry) — consistent
with our settled stack (ADR-0043). The **coding/build plane** (Engineering domain,
operating on code not client PII) may later use cloud CMA, behind the same `agent.yaml`
surface — out of scope here.

## Future considerations

- The `agent.yaml` manifest is the swappable seam: a workspace definition is executor-
  agnostic, so the coding plane can bind to cloud CMA without re-authoring.
- CMA **outcomes** (rubric grade→revise) and **memory stores** are candidates for the
  monthly-close and customer-success workflows respectively; deferred until the worker
  and the domain pilot land.
- The Constitution's required-section lint and the `coverage-matrix` `domain` column are
  the conformance surface (CI `icm-conformance`, extending the #535 semantic-layer gate).
