# Entity-resolution registry — backfill plan & read contract

`entity_xref` (migration 0160, [#1054](https://github.com/markdconnelly/ImperionCRM/issues/1054),
epic [#1049](https://github.com/markdconnelly/ImperionCRM/issues/1049)) is the canonical
**golden-record identity spine**: one row per `(entity_type, source_system, source_key)` →
one `internal_entity_id`. This doc is the contract the merges and the future resolver API
build against. The table itself is schema-only in this PR; **populate (backfill) and the
resolver API are follow-up slices of #1049.**

## Why a spine

Resolution today is **distributed** — each silver merge keeps its own per-source FKs +
`match_confidence` (ADR-0039), CMDB has `ci_relationship`, gold has `knowledge_object`. No
single place answers *"are these two source records the same real-world entity?"* across
all sources. An autonomous Technician ([#1038](https://github.com/markdconnelly/ImperionCRM/issues/1038))
acting across every client needs that single answer so it never acts on the wrong "Acme".

## Read contract

Two queries, both indexed:

1. **Resolve a source identity → internal entity** (the merge/ingest path). As of migration
   0190 (#1111) every consumer calls the resolver **function** rather than hand-rolling the
   SELECT, so the matching rule (uniqueness + the `valid_from <= now()` bitemporal seam) has one
   home:
   ```sql
   SELECT entity_resolve($1 /*entity_type*/, $2 /*source_system*/, $3 /*source_key*/);
   -- returns internal_entity_id, or NULL when unresolved
   ```
   `entity_resolve` is STABLE (safe in a read transaction), reads only `entity_xref`, and is
   backed by the partial-unique `uq_entity_xref_source_live` — at most one **live** row (the
   uniqueness guarantee). As of migration 0191 (#1112) the spine is **bitemporal** and the
   resolver returns the row valid **now** under the **current** belief:
   `valid_from <= now() < COALESCE(valid_to, 'infinity')` AND `system_to IS NULL` — the
   `valid_to`/system-time bounds extend 0190's `valid_from <= now()` seam **without changing the
   signature** or any caller. The FE mirror of this contract (the `entity_type` / `source_system`
   vocabularies + the arg-order encoder + the `isLiveMapping` predicate mirror) is
   `src/lib/integrations/entity-resolution.ts`.

2. **Expand an internal entity → all its source identities** (lineage / the resolver,
   the "same entity across systems" UI panel):
   ```sql
   SELECT source_system, source_key, match_confidence, match_method
   FROM entity_xref
   WHERE entity_type = $1 AND internal_entity_id = $2;
   ```
   Backed by `entity_xref_internal_idx`.

**Writer contract.** Merges (cloud Pipeline + on-prem LocalPipeline) and the backend resolver
**upsert** on the live unique key — re-running a merge re-asserts the same link (idempotent). A
manual correction sets `match_method='manual'` with `match_confidence=1.000`; the resolver
must never silently overwrite a `manual` link with a lower-confidence automated one.
`internal_entity_id` is the silver PK for `entity_type` and is **polymorphic** (no hard FK):
referential integrity is the writer's responsibility, validated per-type.

**Bitemporal writer contract (migration 0191, #1112).** The partial-unique index permits at most
one row with `valid_to IS NULL AND system_to IS NULL` per source identity, so history is kept by
**closing, not overwriting**:
- *Valid-time close* (the link stopped being true in the world — a contact left, a device was
  decommissioned, a merge corrected a wrong link): set `valid_to = now()` on the open row. The
  resolver stops returning it; the row remains for "what was true then".
- *System-time correction* (we believed the wrong thing and are fixing it): set `system_to =
  now()` on the superseded row and INSERT the corrected belief (new `system_from`). An audit can
  reconstruct the mapping as we knew it at any past instant. Either close keeps exactly one live
  row, so the resolver's scalar return stays well-defined. A NULL end is open-ended (still
  valid / current belief) — every 0190-written row stays live with no data change.

## Backfill plan

The spine is seeded from the FKs that already encode resolved identity, **read-only, additive,
idempotent, no data loss** (source rows are untouched; `entity_xref` is derived). Each backfilled
row is `match_method='deterministic'`, `match_confidence=1.000` (already-resolved FKs), written
set-based as `INSERT … ON CONFLICT (entity_type, source_system, source_key) DO NOTHING` — safe to
re-run, never duplicates, and a curated `manual` link always wins.

| entity_type | Backfill source (existing resolved FK) | source_system, source_key | Status |
|---|---|---|---|
| `account` / `contact` | `external_identity` (ADR-0012/0024) | provider → `source_system`; the set subject column → `entity_type`; `external_id` → `source_key` | **DONE — migration 0190 (#1111)** |
| `account` (M365 tenant) | `account_tenant` (ADR-0051) | `('account', m365, tenant_guid)`, `manual` | DONE — migration 0165 (#1141) |
| `account` | `account` merge lineage (per-source bronze ids, ADR-0039) | each populated `autotask`/`itglue`/`apollo`/`website` id on the account | follow-up #1049 |
| `device` | `device` merge lineage + `external_identity` | itglue/m365 config ids | follow-up #1049 |
| `asset` | `cloud_asset` (ADR-0097) source linkage | cloud provider resource id | follow-up #1049 |
| `opportunity` | `opportunity` merge lineage (ADR-0080) | website/autotask/KQM ids | follow-up #1049 |

The `external_identity` backfill (migration 0190) is the first general-FK seed (the 0165 tenant
backfill preceded it for the M365-specific link). `external_identity` is empty in prod today, so
it moves **0 rows now** and lights up as the connector syncs hydrate it (deploy-dormant, like the
rest of the spine). The remaining merge-lineage backfills stay later #1049 slices; the resolver
function above is now stable so they can land behind a consistent read contract.

## Boundaries

No PII, no secrets — `source_key` is a source-system identifier (Autotask company id, M365
tenant/user id, device serial, …), not personal data. Bitemporal validity (valid-time `valid_to`
+ system-time `system_from`/`system_to`, #1112) is **DONE — migration 0191**; the data-quality
autonomy gate (#1113) is the remaining #1049 slice. `entity_resolve`'s predicate is now
`valid_from <= now() < COALESCE(valid_to, 'infinity')` AND `system_to IS NULL` — 0191 extended
0190's `valid_from <= now()` seam without changing the resolver signature or any caller.
