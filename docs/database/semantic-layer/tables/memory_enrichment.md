---
type: Silver Table
title: memory_enrichment
entity: memory_enrichment
archetype: B
description: App-native silver extraction over verbatim memory — one row of Haiku-extracted type/topics/people/action-items for a captured turn or conversation, kept off the append-only bronze.
resource: ../../../decision-records/ADR-0113-verbatim-memory-tier.md
tags: [silver, knowledge, memory_enrichment, enrichment, memory]
data_class: client_pii
timestamp: 2026-06-22T00:00:00Z
---

# memory_enrichment

The **structured meaning extracted from a verbatim memory** — for one captured turn or one
captured conversation, the model-extracted `type`, `topics`, `people`, and `action_items`.
It is the SILVER layer over the BRONZE verbatim store
[`memory_drawer`](memory_drawer.md): bronze stays faithful, append-only, no-transform
(ADR-0113), so write-time enrichment lands here instead of on the bronze row (which has no
`metadata` column — only `source_metadata` capture provenance). Carved out of the verbatim
capture loop (backend #303) per **backend ADR-0086**; governed front-end-side by
[ADR-0113](../../../decision-records/ADR-0113-verbatim-memory-tier.md). It sits between the
verbatim bronze and the conversation's gold summary
([`knowledge_object`](knowledge_object.md), `entity_type='memory'`) — recall still drills
gold → bronze; this row is the normalized extraction in the middle.

## Source of record / authority

**App-native; the row IS the authoritative extraction.** No external SoR — the enrichment is
produced by the backend writer (BE #331) running the Claude **Haiku** tier (ADR-0043) over
the verbatim bronze it points at. The authoritative input is recorded two ways: the
`(source_kind, source_id)` pair names *which* bronze it summarized, and `content_hash` is the
hash of the exact input bytes the extraction ran over. **Re-billing idempotency is the
authority rule for "is this current":** `UNIQUE (source_kind, source_id, content_hash)` means
the writer skips a re-run whose input is unchanged (never paying Haiku twice for the same
bytes); a genuine re-extraction over *changed* input is a new hash → a new row, and a consumer
takes the **latest by `created_at`** for a given `(source_kind, source_id)`. The extraction is
advisory meaning, not a system-of-record fact — the faithful truth is always the bronze it
cites.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `source_kind` | text | grain — `turn` (→ `memory_drawer.id`) · `conversation` (→ `memory_drawer.conversation_id`); CHECK-enforced |
| `source_id` | uuid | the enriched bronze ref in that grain — **no FK** (a `conversation_id` is not a PK) |
| `owner_user_id` | uuid | FK → `app_user` (ON DELETE CASCADE); personal RLS axis. NULL = agent/company. **Denormalized from the bronze row's owner** so the policy is single-table |
| `required_group` | text | company RLS axis (role slug) — **RESERVED**, enforced at access-spine slice 3a (#979) |
| `type` | text | extracted classification of the turn/conversation (open set, e.g. `decision` · `question` · `note`) |
| `topics` | text[] | extracted topic tags (default `{}`) |
| `people` | text[] | extracted people mentioned — names/handles, **NOT** resolved entity ids in v1 (default `{}`) |
| `action_items` | text[] | extracted action items / follow-ups (default `{}`) |
| `model` | text | the extracting model id (Claude Haiku tier, ADR-0043) — re-extraction provenance |
| `content_hash` | text | hash of the bronze input the extraction ran over — the re-billing idempotency key |
| `created_at` | timestamptz | append time; latest row wins for a `(source_kind, source_id)` |

Unique key `(source_kind, source_id, content_hash)` = the idempotency / no-double-bill guard.
`type` / `topics` / `people` / `action_items` are extracted from PII-bearing memory and may
themselves name people.

## Joins

- `(source_kind, source_id)` → [`memory_drawer`](memory_drawer.md): polymorphic, **no FK**.
  `turn` joins `source_id = memory_drawer.id`; `conversation` joins
  `source_id = memory_drawer.conversation_id`. Retention/forgetting (Backend #303) finds the
  enrichment of a purged bronze row via the `(source_kind, source_id)` index, mirroring
  [`personal_fact`](personal_fact.md)'s provenance mechanic (0168).
- `owner_user_id` → [`app_user`](app_user.md): the personal RLS owner, copied from the bronze
  drawer the writer enriched (NULL for agent/company drawers).
- Sits beside the conversation's gold summary in [`knowledge_object`](knowledge_object.md)
  (`entity_type='memory'`, `entity_ref=conversation_id`); the orchestrator drills gold → this
  silver extraction → the verbatim bronze.

## Notes

`type` / `topics` / `people` / `action_items` are the distilled meaning of PII-bearing memory
(they can name people and reveal private content); the row inherits the bronze drawer's
sensitivity. **Two-axis RLS (ADR-0105) is exactly the control**, identical in shape to
`memory_drawer`: personal rows (`owner_user_id` set) are owner-only; agent/company rows
(`owner_user_id` NULL) are visible to any identified caller; `required_group` role-scoping is
reserved for slice 3a (#979). No row-level data, PII, or secrets here — resolve specific
values against the live read-only DB (CLAUDE.md §8).
