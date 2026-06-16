---
type: Silver Table
title: strategic_business_review
description: Periodic account re-benchmark against a prior assessment — website system of record; drives expansion.
resource: ../../../decision-records/ADR-0022-assessment-led-gtm-and-engagement-model.md
tags: [silver, success, sbr, engagement]
timestamp: 2026-06-15T00:00:00Z
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
| `account_id` | uuid | FK → `account` (ON DELETE CASCADE) — the owning company; SBRs are account-scoped |
| `contact_id` | uuid | FK → `contact` (nullable, ON DELETE SET NULL) — the client employee present |
| `conducted_by_user_id` | uuid | FK → `app_user` (nullable, ON DELETE SET NULL) — the Imperion lead |
| `benchmark_assessment_id` | uuid | FK → `assessment` (nullable, ON DELETE SET NULL) — the baseline re-scored against |
| `review_date` | date | when held |
| `period_label` | text | e.g. `2026-Q3` |
| `status` | text | `scheduled` \| `completed` (default `scheduled`) |
| `concerns` / `summary` / `next_actions` | text | review narrative — client-sensitive |
| `created_at` / `updated_at` | timestamptz | trigger-maintained (`set_updated_at`) |

Children:

| Table | Notes |
|---|---|
| `sbr_dimension_score` | per-SBR re-score, one row per `dimension` (`identity` \| `endpoint` \| `network` \| `email` \| `backup` \| `incident`); `rating` reuses enum `assessment_rating` (`at_risk` \| `needs_work` \| `solid` \| `strong`); `UNIQUE (sbr_id, dimension)` — a trend series vs the benchmark, not a copy |
| `sbr_ticket` | bridge to `ticket` (`UNIQUE (sbr_id, ticket_id)`) — references period ticket history, never copies it |

## Joins

- `account_id` → `account`; `benchmark_assessment_id` → `assessment`.
- Children (above): `sbr_dimension_score` (CASCADE), `sbr_ticket` (→ `ticket`, CASCADE).
- Can spawn `project` (`project.source_sbr_id`), `ticket` (`ticket.source_sbr_id`), and
  `opportunity` (`opportunity.source_sbr_id`) — provenance FKs, ADR-0023 (never copies).

## Notes

Review summaries describe client posture and plans — sensitive. Keep specifics out of this
doc; resolve against the live read-only DB.
