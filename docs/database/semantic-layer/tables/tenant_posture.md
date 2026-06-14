---
type: Silver Table
title: tenant_posture
description: Per-M365-tenant security rollup — current Secure Score plus policy drift classification counts; keyed by tenant, surfaces unmapped.
resource: ../../../decision-records/ADR-0051-security-posture-model-imperion-secure-score.md
tags: [silver, security, posture, tenant, drift]
timestamp: 2026-06-14T00:00:00Z
---

# tenant_posture

The current per-tenant posture rollup, recomputed on each posture merge. Governed by
[ADR-0051](../../../decision-records/ADR-0051-security-posture-model-imperion-secure-score.md).

## Source of record / authority

**Keyed by M365 `tenant_id` (a client tenant GUID), deliberately NOT FK'd to
`account_tenant`** — posture for an unmapped tenant still lands and surfaces in the
"unmapped" list rather than being rejected (**surface, never hide**). Policy state is a
**drift classification** (`compliant` / `drift` / `ungoverned` / `missing`) computed by
full-outer-join of observed policy vs the human-approved golden (`*_golden` tables);
counts are rolled up here.

## Schema

| Column | Type | Notes |
|---|---|---|
| `tenant_id` | text | M365 tenant GUID (PK) |
| `secure_score_current` / `secure_score_max` | numeric | current Secure Score |
| `licensed_user_count` / `active_user_count` | integer | |
| `policies_compliant` / `policies_drift` / `policies_ungoverned` / `policies_missing` | integer | drift classification counts |
| `exposures_open` | integer | open credential exposures |
| `refreshed_at` | timestamptz | last rollup |

## Joins

- `tenant_id` ↔ `account_tenant` (account binding, when mapped). Detail: `posture_policy`
  (per-policy classification), `posture_snapshot` (immutable history), `credential_exposure`.

## Notes

Tenant GUIDs and scores are client-identifying security data — keep specifics out of this
doc; resolve against the live read-only DB.
