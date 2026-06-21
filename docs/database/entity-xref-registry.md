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

1. **Resolve a source identity → internal entity** (the merge/ingest path):
   ```sql
   SELECT internal_entity_id
   FROM entity_xref
   WHERE entity_type = $1 AND source_system = $2 AND source_key = $3;
   ```
   Backed by `uq_entity_xref_source` — at most one row (the uniqueness guarantee).

2. **Expand an internal entity → all its source identities** (lineage / the resolver,
   the "same entity across systems" UI panel):
   ```sql
   SELECT source_system, source_key, match_confidence, match_method
   FROM entity_xref
   WHERE entity_type = $1 AND internal_entity_id = $2;
   ```
   Backed by `entity_xref_internal_idx`.

**Writer contract.** Merges (cloud Pipeline + on-prem LocalPipeline) and the backend resolver
**upsert** on the unique key — re-running a merge re-asserts the same link (idempotent). A
manual correction sets `match_method='manual'` with `match_confidence=1.000`; the resolver
must never silently overwrite a `manual` link with a lower-confidence automated one.
`internal_entity_id` is the silver PK for `entity_type` and is **polymorphic** (no hard FK):
referential integrity is the writer's responsibility, validated per-type.

## Backfill plan (follow-up slice — no data moved in this PR)

The spine is seeded from the FKs that already encode resolved identity, **read-only, additive,
idempotent, no data loss** (source rows are untouched; `entity_xref` is derived):

| entity_type | Backfill source (existing resolved FK) | source_system, source_key |
|---|---|---|
| `account` | `account` merge lineage (per-source bronze ids, ADR-0039) | each populated `autotask`/`itglue`/`apollo`/`website` id on the account |
| `contact` | `contact` merge lineage + `external_identity` | website/autotask/itglue/m365/apollo keys |
| `device` | `device` merge lineage + `external_identity` | itglue/m365 config ids |
| `asset` | `cloud_asset` (ADR-0097) source linkage | cloud provider resource id |
| `opportunity` | `opportunity` merge lineage (ADR-0080) | website/autotask/KQM ids |

Each backfilled row is written `match_method='deterministic'`, `match_confidence=1.000`
(these are already-resolved FKs). The backfill is a set-based `INSERT … ON CONFLICT
(entity_type, source_system, source_key) DO NOTHING` so it is safe to re-run and never
duplicates. It is gated behind the resolver slice so the read contract above is stable
before any rows land.

## Boundaries

No PII, no secrets — `source_key` is a source-system identifier (Autotask company id, M365
tenant/user id, device serial, …), not personal data. Bitemporal validity (`valid_to` /
history) and the data-quality autonomy gate are later slices of #1049; `valid_from` is
present now as the forward-compatible seam.
