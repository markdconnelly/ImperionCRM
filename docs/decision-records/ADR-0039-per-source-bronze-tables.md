# ADR-0039: Per-source physical bronze tables + union-view merge → silver

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted (supersedes ADR-0032) |
| **Date** | 2026-06-08 |
| **Supersedes** | ADR-0032 |
| **Cross-references** | pipeline ADR-0006, pipeline ADR-0009 |

## Problem

Bronze landed every source for a contact/company into ONE enum-discriminated table
(`contact_source` / `account_source`, ADR-0032) with a `source` column. We want **one
physical bronze table per (source, entity)** — each fed by its own pipeline — for clearer
per-source pipelines, per-source indexing/retention, and room for source-specific columns
later. We also need a new **`device`** entity (assets), which had no model at all.

## Context

`contact` / `account` are already the unified **silver** records the app reads everywhere, and
the pipeline's merge (`ImperionCRM_Pipeline`, pipeline ADR-0006) folds sources into them by
precedence. The app reads bronze only through `listContactSources` / `listAccountSources`
(feeding the "Data sources" popup). So the change is the bronze **shape** + the merge inputs +
those two read methods — silver and the rest of the app are unchanged.

## Options considered

1. **Keep the enum-discriminated single table** (status quo) — simplest, but one table per type
   conflates sources and blocks per-source schemas.
2. **One physical table per (source, entity)** (chosen) — `autotask_contacts`, `apollo_contacts`,
   …; merge unions them into silver.
3. New silver tables for everything — rejected; `contact`/`account` already serve as silver and
   the whole app reads them.

## Decision

- **Bronze (12 tables):** `<source>_<entity>` — contacts (`autotask`, `apollo`, `m365`, `itglue`,
  `website`), companies (`autotask`, `apollo`, `itglue`, `website`), devices (`itglue`, `m365`,
  `website`). Uniform columns (silver FK, `external_ref UNIQUE`, `payload_bronze`,
  `normalized_silver`, match metadata, timestamps); `source` is implicit in the table name.
  `365` → `m365_*` (a SQL identifier can't begin with a digit); the UI label stays "Microsoft 365".
- **Silver:** reuse `contact` / `account`; add a new **`device`** table (merge-populated; no app
  UI yet).
- **Union views** `contact_bronze_all` / `account_bronze_all` / `device_bronze_all` re-introduce a
  `source` key literal so the app's "Data sources" popup and the pipeline merge can scan all
  sources for an entity. Views are **read-only**; all writes target the physical tables.
- **Manual entries = `website` source** (replacing `imperion_crm_entered`): `createContact` /
  `updateContact` (and account equivalents) upsert a `website_*` bronze row pre-linked to the
  silver record, so manual data is provenance-tracked and wins at top merge precedence;
  `deleteContact` / `deleteAccount` remove it. Best-effort — never blocks the user action.
- **Migrations:** `0036` creates the 12 tables, `device`, the 3 views, indexes, triggers
  (non-destructive). `0037` drops `contact_source` / `account_source` + their enums **after** the
  new code is deployed (zero-downtime expand/contract).

## Consequences

### Security impact

None new — bronze holds the same raw source payloads (no secrets; tokens stay in Key Vault).
Per-source tables make per-source retention/redaction policies easier to apply later.

### Cost impact

Negligible. More tables/views but the same row volume; `LIKE … INCLUDING ALL` keeps the schema
DRY. No new dependency.

### Operational impact

Deploy is expand/contract: apply `0036`, deploy app + pipeline, then apply `0037`. "Drop &
recreate fresh" — no data migration; bronze is a re-fetchable cache and the next source poll
re-lands into the new tables (silver `contact`/`account` rows persist). The pipeline side is
pipeline ADR-0009.

## Future considerations

Wire the device source pulls (IT Glue Configurations, M365/Intune via GDAP) and a device UI;
add source-specific typed columns where useful; gold summaries + embeddings unchanged.
