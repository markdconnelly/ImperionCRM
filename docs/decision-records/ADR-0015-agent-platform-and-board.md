---
adr: 0015
title: "Agent platform persistence and the AI Board of Directors"
status: consolidated
date: 2026-06-07
repo: frontend
summary: "Persist the full agent core (agents, tool grants, runs, messages, memory); agent actions inherit the acting user's permission scope."
tags: [agent-icm]
consolidated_into: ADR-0091
---
# ADR-0015: Agent platform persistence and the AI Board of Directors

> Consolidated into [ADR-0091](ADR-0091-agent-icm-platform-consolidated.md). Retained for history.

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-07 |
| **Cross-references** | — |

## Problem

Decide what of the agent layer is persisted in Postgres so agents are configurable,
auditable, and have memory — and how the distinct "AI Board of Directors" module
relates to it.

## Context

CLAUDE.md §2 fixes the runtime architecture (one user-facing orchestrator → internal
sub-agents) and §3 requires the AI layer to be provider-agnostic. Separately, the
business wants an AI Board of Directors — persona agents mimicking executive roles —
as a **distinct module, not in the main CRM.** The runtime path is still being
proven, so the schema must not constrain it.

## Options considered

1. **Full agent core in Postgres** (definitions, runs+messages audit, vector memory).
2. Code/config-only agents, persisting just transcripts.

### Tradeoffs

- (1) agents become configurable in-app, every action is auditable (cost,
  scope, acting user), and pgvector gives durable memory; the Board reuses the same
  core. More tables now.
- (2) least to build but no in-app config, weak audit, no memory — re-platformed
  later.

## Decision

Persist the **full agent core**: `agent` (instructions, `model_routing`, tool scope,
`module` tag), `agent_tool_grant`, append-only `agent_run` + `agent_message`
(tokens, `cost_usd`, `acting_user_id`, `permission_scope`), and `agent_memory`
(pgvector). **Agent actions inherit the acting user's permission scope** (ADR-0016).
The **AI Board of Directors** is the same core with `module='board'`: persona agents
(`persona_role`) usable 1:1 or via a convened **`board_session`** where selected
members deliberate (`board_message`) and the session yields a `board_recommendation`.
The Board reads only granted business context and is walled off from CRM operational
writes. Provider-agnostic model routing is config in `agent.model_routing`, not a
hard dependency.

## Consequences

### Security impact

Least privilege: an agent can never exceed the invoking user's permissions; every
run is audited. Board agents have a separate, narrower data grant than CRM agents.

### Cost impact

LLM/token spend is captured per run (`cost_usd`) for governance. Storage for memory
embeddings.

### Operational impact

Runs are the audit trail for agent behavior and cost. Memory needs periodic
compaction; re-embedding keyed on the recorded model.

## Future considerations

Attach an M365/Teams/Outlook channel to the orchestrator (no schema change);
tool sandboxing; evaluation harness for persona quality.
