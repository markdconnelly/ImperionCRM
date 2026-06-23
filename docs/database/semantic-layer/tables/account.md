---
type: Silver Table
title: account
entity: account
archetype: A
description: Unified client/prospect company — one row per organization, merged from four bronze sources by precedence; the CRM hub everything joins to.
resource: ../../../decision-records/ADR-0039-per-source-bronze-tables.md
tags: [silver, crm, account, merge]
data_class: operational
timestamp: 2026-06-22T00:00:00Z
---

# account

The silver company the app reasons over — one row per real organization, no matter how
many source systems it lives in, and the hub the rest of the CRM hangs off. Governed by
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

## Bronze match / merge

How the four sources collapse to one real org (Pipeline `account-matcher`):

1. **Domain match** (confidence `0.95`) — a source row joins an existing account when its
   normalized `domain` equals that account's (`account_bronze_all.normalized_silver->>'domain'`).
2. **Name match** (`0.6`) — else case-insensitive `name` equality among **unarchived**
   accounts.
3. **Create** (`1.0`) — else a new account is inserted (name only); never from a website
   row (the resurrection guard).

Once linked, each account is **recomputed** from all its linked source rows by the
precedence above (`name` is the merged field today).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | highest-precedence non-empty |
| `lifecycle_stage` | enum | `prospect` · `onboarding` · `implementation` · `operational_readiness` · `managed_active` · `dormant` (default `prospect`) — where the org sits in the customer lifecycle |
| `relationship` | enum | `prospect` · `customer` · `partner` (NULL = unknown) — the CRM "Type" (migration 0003) |
| `health_score` | numeric | derived account health — **Phase 2 signal weighting; NULL until scored** |
| `owner_user_id` | uuid | FK → `app_user` |
| `is_active` | bool | |
| `created_at` / `updated_at` / `archived_at` | timestamptz | trigger-maintained; `archived_at` NULL = live (name-match considers unarchived only) |

## Joins

- The hub: `account_id` is referenced by `contact`, `device`, `opportunity`, `ticket`,
  `project`, `assessment`, `strategic_business_review`, `interaction`, `posture_snapshot`.
- Bronze origins via `account_bronze_all` (per-source rows + `source` discriminator).
- **`account_tenant`** (migration 0061, ADR-0051) — binds an account to its M365 tenant(s).
  Tenant GUID is the PK: one account per tenant, an account may own several. **Explicit,
  admin-managed mapping — never inferred from domains** (ADR-0051 rejected the domain-match
  approach for posture). The authority for "which account owns this tenant"; the
  security-posture tables read account-scoped through it.
- **`account_domain`** (migration 0081, ADR-0063 amendment) — GUI-curated per-account
  domain list `(account_id, domain)`; the **source of truth for DNS posture** (the resolver
  checks each domain; drift rolls up per domain). Distinct from tenant binding.

## Notes

Company names and identifiers are client-identifying — keep specific client values out of
this doc; resolve actuals against the live read-only DB.
