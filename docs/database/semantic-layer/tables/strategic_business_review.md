---
type: Silver Table
title: strategic_business_review
description: Periodic account re-benchmark against a prior assessment — website system of record; drives expansion.
resource: ../../../decision-records/ADR-0022-assessment-led-gtm-and-engagement-model.md
tags: [silver, success, sbr, engagement]
timestamp: 2026-06-14T00:00:00Z
---

# strategic_business_review

The recurring account-health review (SBR) that re-benchmarks a client against a prior
assessment and drives expansion opportunities and remediation tickets. Born silver —
website system of record. Governed by
[ADR-0022](../../../decision-records/ADR-0022-assessment-led-gtm-and-engagement-model.md).

## Source of record / authority

**Website system of record.** `benchmark_assessment_id` ties the review to the assessment
it re-scores against; per-dimension scores live in `sbr_dimension_score` (mirroring the
assessment pillars), and remediation links in `sbr_ticket`.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` | uuid | FK → `account` |
| `contact_id` | uuid | FK → `contact` (nullable) |
| `conducted_by_user_id` | uuid | FK → `app_user` |
| `benchmark_assessment_id` | uuid | FK → `assessment` |
| `review_date` | date | |
| `period_label` | text | e.g. quarter label |
| `status` | text | |
| `concerns` / `summary` / `next_actions` | text | |

## Joins

- `account_id` → `account`; `benchmark_assessment_id` → `assessment`.
- Children: `sbr_dimension_score`, `sbr_ticket` (→ `ticket`). Can spawn `project`
  (`project.source_sbr_id`).

## Notes

Review summaries describe client posture and plans — sensitive. Keep specifics out of this
doc; resolve against the live read-only DB.
