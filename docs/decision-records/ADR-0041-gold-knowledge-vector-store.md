---
adr: 0041
title: "Gold knowledge layer + unified vector store (pinned Voyage AI embeddings)"
status: consolidated
date: 2026-06-09
repo: frontend
summary: "Unified `knowledge_object` → `knowledge_embedding` gold store pinned system-wide to Voyage `voyage-3-large` @ 1024 dims."
tags: [medallion]
consolidated_into: ADR-0092
---
# ADR-0041: Gold knowledge layer + unified vector store (pinned Voyage AI embeddings)

> Consolidated into [ADR-0092](ADR-0092-medallion-data-platform-consolidated.md). Retained for history.

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-09 |
| **Cross-references** | — |

## Problem

The Gold tier of the medallion (CLAUDE.md §4) — AI-ready knowledge objects + embeddings the
orchestrator agent reasons over — did not exist. The schema had only two entity-specific
embedding tables (`interaction_embedding`, `contact_embedding`, both `vector(1536)`, migrations
0001/0021), no general knowledge-object table, no embedding-provenance columns, and no pinned
embedding contract. The on-prem local pipeline (`ImperionCRM_LocalPipelineEnrichment`) owns all
vectorization (its §7) and needs a stable target to write into; the backend orchestrator needs a
single surface to query. Both must agree on one vector space.

## Context

- **Embeddings are decoupled from the generation model.** The agent is Claude, but Claude
  consumes retrieved *text*, not vectors — so the embedding model is an independent
  retrieval/cost/governance choice, not a "Claude-compatible" one. Anthropic itself does not
  publish an embeddings model and points users to third-party providers.
- The local pipeline's vector-lifecycle contract requires: one pinned `embedding_model` +
  `dimension` system-wide, stored on every row; idempotency by `content_hash`; versioned
  re-embed on model/chunking change (never in-place); retention of old versions until the new is
  verified, then pruned; cost telemetry per batch.
- The two legacy 1536 tables are unused (embedding generation was deferred, CLAUDE.md §6/§7).

## Options considered

1. **Per-entity embedding tables** (extend the `interaction_embedding` pattern per source). More
   tables, no single retrieval surface, repeated provenance columns.
2. **Unified `knowledge_object` → `knowledge_embedding`** (chosen). One gold object per entity,
   one chunked-vector table across all entities, one HNSW index, one place for the agent to query.
3. Embedding model: **OpenAI `text-embedding-3-small`/1536** (reuse existing space, cheapest) vs
   **`text-embedding-3-large`/3072** vs **local on-prem model** (zero egress) vs **Voyage AI
   `voyage-3-large`/1024** (Anthropic's recommended RAG embeddings, strongest retrieval).

### Tradeoffs

Voyage gives the best retrieval quality and is the provider Anthropic recommends for Claude RAG,
at the cost of a **new vendor + a new egress path for client text** (a data-governance
consideration for an MSP) and a 1024-dim space distinct from the legacy 1536 tables. The
provenance columns make a later switch (to a local model for zero-egress, or a different
dimension) a versioned re-embed rather than a schema rewrite — except a *dimension* change, which
needs a new `vector(N)` column because pgvector columns are fixed-width.

## Decision

- **Unified gold store** (migration 0045): `knowledge_object` (tenant_id, entity_type,
  entity_ref, title, body, summary, source, content_hash, metadata; `UNIQUE(tenant_id,
  entity_type, entity_ref)`) → `knowledge_embedding` (chunk_index, chunk_text, `embedding
  vector(1024)`, embedding_model, dimension, chunking_version, content_hash, token_count;
  `UNIQUE(knowledge_object_id, chunk_index, embedding_model, chunking_version)`, HNSW cosine
  index). The version columns let multiple model/chunking versions coexist behind one index;
  queries filter by `(embedding_model, dimension, chunking_version)`.
- **Pinned embedding model: Voyage AI `voyage-3-large` at dimension 1024**, system-wide.
- The local-pipeline SP role (`imperion-localpipeline`, ADR-0003/migration 0044) gets
  `SELECT/INSERT/UPDATE` on both tables plus **`DELETE` on `knowledge_embedding` only** (to prune
  superseded vector versions per the retention policy) — its one scoped DELETE. The web identity
  inherits `SELECT` via 0002's default privileges.

## Consequences

### Security impact

Per-tenant isolation via `tenant_id` on every knowledge object (local-pipeline §3). The new
DELETE grant is scoped to one table and justified by the re-embed lifecycle; it does not widen
the pipeline role elsewhere. Client text is sent to Voyage for embedding — if that egress is
unacceptable for some tenants, the pinned model can be swapped to the on-prem option behind the
same interface (versioned re-embed) without a schema change.

### Cost impact

Voyage `voyage-3-large` is billed per token by the provider; the local pipeline embeds off Azure
compute and records `token_count` per chunk for cost telemetry. `content_hash` idempotency
prevents re-billing unchanged text. 1024-dim vectors are smaller than 1536/3072 → smaller HNSW
index and lower storage.

### Operational impact

Embedding generation runs unattended on the home server (local-pipeline §7) — chunk → embed →
upsert `knowledge_embedding`, prune superseded versions after verification. The two legacy 1536
tables should be re-embedded onto this store (or retired) when generation goes live so the agent
queries a single space.

## Future considerations

Converge `interaction_embedding`/`contact_embedding` onto `knowledge_embedding`. If retrieval
quality or egress posture changes, re-embed to a different Voyage model, OpenAI, or a local
on-prem model via the provenance-versioned path. A dimension change requires a new vector column
(documented in `docs/database/`).
