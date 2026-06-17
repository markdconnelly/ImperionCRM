---
type: Silver Table
title: ci_relationship
description: App-native CMDB relationship layer — a typed, directional edge between two Configuration Items (polymorphic ci_type+ci_id pairs over the read-only cmdb_ci union). Edges are derived (recomputed from silver FKs) or manual (human-authored, cmdb:write). IT Glue write-back is a separate gated slice.
resource: ../../../decision-records/ADR-0047-device-inventory.md
tags: [silver, service-desk, cmdb, relationship, overlay, archetype-d, app-native]
timestamp: 2026-06-17T00:00:00Z
---

# ci_relationship

The CMDB **relationship layer** — a typed, directional **edge** between two Configuration
Items ([#647](https://github.com/markdconnelly/ImperionCRM/issues/647), parent
[#372](https://github.com/markdconnelly/ImperionCRM/issues/372); CMDB authority ADR is
authored in parallel under [#646](https://github.com/markdconnelly/ImperionCRM/issues/646),
nominally **ADR-0078**). It is the first **persisted** CMDB table: the CI register
([#645](https://github.com/markdconnelly/ImperionCRM/issues/645)) is a READ-ONLY `cmdb_ci`
UNION projected over silver `account` / [`contact`](contact.md) / [`device`](device.md)
(no `cmdb_ci` table), so a CI is a polymorphic `(ci_type, ci_id)` pair. This table stores
the **edges between those pairs** — curated knowledge (derived AND manually authored) that
has nowhere in silver to live.

It is **archetype D** (app-owned overlay/sidecar hung off a read-only projection — the twin
of [`collections_activity`](collections_activity.md)) **but app-native**: the working copy
is ours, and pushing edges out to **IT Glue is a separate, gated round-trip slice** (a later
[#372](https://github.com/markdconnelly/ImperionCRM/issues/372) child), not this table.

## Source of record / authority

- **The website is the system of record for the relationship layer.** Edges are either:
  - **derived** — auto-seeded from EXISTING silver foreign keys and recomputable on demand
    (`crm.deriveCiRelationships()`, the same seed the migration runs). v1 derivations are
    limited to the FKs silver actually carries: `device belongs-to account`
    (`device.account_id`) and `user belongs-to account` (`contact.account_id`). The issue
    also names `device assigned-to user`, but silver `device` carries **no** assigned-user
    FK today (migration 0036), so that derivation is intentionally omitted until a
    device→user link is added to silver (a future front-end schema change, ADR-0042).
  - **manual** — authored/overridden by an admin (`cmdb:write`, ADR-0045).
- **Manual edges survive re-derivation.** The derivation deletes + reinserts ONLY
  `source='derived'` rows; manual rows are never touched. `source` is part of the unique
  key, so a manual edge and a derived edge of the same shape coexist (a deliberate human
  assertion is never silently merged into a recomputable projection).
- **Endpoints are business keys, not FKs.** A CI is a projection over silver (#645) — there
  is no `cmdb_ci` table to reference, and `ci_id` is unique only within a `ci_type`. The app
  validates both endpoints exist in `listConfigurationItems` before an INSERT.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | surrogate PK |
| `from_ci_type` | text | `account` \| `user` \| `device` (CHECK); the subject of the relation |
| `from_ci_id` | text | CI business key within `from_ci_type` |
| `to_ci_type` | text | `account` \| `user` \| `device` (CHECK); the object |
| `to_ci_id` | text | CI business key within `to_ci_type` |
| `relation_type` | text | oriented relation read `from → to` (`belongs-to`, `assigned-to`, `depends-on`, …); loose vocabulary, not an enum — the app supplies the pick-list |
| `source` | `ci_relation_source` enum | `derived` (recomputable) \| `manual` (human-authored, sticky) |
| `note` | text | optional human note on a manual edge; null for derived |
| `created_at` / `updated_at` | timestamptz | edge timestamps |

Self-loops forbidden by CHECK. Unique on
`(from_ci_type, from_ci_id, to_ci_type, to_ci_id, relation_type, source)` — re-derivation
UPSERTs derived rows without duplicating, and a manual edge of the same shape coexists.

## Joins

- `(from_ci_type, from_ci_id)` / `(to_ci_type, to_ci_id)` → the `cmdb_ci` union read-model
  (#645) — i.e. silver [`account`](account.md), [`contact`](contact.md) (the `user` CI), or
  [`device`](device.md). Business-key joins, **not FKs** (the register is a VIEW/union).
- **Consumers:** the CI-detail "Relationships" panel + neighbourhood dependency-graph view
  (`/cmdb/<type>/<id>`); later CMDB impact analysis ([#372](https://github.com/markdconnelly/ImperionCRM/issues/372)).
  Read accessor: `crm.listCiRelationships(ciType, ciId)` (both directions); writes:
  `crm.createCiRelationship` / `updateCiRelationship` / `deleteCiRelationship` (manual only)
  and `crm.deriveCiRelationships` (recompute derived). Pure helpers in
  `src/lib/cmdb/relationship.ts`.

## Notes

Gated by `cmdb:write` (admin-only, ADR-0045) on every write; the CMDB *register* is visible
to admin∨support (`canSeeCmdb`, read-only). **App-native: nothing here propagates to IT Glue**
(that is a separate gated slice). **PII-free:** an edge is two CI business keys + a relation
type + an optional internal note — it mints no personal data of its own; CI display names and
attributes resolve live from the read-only register / silver.
