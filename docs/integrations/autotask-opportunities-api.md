# Autotask Opportunities — read shape (`autotask_opportunities` bronze)

[← Integrations](README.md) ·
[opportunity (silver concept)](../database/semantic-layer/tables/opportunity.md) ·
[Capability overview](../product/imperion-os-overview.md#4-extras--beyond-classic-crmerp)

The Autotask **Opportunity** entity is **one of the three bronze sources** that merge into
the silver [`opportunity`](../database/semantic-layer/tables/opportunity.md) (KQM quote
header · **Autotask** · website manual entry — ADR-0080, migration `0083`). This page is the
spike output for issue **#430** (epic #425, mirror of the KQM-side spike #427): it
characterizes the Autotask Opportunities **read shape**, fixes the curated
`autotask_opportunities` bronze columns, and pins the join path to silver
`opportunity` / forecast.

> **Status: SHAPE DEFINED — live field-metadata probe owed (LP).** The
> `autotask_opportunities` bronze table already exists (`0083`) with a best-effort column
> subset explicitly "pending the #430 field-metadata probe". This doc settles the *intended*
> read shape from the documented Autotask REST contract + the #428/ADR-0080 join model. The
> **live confirmation** (`GET /Opportunities/entityInformation/fields`, enum sampling) needs
> the Autotask credential in `kv-imperioncrm-prd` and runs from
> `ImperionCRM_LocalPipelineEnrichment` (which ingests this bronze) — it cannot run from this
> GUI repo (no provider secret here, ADR-0042). That probe is a follow-up build issue (see
> [Open dependencies](#open-dependencies)); this spike does **not** require a migration —
> the `0083` shape already matches the design below.

No secrets here — the Autotask API user / secret / integration code are custodied in Key
Vault by the sibling repos (CLAUDE.md §5).

## What it is to the platform

Autotask is **polled, never duplicated** (README §4.1): Imperion is *not* the system of
record for the Autotask Opportunity — it reads it on a cadence and contributes its fields
into the merged silver `opportunity`. In the three-source merge, **precedence is
`website` > `autotask` > `kqm`** (ADR-0039 / ADR-0080): a human override wins, Autotask
beats the raw KQM quote header for the deal-management fields (stage, probability, amount,
projected close, owner) that Autotask owns and KQM does not.

The unique value Autotask adds beyond the KQM quote header (so the precedence is meaningful):

| Field | Why it matters |
|---|---|
| `stage` | Autotask is the deal-stage system of record — KQM only has a quote `status` int enum. |
| `probability` | Win % lives in Autotask; feeds the silver `opportunity.win_probability` / weighted forecast (ADR-0072). |
| `amount` | Autotask's deal amount, independent of the KQM line sum. |
| `projected_close_date` | Maps to `opportunity.expected_close_date` — the forecast period (ADR-0072). |
| `owner_resource_id` | The Autotask owner resource — resolves to the deal owner (the quota/forecast roll-up axis). |

## Read mechanics

- **Entity:** Autotask REST `Opportunities` (`/atservicesrest/v1.0/Opportunities`).
- **Field metadata (the probe):** `GET /atservicesrest/v1.0/Opportunities/entityInformation/fields`
  returns every field's name, dataType, isRequired, isQueryable, and picklist values for
  enum fields (e.g. `stage`, `status`) — read-only, no row data. This is the authoritative
  source for the flat-column set + the enum decode and is what the LP follow-up confirms live.
- **Query sample:** a small `POST /Opportunities/query` (names + enum values only, no
  client-identifying row data copied anywhere) confirms the shapes in practice.
- **Auth:** the three Autotask REST headers — `ApiIntegrationCode`, `UserName`, `Secret` —
  resolved from Key Vault (`kv-imperioncrm-prd`); never on a command line, never logged.
- **Incremental watermark:** poll on `lastActivityDate` (the candidate incremental field) —
  confirmed by the probe; landed as `last_activity_date` in bronze for the cloud/LP poll to
  watermark against (poll cadence honoured per `poll_interval_minutes`, README §4.2).

## Bronze landing shape (`autotask_opportunities`, migration `0083`)

LP **lossless-envelope** style (the same shape as the sibling KQM/Autotask bronze the LP
already writes): flat **text** columns for the curated/queryable subset, true types preserved
in `raw_payload jsonb`, keyed by the source envelope. **No migration change is needed** — the
existing `0083` columns already realize this design:

| Column | Autotask field | Notes |
|---|---|---|
| `company_id` | `companyID` | **join key** → KQM `autotask_organization_id` → silver account. |
| `title` | `title` | deal name. |
| `status` | `status` (picklist) | open/lost/won-style enum (decode from `entityInformation`). |
| `stage` | `stage` (picklist) | deal stage — Autotask's unique contribution. |
| `amount` | `amount` | deal amount (text in bronze, true type in `raw_payload`). |
| `cost` | `cost` | deal cost. |
| `probability` | `probability` | win % — feeds forecast. |
| `projected_close_date` | `projectedCloseDate` | → silver `expected_close_date`. |
| `owner_resource_id` | `ownerResourceID` | deal owner (Autotask resource). |
| `quote_id` | `quoteID` (if present) | the quote linkage — **probe confirms** whether Autotask exposes a quote id directly. |
| `created_date` | `createDate` | |
| `last_activity_date` | `lastActivityDate` | poll watermark. |
| `tenant_id`, `source`, `external_id` | envelope | PK `(tenant_id, source, external_id)`; **`external_id` = Autotask `Opportunities.id`**. |
| `collected_at`, `raw_payload`, `content_hash` | envelope | lossless raw payload + change-detect hash. |

`COMMENT ON TABLE autotask_opportunities` (in `0083`) already records `external_id = Autotask
opportunity id ⟵ KQM autotask_opportunity_id` and flags the columns as the #430-pending subset.

### Probe outcomes that would warrant a follow-up migration

The shape above is judged complete for v1. A migration is only warranted if the live probe
finds:

1. **A direct quote id field** that differs from the assumed `quoteID` (rename `quote_id`), or
   no quote linkage at all (then the KQM `autotask_quote_id` is the only seam — note in the doc).
2. **An additional queryable field** the merge needs that isn't covered (add a flat column).
3. **An enum decode** that must be materialized rather than left in `raw_payload`.

None of these block the spike; each is an additive, idempotent `ALTER TABLE` filed as its own
micro-issue if the probe surfaces it.

## Join path to silver `opportunity` / forecast

```
autotask_opportunities.external_id  (= Autotask Opportunities.id)
        ⟵ kqm_opportunities.autotask_opportunity_id        (cross-source join key)
autotask_opportunities.company_id   (= Autotask companyID)
        ⟵ kqm_opportunities.autotask_organization_id  →  silver account

opportunity_bronze_all (view, 0083): unions kqm | autotask | website
        on (source, external_id, title, status_raw, autotask_opportunity_id, account_external_ref)
        →  silver opportunity MERGE (precedence website > autotask > kqm; ADR-0039 — a
           Pipeline-repo transform, NOT this front end and NOT touched by 0083)
        →  forecast fields (expected_close_date ← projected_close_date,
           win_probability ← probability) drive lib/forecast.ts (ADR-0072, 0114)
```

- **`external_id` is the cross-source join key**: the Autotask opportunity id equals the
  value KQM carries as `autotask_opportunity_id`, so the merge stitches the KQM quote header
  and the Autotask deal record into one silver row.
- **`company_id`** → the silver account (via the same id KQM carries as
  `autotask_organization_id`).
- The Autotask deal fields (`stage`, `probability`, `amount`, `projected_close_date`,
  `owner_resource_id`) carry into the merged `opportunity`, where the forecast layer
  (ADR-0072, migration `0114`) reads `expected_close_date` + `win_probability`.

## Security impact

Read-only against Autotask (`entityInformation` + a names/enum-only query sample). No
secrets in this repo (Key Vault custody, ADR-0042). Opportunity titles and `company_id` can
carry client identity — **no row-level data is recorded here**; resolve specifics against the
live read-only DB (CLAUDE.md §8). Reads are RBAC-gated server-side once merged into the
revenue-sensitive silver `opportunity` (ADR-0030 `canSeeRevenue`).

## Open dependencies

| Dependency | Owner | Blocks |
|---|---|---|
| Live `Opportunities/entityInformation/fields` probe + enum sampling | `ImperionCRM_LocalPipelineEnrichment` (holds the Autotask credential) | confirming the column set / enum decode / quote-id field — follow-up issue **#1325**. |
| Autotask company credential seeded in `kv-imperioncrm-prd` | Operator (Mark-gated) | any live Autotask read; today the bronze is deploy-dormant (only `autotask_companies` is populated). |
| Silver `opportunity` MERGE recompute over `opportunity_bronze_all` | `ImperionCRM_Pipeline` (ADR-0039) | the Autotask fields reaching the app-facing silver row (a follow-up slice, not this spike). |
