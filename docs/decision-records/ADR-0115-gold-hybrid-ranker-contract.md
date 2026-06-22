---
adr: 0115
title: "Gold hybrid ranker — staged retrieval contract over the gold knowledge store"
status: proposed
date: 2026-06-22
repo: frontend
summary: "Defines the Phase 2 hybrid ranker query-path over the gold knowledge store (knowledge_object / knowledge_embedding, ADR-0041, hybrid substrate 0166). Four DETERMINISTIC stages combined as a weighted sum: semantic (HNSW cosine, filtered to the pinned vector triple) + keyword (ts_rank over chunk_fts) + metadata containment (metadata @> via GIN) + temporal recency decay; default weights semantic 1.0 / keyword 0.3 / temporal 0.2, 30-day half-life. The deterministic ranker is a frontend READ given a query VECTOR (no AI key needed); generating the vector (Voyage) and the OPTIONAL Claude Haiku rerank are AI calls and live in the backend (ADR-0042 §1, Backend #304/#305). Results are knowledge_object rows with entity_ref so callers drill to the verbatim store (memory_drawer / agent_message). Runs under withIdentity so RLS applies."
tags: [architecture, agents, memory, retrieval, vector]
---

# ADR-0115: Gold hybrid ranker — staged retrieval contract over the gold knowledge store

