---
type: Silver Table
title: dns_golden
entity: dns_golden
archetype: E
description: The human-approved per-domain DNS baseline — the operator-approved snapshot that dns_domain drift is classified against; system of record is operator approval, not any external feed.
resource: ../../../decision-records/ADR-0063-dns-posture-tracking.md
tags: [silver, security, dns, golden, baseline]
timestamp: 2026-06-15T00:00:00Z
---

# dns_golden

The **human-approved baseline** for a domain's DNS — the approved snapshot every
subsequent capture is classified against. One row per domain. Governed by
[ADR-0063](../../../decision-records/ADR-0063-dns-posture-tracking.md) (mirrors the
ADR-0051 Golden State and LocalPipeline ADR-0008); migration `0080`. Approved by the
human-gated on-prem `Set-ImperionDnsGoldenState` (LocalPipeline #157).

## Source of record / authority

The **system of record is operator approval**, not any captured feed. A `dns_records`
capture is promoted to baseline only by an explicit human action
(`Set-ImperionDnsGoldenState`), which records `golden_hash` + `golden_records` plus who
approved (`golden_approved_by`) and when (`golden_approved_at`). This is the gate the
golden/drift archetype (ADR-0063 doctrine archetype **E**) depends on: drift only has
meaning relative to an approved golden, so a domain with no `dns_golden` row has no drift
classification (its `dns_domain` records are `ungoverned`).

Keyed `(tenant_id, domain)`. `account_id` is carried (additive, nullable, ADR-0063
amendment 2026-06-12) so golden state reads per account alongside the rest of the DNS
model.

## Schema

| Column | Type | Notes |
|---|---|---|
| `tenant_id` | text | part of PK |
| `domain` | text | part of PK |
| `golden_hash` | text | content hash of the approved record set (drift compares against this) |
| `golden_records` | jsonb | the approved record set itself (the baseline) |
| `golden_approved_at` | timestamptz | when the baseline was approved |
| `golden_approved_by` | text | the approving operator |
| `account_id` | uuid | FK → `account` (additive, nullable); per-account join key |

## Joins

- `account_id` → `account`; `domain` ↔ `account_domain` (the monitored-domain SoR list).
  Drives the drift classification rolled up in `dns_domain`. Compared against
  `dns_records` (the per-capture, two-plane snapshots) on each merge.

## Notes

Domains and approved DNS record detail are client-identifying — keep specifics (record
values, hashes, approver identities) out of this doc; resolve against the live read-only
DB. The approval is a deliberate human gate (ADR-0063 governance) and the classification
SQL that consumes this baseline is owned by `Get-ImperionDnsDrift` — code knowledge stays
in the cmdlets / ADR-0063, not here.
