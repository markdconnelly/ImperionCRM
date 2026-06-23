---
type: Silver Table
title: tenant_posture
entity: tenant_posture
archetype: E
description: Per-M365-tenant security rollup — current Secure Score plus policy drift classification counts; keyed by tenant, surfaces unmapped.
resource: ../../../decision-records/ADR-0051-security-posture-model-imperion-secure-score.md
tags: [silver, security, posture, tenant, drift]
data_class: security_credentials
timestamp: 2026-06-22T00:00:00Z
---

# tenant_posture

The current per-tenant posture rollup, recomputed on each posture merge — the live
one-row-per-tenant counterpart to the immutable `posture_snapshot` history. Governed by
[ADR-0051](../../../decision-records/ADR-0051-security-posture-model-imperion-secure-score.md);
per-policy detail (the row-level verdicts these counts sum) lives in `posture_policy`.

## Source of record / authority

**Keyed by M365 `tenant_id` (a client tenant GUID), deliberately NOT FK'd to
`account_tenant`** — posture for an unmapped tenant still lands and surfaces in the
"unmapped" list rather than being rejected (**surface, never hide**); account binding is a
look-up through `account_tenant`, not a constraint.

This is an **archetype-E golden/drift rollup**. The per-policy verdict is computed in
`posture_policy` by full-outer-join of the **observed** policy (collected per tenant) vs
the **human-approved golden** baseline — the per-family `*_golden` tables (one per the five
`policy_family` values: `conditional_access` · `intune_security` · `device_configuration` ·
`autopilot` · `defender_xdr`), keyed by content hash. The four verdict states (ADR-0051 §3):

- **`compliant`** — observed hash equals the approved golden hash.
- **`drift`** — both present but differ (the actionable state).
- **`ungoverned`** — observed, but no golden has been approved for it yet.
- **`missing`** — golden approved, but the policy is not observed in the tenant.

`tenant_posture` carries the per-state **counts** rolled up across all of a tenant's
policies; the Secure Score columns are the captured observed score (not drift-classified).

## Schema

| Column | Type | Notes |
|---|---|---|
| `tenant_id` | text | M365 tenant GUID (PK) |
| `secure_score_current` / `secure_score_max` | numeric | captured observed Secure Score (not drift-classified) |
| `licensed_user_count` / `active_user_count` | integer | |
| `policies_compliant` / `policies_drift` / `policies_ungoverned` / `policies_missing` | integer | per-state drift counts (compliant=match · drift=differ · ungoverned=no golden · missing=golden not observed) |
| `exposures_open` | integer | open credential exposures (rolled from `credential_exposure`) |
| `refreshed_at` | timestamptz | last rollup |

## Joins

- `tenant_id` ↔ `account_tenant` (account binding when mapped; look-up, not FK) → `account`.
- **Detail / drift sources:** `posture_policy` (the per-policy `compliant`/`drift`/
  `ungoverned`/`missing` verdicts these counts sum — the observed side) and the per-family
  `*_golden` tables (the human-approved side the verdict joins against).
- **History:** `posture_snapshot` (immutable per-capture). Also `credential_exposure`
  (feeds `exposures_open`).

## Notes

Tenant GUIDs and scores are client-identifying security data — keep specifics out of this
doc; resolve against the live read-only DB.
