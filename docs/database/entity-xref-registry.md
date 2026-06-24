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

## Live write paths (going forward)

Backfill seeds history; new identities enter the spine as they are curated:

- **M365 client credential registration (#1286).** Registering a client tenant's M365 app
  credential on `/settings/client-mapping/m365` (`registerClientM365Action`) now **auto-maps**
  the tenant on success — it mirrors the client-mapping dual-write (ADR-0112): the `entity_xref`
  account link via the backend (the authority) **and** the legacy `account_tenant` row (the join
  key the posture rollups + the on-prem pipeline read, #1049). The admin already binds
  account↔tenant on the form, so no separate mapping step is needed: the on-prem 365/Azure
  collectors discover the tenant on their next run (they fail closed on an unmapped tenant —
  `ImperionPipeline/Private/ImperionContext.ps1`). Both writes are best-effort (the credential is
  already custodied) and idempotent (re-saving a rotated secret just refreshes the mapping).
- **Manual curation.** `linkClientMappingAction` / `unlinkClientMappingAction` write the same
  pair for any connector unit an admin maps by hand on the client-mapping screen.

## Data-quality autonomy gate (#1113, migration 0194 — epic #1049 pillar 3, FINAL slice)

Resolving the right entity (#1111) and knowing what was true/believed when (#1112) is not enough
for an *autonomous* Technician: it must also refuse to act on **stale or incomplete** data. Pillar
3 makes data quality a **safety control on the action plane** — the same shape as the always-gate
hard ceiling (data_class, 0175; earned autonomy, #1036): a one-way clamp that can only ever route
an action **to the human cockpit**, never raise autonomy ("freshness = correctness").

- **The SLA policy — `dq_sla` (data, not schema).** One row per `data_class` (the 0175
  sensitivity axis — the gate is keyed on *what kind of data* the action touches, the axis the
  action ceiling already uses), defining `max_age_seconds` (freshness) and `min_completeness`
  (fraction of SLA-required fields populated, `[0,1]`). always-gate classes
  (financial / security_credentials / client_pii) carry the tightest SLA (1h / 1.000);
  `operational` is loosest (24h / 0.800). Tune by UPDATE-ing a row — never a migration.
- **The gate — `entity_dq_gate(data_class, age_seconds, completeness) → boolean`.** TRUE iff the
  record MEETS its class SLA (the action may proceed on DQ grounds); FALSE on any breach **or**
  unknown class **or** NULL input — **fail-closed** (we can't prove the data is good → route to a
  human). The backend dispatcher computes a record's age + completeness at dispatch and calls this
  AFTER the dial+earned verdict; a breach DOWNGRADES an otherwise-inline decision to `cockpit`.
- **FE mirror — `src/lib/agent/data-quality-gate.ts`** (pure): `evaluateDqGate` mirrors the SQL
  predicate; `gateDispatchOnDataQuality(resolution, quality)` layers the gate onto a
  `DispatchResolution` (action-dispatch.ts) as the **third** dispatch gate, returning
  `gatedDecision` + a PII-free breach reason (`stale` / `incomplete` / `unknown`) for the cockpit
  badge. `DEFAULT_DQ_SLA` mirrors the 0194 seed (kept in lockstep, the action-dispatch precedent).

The spine is deploy-dormant (`entity_xref` empty in prod), so the gate evaluates **0 live
actions** today and lights up with the rest of #1049. This **completes epic #1049**.

## Boundaries

No PII, no secrets — `source_key` is a source-system identifier (Autotask company id, M365
tenant/user id, device serial, …), not personal data; the DQ gate carries only class names +
a record's age/completeness numbers. Bitemporal validity (valid-time `valid_to` + system-time
`system_from`/`system_to`, #1112) is **DONE — migration 0191**; the data-quality autonomy gate
(#1113) is **DONE — migration 0194**, completing epic #1049. `entity_resolve`'s predicate is now
`valid_from <= now() < COALESCE(valid_to, 'infinity')` AND `system_to IS NULL` — 0191 extended
0190's `valid_from <= now()` seam without changing the resolver signature or any caller.
