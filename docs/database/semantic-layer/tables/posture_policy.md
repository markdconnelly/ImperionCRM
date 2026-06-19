---
type: Silver Table
title: posture_policy
entity: posture_policy
archetype: E
description: Per-policy security drift verdict for a tenant — observed M365 policy vs human-approved golden baseline across six policy families, classified compliant/drift/ungoverned/missing.
resource: ../../../decision-records/ADR-0051-security-posture-model-imperion-secure-score.md
tags: [silver, security, posture, policy, drift, golden]
timestamp: 2026-06-19T12:00:00Z
---

# posture_policy

The **row-level drift verdict** for a single security policy in a client tenant — the
detail behind the per-state counts rolled up in `tenant_posture`. One row per
`(tenant_id, policy_family, policy_id)`: the orchestrator's MSSP **drift-monitor** agent
grounds on this entity to decide whether a policy is in its approved state or has drifted.
Governed by [ADR-0051](../../../decision-records/ADR-0051-security-posture-model-imperion-secure-score.md)
§3; migration `0062` (pipeline-maintained silver, not a view). The golden baselines it joins
against (`*_golden`) land via migration `0038` (the original five families) and `0119`
(`purview_compliance`, admitted to the silver write by migration `0146` / #687).

## Source of record / authority

This is the **archetype-E golden/drift** entity: the verdict has no independent truth — it
is **computed** by full-outer-joining the **observed** policy against the **human-approved
golden** baseline, per tenant and family, keyed by content hash. The classification is the
SoR; both inputs are external.

- **Observed side** — the policy as actually configured in the client tenant, collected
  per family into the bronze observed tables (`entra_conditional_access_policies`,
  `intune_security_policies`, `device_configuration_policies`, `autopilot_policies`,
  `defender_xdr_security_policies`, `purview_compliance_policies`); `observed_hash` is its
  content hash.
- **Golden side** — the **operator-approved** baseline, one `*_golden` table per family
  (`conditional_access_policies_golden`, `intune_security_policies_golden`,
  `device_configuration_policies_golden`, `autopilot_policies_golden`,
  `defender_xdr_security_policies_golden`, `purview_compliance_golden`). The system of record
  here is **human approval**
  (each golden row carries `approved_by` / `approved_at`), not any captured feed — a policy
  has no `drift` meaning until a golden is approved for it. Same pattern as
  [`dns_golden`](dns_golden.md) is for [`dns_domain`](dns_domain.md).

The four verdict states (`classification`, ADR-0051 §3 — the FULL OUTER JOIN semantics,
authored on-prem by `Get-ImperionPolicyDrift`):

- **`compliant`** — observed present and `observed_hash` = `golden_hash`.
- **`drift`** — both present, hashes differ (**the actionable state** the agent dials on).
- **`ungoverned`** — observed, but no golden approved yet (an approval gap, not a breach).
- **`missing`** — golden approved, but the policy is not observed in the tenant.

`tenant_posture` carries the per-state **counts** these rows sum to; `posture_policy` is the
per-policy detail.

## Schema

| Column | Type | Notes |
|---|---|---|
| `tenant_id` | text | M365 tenant GUID; part of PK |
| `policy_family` | text | part of PK. CHECK ∈ `conditional_access` · `intune_security` · `device_configuration` · `autopilot` · `defender_xdr` · `purview_compliance` (the sixth family, admitted by migration `0146` / #687) |
| `policy_id` | text | source policy id; part of PK |
| `policy_name` | text | display name (nullable) |
| `classification` | text | the verdict. CHECK ∈ `compliant` · `drift` · `ungoverned` · `missing` |
| `observed_hash` | text | content hash of the observed policy (null when `missing`) |
| `golden_hash` | text | content hash of the approved golden (null when `ungoverned`) |
| `observed_modified_at` | timestamptz | when the observed policy last changed |
| `golden_approved_at` | timestamptz | when the golden baseline was approved |
| `refreshed_at` | timestamptz | last drift recompute |

## Joins

- `tenant_id` ↔ `account_tenant` (account binding when mapped — look-up, **not** FK, so an
  unmapped tenant's drift still lands and surfaces; **surface, never hide**) → `account`.
- **Roll-up:** `tenant_posture` (the per-state counts `policies_compliant` /
  `policies_drift` / `policies_ungoverned` / `policies_missing` that these rows sum into).
- **Inputs:** the per-family observed bronze tables (above) on the observed side and the
  per-family `*_golden` tables on the approved side — joined `(tenant_id, policy_family,
  policy_id)` by content hash.
- **Acting workflow:** the autonomy-dialed drift-monitor agent reasons over `drift` rows;
  remediation/approval of a golden baseline is a deliberate human gate (ADR-0051
  governance).

## Notes

Tenant GUIDs, policy names, and hashes are client-identifying security data — keep specific
values out of this doc; resolve against the live read-only DB. The FULL OUTER JOIN drift
SQL and the golden-approval cmdlet are owned by the on-prem pipeline (`Get-ImperionPolicyDrift`,
ADR-0051) — code knowledge stays in the cmdlets / ADR, not here.
