---
type: Reference Table
title: entity_xref
entity: entity_xref
archetype: H
description: The entity-resolution golden-record registry — one row per (entity_type, source_system, source_key) mapping every source identity to one stable internal entity. The identity spine an agent resolves before acting cross-client.
resource: ../../entity-xref-registry.md
tags: [reference, identity, entity-resolution, governance, data-integrity]
timestamp: 2026-06-21T00:00:00Z
---

# entity_xref

The **entity-resolution golden-record registry**: one row per
`(entity_type, source_system, source_key)` → one `internal_entity_id`. The single canonical
answer to *"are these two source records the same real-world thing?"* across every source
system. It is the identity spine an autonomous Technician
([#1038](https://github.com/markdconnelly/ImperionCRM/issues/1038)) resolves **before
acting**, so it never acts on the wrong "Acme". Epic
[#1049](https://github.com/markdconnelly/ImperionCRM/issues/1049) (data-plane integrity
spine), slice 3a [#1054](https://github.com/markdconnelly/ImperionCRM/issues/1054).

## Source of record / authority

Resolution today is **distributed** — each silver merge carries its own per-source FKs +
`match_confidence` ([ADR-0039](../../../decision-records/ADR-0039-per-source-bronze-tables.md)),
CMDB has `ci_relationship`, gold has `knowledge_object`. `entity_xref` **consolidates** that
into one registry the merges (cloud Pipeline + on-prem LocalPipeline) and the backend resolver
adopt. A link is **idempotent**: writers upsert on the unique key, so re-running a merge
re-asserts the same mapping. A `manual` link (`match_method='manual'`, confidence 1.000) is
authoritative and is never silently overwritten by a lower-confidence automated one. The
backfill plan + the full read/writer contract live in
[`entity-xref-registry.md`](../../entity-xref-registry.md).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `entity_type` | text | NOT NULL — `account` \| `contact` \| `device` \| `asset` \| `opportunity` |
| `internal_entity_id` | uuid | NOT NULL — the silver PK for `entity_type`; polymorphic, so **no hard FK** |
| `source_system` | text | NOT NULL — `website` \| `autotask` \| `itglue` \| `m365` \| `kqm` \| `qbo` \| `apollo` \| `pax8` \| `unifi` \| … |
| `source_key` | text | NOT NULL — the entity's id within `source_system` (not PII, not a secret) |
| `match_confidence` | numeric(4,3) | NOT NULL default 1.000, `[0,1]` |
| `match_method` | text | NOT NULL — `deterministic` \| `fuzzy` \| `manual` |
| `valid_from` | timestamptz | when the mapping became authoritative (bitemporal `valid_to` is a later #1049 slice) |
| `created_at` / `updated_at` | timestamptz | audit |

UNIQUE `(entity_type, source_system, source_key)` — one source identity → exactly one internal
entity. Index `(entity_type, internal_entity_id)` for the reverse expansion.

## Joins

- `internal_entity_id` resolves (per `entity_type`) to `account.id` / `contact.id` /
  `device.id` / `cloud_asset.id` / `opportunity.id`. Not a DB FK (polymorphic) — the writer
  guarantees the target exists.
- **Consumed by** every merge (to resolve a source row to its internal entity before writing)
  and by the backend resolver API + the Technician (to act on the correct entity). Overlaps
  the per-merge `match_confidence` columns (ADR-0039) and `external_identity`, which this
  spine generalizes across all entity types.

## Notes

No PII, no secrets — `source_key` is a source-system identifier. Schema-only in migration
0160; backfill from existing resolved FKs and the resolver API are follow-up slices of #1049.
Specific identity mappings resolve against the live read-only DB, never this file.
