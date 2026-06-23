---
type: Reference Table
title: entity_xref
entity: entity_xref
archetype: H
description: The entity-resolution golden-record registry — one row per (entity_type, source_system, source_key) mapping every source identity to one stable internal entity. The identity spine an agent resolves before acting cross-client.
resource: ../../entity-xref-registry.md
tags: [reference, identity, entity-resolution, governance, data-integrity, bitemporal]
data_class: operational
timestamp: 2026-06-23T18:00:00Z
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
| `valid_from` | timestamptz | **valid-time start** — when the mapping became true in the world |
| `valid_to` | timestamptz | **valid-time end** — when it stopped being true; `NULL` = still valid (0191) |
| `system_from` | timestamptz | **system-time start** — when we began believing this mapping (0191) |
| `system_to` | timestamptz | **system-time end** — when this belief was corrected; `NULL` = current belief (0191) |
| `created_at` / `updated_at` | timestamptz | audit |

**Bitemporal** (migration 0191, [#1112](https://github.com/markdconnelly/ImperionCRM/issues/1112)):
valid-time (`valid_from`/`valid_to`) records *what was true when*; system-time
(`system_from`/`system_to`) records *what we believed when we acted*. A `NULL` end is open-ended
(still valid / current belief).

Partial-UNIQUE `(entity_type, source_system, source_key) WHERE valid_to IS NULL AND system_to IS
NULL` — at most one **live** source identity → exactly one internal entity, so closed history can
accumulate alongside it (replaces 0160's unconditional unique). Plain index
`(entity_type, source_system, source_key)` serves point-in-time history; index
`(entity_type, internal_entity_id)` for the reverse expansion.

## Joins

- `internal_entity_id` resolves (per `entity_type`) to `account.id` / `contact.id` /
  `device.id` / `cloud_asset.id` / `opportunity.id`. Not a DB FK (polymorphic) — the writer
  guarantees the target exists.
- **Resolved through one function.** The forward lookup `(entity_type, source_system,
  source_key) → internal_entity_id` is the SQL function `entity_resolve(...)` (migration 0190,
  #1111; made bitemporal by 0191, #1112) — the single callable every merge / backend resolver /
  Technician uses instead of re-implementing the SELECT, so the matching rule has one home. It
  returns the row valid **now** under the **current** belief (`valid_from <= now() <
  COALESCE(valid_to, 'infinity')` AND `system_to IS NULL`) — the bitemporal predicate, same
  signature. The reverse expansion (internal entity → all its source identities, including closed
  history) stays the indexed SELECT in the read contract.
- **Seeded from [`external_identity`](external_identity.md).** The already-resolved
  account/contact↔provider links in `external_identity` (ADR-0012/0024) are backfilled into the
  spine (migration 0190) as `deterministic` links — `provider` → `source_system`, whichever
  subject column is set → `entity_type`. A `manual` spine link always wins over the backfill
  (idempotent `ON CONFLICT DO NOTHING`). This spine generalizes `external_identity` (and the
  per-merge `match_confidence` columns, ADR-0039) across all entity types.

## Notes

No PII, no secrets — `source_key` is a source-system identifier. Created schema-only in migration
0160; migration 0190 (#1111) adds the `entity_resolve()` forward resolver + the
`external_identity` backfill; migration 0191 (#1112) makes the spine **bitemporal** —
valid-time (`valid_to`) + system-time (`system_from`/`system_to`), with `entity_resolve()`
extended to the live-row predicate without a signature change, and the unique guarantee narrowed
to the one **live** mapping so closed history accumulates. Migration 0194 (#1113) adds the
**data-quality autonomy gate** (epic #1049 pillar 3, FINAL slice): the `dq_sla` policy
(freshness + completeness per `data_class`) + `entity_dq_gate()`, a fail-closed dispatch gate
that routes an action on a **stale or incomplete** record to the human cockpit — DQ as a safety
control, a one-way clamp that never raises autonomy. `dq_sla` is archetype-H config (no concept
file of its own, the 0175 precedent). The merge-lineage backfills
(account/contact/device/opportunity per-source FKs) remain later #1049 slices. Specific identity
mappings resolve against the live read-only DB, never this file.
