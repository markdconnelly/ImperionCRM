---
adr: 0049
title: "Materialize the agent core + AI Board persistence (migration 0056)"
status: consolidated
date: 2026-06-09
repo: frontend
summary: "Migration 0056 materializes the agent core and AI Board persistence; model routing is a tier hint resolved at runtime."
tags: [agent-icm]
consolidated_into: ADR-0091
---
# ADR-0049: Materialize the agent core + AI Board persistence (migration 0056)

> Consolidated into [ADR-0091](ADR-0091-agent-icm-platform-consolidated.md). Retained for history.

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-09 |
| **Cross-references** | backend ADR-0036, backend ADR-0037 |

## Problem

ADR-0015 decided the agent platform's persistence (agent definitions, run/message
audit, vector memory, and the Board tables) but the tables were never migrated —
the backend's now-real orchestrator loop (backend ADR-0036/0037) audits to
`audit_log` and the Board page is the last placeholder module. Building the Board
runtime requires the schema to exist.

## Context

Since ADR-0015 was written, three decisions moved underneath it:

- The AI stack is settled on Claude + Voyage `voyage-3-large` @ 1024 (ADR-0043),
  so "provider-agnostic `model_routing`" no longer means a provider choice.
- The orchestrator's model pair comes from `agent_settings` presets (0054,
  backend ADR-0037), not per-agent config.
- The pinned vector contract (ADR-0041, migration 0045) fixes embedding
  provenance columns (`embedding_model`, `dimension`, `chunking_version`).

## Decision

Migration `0056_agent_core_and_board.sql` creates the Diagram-3 core with those
updates folded in:

1. **`agent.model_routing` is a tier hint** (`{"tier":"cheap"|"premium"}`); the
   concrete models resolve through the `agent_settings` preset at runtime.
2. **`agent_memory.embedding` is `vector(1024)`** under the same pinned contract
   and provenance columns as `knowledge_embedding`, HNSW cosine index.
3. **`board_message.agent_id` is nullable** — a NULL row is the orchestrator /
   synthesis voice in the transcript.
4. **One recommendation per session** (`board_recommendation.session_id UNIQUE`).
5. **Five starter personas seeded** (CEO, CFO, COO, CMO, CISO; `module='board'`,
   premium tier) — editable in-app later; insert-once via `ON CONFLICT DO NOTHING`.
6. **Orchestrator audit stays in `audit_log` for now.** Moving the CRM
   orchestrator's per-turn audit into `agent_run`/`agent_message` is a separate,
   later change; the Board runtime writes `agent_run` rows from day one.

## Consequences

### Security impact

Least privilege per ADR-0042: the backend MI gets SELECT/INSERT/UPDATE (no
DELETE — runs and transcripts are append-only), the web identity gets SELECT
only (all writes are processes and go through the backend), pipeline identities
get nothing. Board personas inherit the convening user's permission scope
(`agent_run.permission_scope`, ADR-0016) and are walled off from CRM operational
writes — their tool surface is read-only business context.

### Cost impact

Board deliberations are multi-persona premium-tier model calls; every run records
`tokens` + `cost_usd` and the backend's monthly budget ceiling (ADR-0037) gates
convening exactly as it gates the orchestrator.

### Operational impact

`agent_run` becomes the Board's audit/cost trail. `agent_memory` needs periodic
compaction once used; re-embeds follow the versioned re-embed rule (ADR-0041).

## Future considerations

Retrofit the CRM orchestrator onto `agent_run`/`agent_message`; in-app persona
editing; Teams channel for board sessions; persona evaluation harness.
