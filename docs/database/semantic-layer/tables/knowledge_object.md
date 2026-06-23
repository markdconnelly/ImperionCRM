---
type: Gold Table
title: knowledge_object
entity: knowledge_object
archetype: G
description: AI-ready gold text over any silver entity — on-prem produced; chunked + embedded into Voyage vectors; content-hash-idempotent, versioned re-embed.
resource: ../../../decision-records/ADR-0041-gold-knowledge-vector-store.md
tags: [gold, knowledge, retrieval, rag]
data_class: operational
timestamp: 2026-06-22T00:00:00Z
---

# knowledge_object

The gold tier: one agent-consumable text record per real-world entity (account, contact,
device, contract, ticket, proposal, exposure, assessment, posture item, IT Glue doc, …) —
the unit the orchestrator retrieves over. Governed by
[ADR-0041](../../../decision-records/ADR-0041-gold-knowledge-vector-store.md) and
[ADR-0043](../../../decision-records/ADR-0043-settled-ai-stack-drop-legacy-vectors.md).

## Source of record / authority

**The on-prem local pipeline is the sole producer** (ALL vectorization lives there); the
backend agent is a read-only consumer (`SELECT` only). It is **polymorphic** over silver
via `entity_type` + `entity_ref`, **isolated per `tenant_id`** (the natural key is
`(tenant_id, entity_type, entity_ref)` — one knowledge object per source row per tenant).
**`content_hash` is the idempotency key**: an unchanged `body`(+`summary`) hash means the
producer skips re-embedding (no re-bill). The paired vectors are `knowledge_embedding`
(**Voyage `voyage-3-large` @ 1024 dims — the pinned contract**; re-adding a provider is a
new ADR). The OKF semantic bundle will itself be embedded here once it expands past pilot.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `tenant_id` | text | NOT NULL — per-tenant isolation; part of the natural key |
| `entity_type` / `entity_ref` | text | NOT NULL — polymorphic pointer to the source silver/gold row (`entity_ref` = uuid-as-text or external_ref) |
| `title` | text | short human label |
| `body` | text | NOT NULL — canonical text that gets chunked + embedded |
| `summary` | text | optional gold summary |
| `source` | text | producing pipeline/source (provenance) |
| `content_hash` | text | NOT NULL — hash of body(+summary); unchanged ⇒ skip re-embed |
| `metadata` | jsonb | NOT NULL default `{}` — entity-specific extras, **kept out of the embedded text** |

UNIQUE `(tenant_id, entity_type, entity_ref)`.

## Joins

- **1:many → `knowledge_embedding`** (`knowledge_object_id` FK, ON DELETE CASCADE): `body`
  is split into chunks, one vector row per `chunk_index`. Vectors are **versioned** by
  `(embedding_model, dimension, chunking_version)` — a same-dimension model/chunking change
  adds new rows beside the old (versioned re-embed, never in-place); the agent query path
  filters to the pinned version. The producer holds the one scoped `DELETE` (on
  `knowledge_embedding` only) to prune superseded versions.
- `entity_type` / `entity_ref` resolve back to the described silver entity.

## Retrieval

Retrieval is **hybrid-capable** (migration 0166, #1153). Beyond the HNSW cosine vector
search on `knowledge_embedding.embedding`: `knowledge_object.metadata` has a GIN index for
facet filtering (`@>` containment / key existence), and `knowledge_embedding.chunk_fts` is a
generated `english` `tsvector` (GIN-indexed) so a hybrid ranker can re-score vector
candidates by keyword overlap at chunk granularity. Substrate only — the ranker query path
itself is a later phase.

## Notes

Body/summary can paraphrase client data — produced under the same PII discipline. This doc
describes the contract, not contents; resolve specifics against the live read-only DB.
