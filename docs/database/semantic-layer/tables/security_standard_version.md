---
type: Silver Table
title: security_standard_version
entity: security_standard_version
archetype: H
description: The evolving client security standard, versioned — draft → Mark-gated ratified → superseded; the current standard is the highest ratified version.
resource: ../../../decision-records/ADR-0051-security-posture-model-imperion-secure-score.md
tags: [silver, security, posture, standard, versioned, governance]
data_class: security_credentials
timestamp: 2026-07-01T00:00:00Z
---

# security_standard_version

One row per version of the **client security standard** Vera evolves and clients are
scored against (migration 0256, [#1715](https://github.com/markdconnelly/ImperionCRM/issues/1715);
consumer = backend #439, pairs LocalPipeline #399). `criteria` is the declarative rule
document (`minCompositeScore` / `requiredPillars` / `criticalCompositeFloor`, …) the
posture-vs-standard score evaluates.

## Source of record / authority

**Imperion-native governance record — authored here, not ingested.** Lifecycle is
`draft → ratified → superseded`; **ratification is Mark-gated** (a backend conditional
UPDATE from `draft`, audited, never automatic). The **current standard = the highest
`version_number` with `status='ratified'`**. Ratified versions are never edited or
deleted — a change is a new version; the old one is superseded. Backend holds
SELECT/UPDATE (ratify); LP reads for scheduled scoring; web reads.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `version_number` | integer | UNIQUE, monotonic; current = MAX ratified |
| `status` | text | draft / ratified / superseded |
| `criteria` | jsonb | declarative StandardCriteria; unknown fields ignored (forward-compatible) |
| `ratified_by_user_id` | uuid | FK → `app_user` (audit attribution, nullable) |
| `ratified_at` | timestamptz | nullable until ratified |
| `created_at` | timestamptz | |
| `superseded_at` | timestamptz | nullable |

## Joins

- `ratified_by_user_id` → `app_user` (who ratified).
- Children: `posture_score.standard_version_id` — every verdict pins the version whose
  criteria produced it.

## Notes

Governance/posture metadata — no PII, no secrets, no client identifiers. The criteria
describe the MSP's security bar; specific client scores live in `posture_score` and
resolve against the live read-only DB.
