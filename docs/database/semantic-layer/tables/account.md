---
type: Silver Table
title: account
description: Unified client/prospect company — one row per organization, merged from four bronze sources by precedence.
resource: ../../../decision-records/ADR-0039-per-source-bronze-tables.md
tags: [silver, crm, account, merge]
timestamp: 2026-06-14T00:00:00Z
---

# account

The silver company the app reasons over — one row per real organization, no matter how
many source systems it lives in. Governed by
[ADR-0039](../../../decision-records/ADR-0039-per-source-bronze-tables.md); union view
`account_bronze_all`.

## Source of record / authority

Four bronze sources merge; **precedence `website` > `autotask` > `itglue` > `apollo`**.
Each field is taken from the highest-precedence source that has it (a manual website
edit wins). A website row is app-created and pre-linked, so the merge **never creates**
an account from one (the resurrection guard).

- `website_companies` — manual entry, highest precedence.
- `autotask_companies` — the PSA company (system of record for managed clients).
- `itglue_companies` — documentation hub.
- `apollo_companies` — enrichment, lowest precedence.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | highest-precedence non-empty |
| `lifecycle_stage` | enum | where the org sits in the customer lifecycle |
| `relationship` | enum | e.g. prospect / client / vendor |
| `health_score` | numeric | derived account health |
| `owner_user_id` | uuid | FK → `app_user` |
| `is_active` | bool | |
| `created_at` / `updated_at` / `archived_at` | timestamptz | trigger-maintained |

## Joins

- The hub: `account_id` is referenced by `contact`, `device`, `opportunity`, `ticket`,
  `project`, `assessment`, `strategic_business_review`, `interaction`, `posture_snapshot`.
- Bronze origins via `account_bronze_all` (per-source rows + `source` discriminator).
- `account_tenant` / `account_domain` bind an account to its M365 tenant(s) and domains.

## Notes

Company names and identifiers are client-identifying — keep specific client values out of
this doc; resolve actuals against the live read-only DB.
