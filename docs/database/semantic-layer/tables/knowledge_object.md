---
type: Gold Table
title: knowledge_object
description: AI-ready gold summary over any silver entity — on-prem produced; paired 1:1 with a Voyage embedding; drafts carry no vector.
resource: ../../../decision-records/ADR-0041-gold-knowledge-vector-store.md
tags: [gold, knowledge, retrieval, rag]
timestamp: 2026-06-14T00:00:00Z
---

# knowledge_object

The gold tier: an agent-consumable summary of a silver entity, the unit the orchestrator
retrieves over. Governed by
[ADR-0041](../../../decision-records/ADR-0041-gold-knowledge-vector-store.md) and
[ADR-0043](../../../decision-records/ADR-0043-settled-ai-stack-drop-legacy-vectors.md).

## Source of record / authority

**The on-prem local pipeline is the sole producer** (ALL vectorization lives there). It is
**polymorphic** over silver via `entity_type` + `entity_ref`. `status` is `draft` →
`published`; **drafts carry no embedding** (invisible to retrieval until published).
`content_hash` makes regeneration idempotent. The paired vector is `knowledge_embedding`
(**Voyage `voyage-3-large` @ 1024 dims — the pinned contract**; re-adding a provider is a
new ADR). The OKF semantic bundle will itself be embedded here once it expands past pilot.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `entity_type` / `entity_ref` | text | polymorphic pointer to the silver entity |
| `tenant_id` | text | owning tenant |
| `title` / `summary` / `body` | text | summary content |
| `source` | text | producing pipeline/source |
| `content_hash` | text | idempotency |
| `status` | text | draft / published |
| `metadata` | jsonb | |

## Joins

- 1:1 → `knowledge_embedding` (the pgvector row). `entity_type`/`entity_ref` resolve back
  to the described silver entity.

## Notes

Summaries can paraphrase client data — produced under the same PII discipline. This doc
describes the contract, not contents; resolve specifics against the live read-only DB.
