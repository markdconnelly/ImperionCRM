# ADR-0029: Agent layer — own orchestrator over direct provider APIs (no Foundry Agent Service, no n8n)

- **Status:** Accepted
- **Date:** 2026-06-07
- **Repo:** ImperionCRM_Backend (orchestrator + sub-agents run here, per ADR-0018 / ADR-0028)
- **Supersedes / relates to:** ADR-0018 (application boundary), ADR-0028 (backend↔frontend boundary)
- **Decision owner:** Mark (human approval gate, CLAUDE.md §9)

---

## Problem

The orchestrator agent and its sub-agents are the deferred next-phase work in this
repo. Before building, we have to settle *how* the agent layer runs and what — if
anything — we adopt to host or orchestrate it. Three candidate approaches were on the
table:

1. **Azure AI Foundry Agent Service** — Microsoft's managed agent orchestration runtime.
2. **Direct provider APIs** behind our own model-routing layer (the existing
   `src/lib/.../model-router` pattern), orchestrator written as our own code.
3. **A third-party workflow engine** (n8n or similar) to host agent/automation logic.

The constraint is a budget-friendly path to a working agent layer that does not
violate the platform's fixed principles.

## Context

- The web app is **live on Azure App Service**; PostgreSQL 18 + pgvector is the unified
  system-of-record, embedding store, **and agent memory layer** (already provisioned,
  migrations 0001–0026 applied).
- CLAUDE.md §2 mandates a **single orchestrator** the user talks to, with internal
  sub-agents that never face the user, and a **provider-agnostic AI layer**
  (OpenAI / Azure OpenAI / Claude) behind a model-routing layer.
- CLAUDE.md §3 restricts Power Automate to triggers/approvals/notifications only —
  **core business logic belongs in the application.**
- Security posture ("Mythos Proof," §5): Zero Trust, least privilege, keep client data
  inside one Entra / Sentinel boundary. This backend is **not internet-facing**
  (private endpoint, MI auth, front-end-only access).

## Options considered

### Option 1 — Azure AI Foundry Agent Service
The service itself carries no platform fee ("no additional charge to use Foundry Agent
Service"; Foundry-native agents using prompts/workflows are free to create and run).
But the real bill is everything underneath: model-token consumption, plus separately
licensed Foundry Tools / Foundry IQ connections (Logic Apps connectors, Fabric,
SharePoint, Bing grounding), and its **managed Memory is billed separately** for
long-term, short-term, and retrieval.

- **Tradeoffs:** Duplicates infrastructure we already own — pgvector is our agent
  memory, so paying Microsoft for managed memory is double-spend on a load-bearing
  component. The runtime is opinionated and biases toward Azure OpenAI as the default
  model path, eroding the provider-agnostic principle. Adopting it now is an
  architectural commitment, not a cost saving.
- **Genuine future merit:** Foundry's *hosted agents* can run external frameworks
  (e.g. LangGraph, Microsoft Agent Framework) on a managed runtime with built-in
  scaling and observability. That is a real reason to revisit **later, under load** —
  not a v1 reason.

### Option 2 — Direct provider APIs behind our own orchestrator (CHOSEN)
The orchestrator is our own server-side code in this Function App. It calls providers
directly through the existing model-routing layer, selecting models on
cost/capability/context/task. Memory and embeddings stay in pgvector.

- **Tradeoffs:** We own the orchestration loop, retry/fallback, and observability
  ourselves (more code). In exchange: no platform fee, full provider-agnosticism, all
  agent traffic and client data stay inside the Entra/Sentinel boundary, and the design
  matches the boundary already documented in ADR-0018 / ADR-0028. Cost is purely token
  spend on top of compute we already pay for.

### Option 3 — n8n / third-party workflow engine
- **Tradeoffs:** Rejected. It is the same *category* of tool as Power Automate, which
  §3 already confines to triggers/notifications — core agent logic in n8n is exactly
  the "logic in the wrong layer" the principles forbid. It adds a self-hosted service
  to patch, secure, threat-model, and bring inside the trust boundary (new SAST /
  dependency / network surface under §5), and Power Automate already covers the narrow
  low-code-trigger role inside the Microsoft perimeter. Useful at most for throwaway
  integration prototyping; never in production Meridian/Imperion.

## Decision

Build the agent layer as **our own orchestrator calling provider APIs directly**
through the model-routing layer (Option 2). Do **not** adopt Foundry Agent Service or
n8n for v1. Keep agent memory and embeddings in pgvector.

Revisit Foundry hosted agents only via a future ADR if and when multi-agent load,
scaling, or observability needs outgrow our own runtime — with a measured cost
comparison, not as a default.

## Consequences

### Security impact
Positive. All agent execution and client data remain inside the existing private,
MI-authenticated, front-end-only boundary; no new vendor, connector, or internet-facing
surface is introduced. Tool access for sub-agents must be scoped (least privilege) and
audit-logged per §5; human-approval gates (§9) apply to any agent action that sends
outbound, touches consent, or changes permissions/billing.

### Cost impact
Lowest of the three options. No platform or orchestration fee and no duplicate managed
memory; spend is token consumption plus compute already provisioned. Model **tiering**
(cheap model for routing/triage, premium model only for the few sub-agent tasks that
need it) is the primary cost lever — far more impactful than platform choice.

### Operational impact
We own the orchestration loop, retry/fallback, and tracing. Mitigate by building
observability in from the start (structured logs, token/cost metrics per call) so a
later Foundry comparison can be made on real numbers.

### Future considerations
- Re-evaluate Foundry hosted agents under real multi-agent load.
- Keep the orchestrator framework-portable (clean interfaces around sub-agents and the
  model router) so a hosted runtime could wrap it later without a rewrite.