> **Number claimed at merge** per system CLAUDE.md §10.3. Originally authored as the
> placeholder 0114; renumbered to **0115** on rebase because the parallel
> personal-knowledge-store thread (#1152) merged ADR-0114 first.

| Field | Value |
|---|---|
| **Repo** | frontend (schema + read-path owner, ADR-0042) |
| **Status** | Proposed |
| **Date** | 2026-06-22 |
| **Companion** | `src/lib/data/gold-knowledge-search.ts` (the deterministic ranker); #1166 |
| **Cross-references** | ADR-0041 (gold vector store / pinned Voyage 1024 contract) · ADR-0102 (vector contract single home) · ADR-0043 (settled AI stack — Claude + Voyage) · ADR-0042 (four-repo split) · ADR-0105 (two-axis RLS access spine) · ADR-0113 (verbatim memory tier — the drill-down target) · #1153 / migration 0166 (hybrid-search substrate) · epic #966 · Backend #304 (query-embed) · Backend #305 (Haiku rerank) |

## Problem

The gold knowledge store (`knowledge_object` / `knowledge_embedding`, ADR-0041) has had pure
HNSW cosine vector search since migration 0045, and the hybrid-search substrate (migration
0166, #1153 Phase 0) added a generated `chunk_fts` tsvector + GIN and a GIN on
`knowledge_object.metadata`. Nothing yet **combines** those primitives into a single ranked
retrieval. A second-brain recall ("what did we decide about X," "find the conversation where
the client said Y") wants the strengths of all three — semantic recall, exact-keyword
precision, and metadata facets — plus a bias toward recent knowledge, returned as one ranked
list. We need a settled, auditable **ranker contract**: which stages, how weighted, where each
runs.

## Context

- **Substrate is ready** (0045 + 0166): HNSW cosine on `embedding`; GIN on `chunk_fts`; GIN on
  `metadata`. `knowledge_embedding` is chunk-grained; `knowledge_object` is object-grained.
- **Pinned vector contract** (ADR-0041 / ADR-0102): every similarity query MUST filter to
  `(embedding_model, dimension, chunking_version)` so vector spaces never mix. The single home
  is `db/contracts/vector-contract.json`, consumed via `src/lib/contracts/vector-contract.ts`.
- **Repo split** (ADR-0042 §1): the front end holds **no AI key**. Generating a query embedding
  (a Voyage call) and any LLM rerank (a Claude call) are AI calls → backend. Running SQL over an
  already-computed vector is **not** an AI call → a legitimate FE read.
- **Recall is two-level** (ADR-0113): the ranker returns gold objects carrying `entity_ref`; the
  caller drills to the verbatim bronze (`memory_drawer` for human notes/conversations,
  `agent_message` for agent runs). The drill-down read is RLS-scoped; the gold read is too.
- Reference shape: MemPalace hybrid-v4 (semantic → keyword boost → temporal proximity →
  optional LLM rerank) and OB1's metadata-facet GIN filter.

## Options considered

1. **Semantic-only (status quo).** Simplest, but loses exact-keyword precision and recency bias;
   not a hybrid ranker.
2. **Deterministic hybrid in one SQL statement (chosen for the FE slice).** A CTE picks the best
   (max-cosine) embedding chunk per object plus that object's best keyword `ts_rank`, the outer
   query applies metadata/type/tenant/status filters, computes the temporal decay, and orders by
   a weighted sum. One round-trip, rides all three indexes, no AI key.
3. **Application-side fusion (RRF over separate queries).** Reciprocal-rank-fusion of independent
   semantic and keyword result sets. More tunable but multiple round-trips and harder to keep on
   the indexes; deferred — the single-statement weighted sum is enough for the first slice.
4. **LLM-first rerank.** Always rerank with Claude. Best quality, but a cost on every query and
   an AI call — made an **optional** final stage in the backend, not the default.

### Tradeoffs

The weighted sum (option 2) is transparent and index-friendly but assumes the stage scores are
roughly commensurable; we normalize where we can (cosine similarity in [0,1]; temporal decay in
(0,1]; `ts_rank` is unbounded-ish but small) and expose **per-stage component scores** in the
result so the blend is auditable and tunable. RRF (option 3) avoids the commensurability problem
and is the natural upgrade if the weighted sum proves brittle.

## Decision

Adopt a **four-stage deterministic ranker** as the gold retrieval contract, combined as a
weighted sum, runnable as a single FE SQL read given a query vector:

1. **Semantic** — `1 - (embedding <=> $vec)` (cosine similarity), max over the object's chunks,
   filtered to the pinned `(embedding_model, dimension, chunking_version)` triple. Rides HNSW.
2. **Keyword** — `ts_rank(chunk_fts, plainto_tsquery('english', $queryText))`, max over the
   object's chunks; 0 when no `queryText`. Rides the `chunk_fts` GIN.
3. **Metadata** — optional `knowledge_object.metadata @> $filter` containment pre-filter. Rides
   the `metadata` GIN. (A facet filter, not a score term, in this slice.)
4. **Temporal** — exponential recency decay on `knowledge_object.updated_at`,
   `exp(-ln2 · age_seconds / (half_life_days · 86400))`, in (0,1]. A boost, never a hard cut.

**Default weights:** semantic `1.0`, keyword `0.3`, temporal `0.2`; **half-life 30 days**.
Callers may override per query. Only `status = 'published'` objects are ranked (drafts carry no
embeddings, 0068). Results are `knowledge_object` rows with `entity_ref` + per-stage component
scores.

**Placement (ADR-0042 §1):**

- The **deterministic ranker SQL** lives in the **frontend** data layer
  (`src/lib/data/gold-knowledge-search.ts`), called with an already-computed query vector. It is
  a read, not a process, and needs no AI key.
- **Generating the query vector** (Voyage embed of the query text) is a backend AI call —
  **Backend #304**.
- The **optional Claude Haiku rerank** of the top-N shortlist is a backend AI call —
  **Backend #305** — default off (cost); the deterministic rank stands alone.

All reads run inside `withIdentity` (ADR-0105) so RLS scopes both the gold read and any verbatim
drill-down.

## Consequences

### Security impact

The ranker reads through `withIdentity`, so the two-axis RLS applies — no broadening of access.
Gold knowledge today is broad-employee-read (ADR-0100); the load-bearing control is on the
verbatim **drill-down** (`memory_drawer` is owner-scoped, ADR-0113/0105). The ranker returns
only `entity_ref` + summary/title from gold, never verbatim PII; the caller must drill (RLS-
scoped) to read verbatim. No secrets; the query vector is supplied by the caller.

### Cost impact

Zero AI cost for the deterministic ranker (pure SQL). The query-embed (#304) is one small Voyage
call per query (~$0.18/M tokens). The optional Haiku rerank (#305) is the only per-query LLM cost
and is off by default.

### Operational impact

Until vectorization goes live (LocalPipeline #176) `knowledge_embedding` is empty, so the ranker
returns `[]` — it is deploy-dormant, not broken, like much of the platform (STATE.md). The
weights and half-life are constants in one module + this ADR; tuning is a one-line change. The
SQL rides existing indexes (HNSW, two GINs) — no new migration.

## Future considerations

- **Backend (b/c):** query-embed wiring (#304) and the optional Haiku rerank (#305).
- **RRF fusion** (option 3) if the weighted sum proves brittle across heterogeneous score scales.
- **Metadata as a score term** (matched-facet bonus) rather than a pure filter.
- **Phase 3+:** temporal validity-window KG, the universal memory MCP (own ADR), and a recall
  benchmark via the eval plane (#983) to tune the weights against ground truth.
