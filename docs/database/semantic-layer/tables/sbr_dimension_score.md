---
type: Silver Table
title: sbr_dimension_score
entity: sbr_dimension_score
archetype: B
description: Per-SBR re-score of the six security dimensions — a trend series benchmarked against the assessment baseline, reusing the assessment rating scale.
resource: ../../../decision-records/ADR-0022-assessment-led-gtm-and-engagement-model.md
tags: [silver, success, sbr, assessment, engagement]
data_class: client_pii
timestamp: 2026-06-23T00:00:00Z
---

# sbr_dimension_score

The per-SBR re-score of the six security dimensions, one row per dimension, captured at a
[`strategic_business_review`](strategic_business_review.md). It is a **trend series vs the
benchmark assessment** — not a copy of the assessment's scores — so successive SBRs show
whether an account's posture is improving against its baseline. Born silver — website system
of record. Governed by
[ADR-0022](../../../decision-records/ADR-0022-assessment-led-gtm-and-engagement-model.md)
(migration `0015`).

## Source of record / authority

**Website system of record, as a child of the SBR.** Each row re-scores one `dimension`
(`identity` | `endpoint` | `network` | `email` | `backup` | `incident`) — the same six
pillars the parent assessment scores — and reuses the assessment rating scale (enum
`assessment_rating`: `at_risk` | `needs_work` | `solid` | `strong`). `UNIQUE (sbr_id,
dimension)` enforces one re-score per dimension per SBR. The benchmark it trends against is the
parent SBR's `benchmark_assessment_id`; the assessment owns the baseline, this owns the
point-in-time re-score.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `sbr_id` | uuid | FK → `strategic_business_review` (ON DELETE CASCADE) — the owning SBR |
| `dimension` | text | `identity` \| `endpoint` \| `network` \| `email` \| `backup` \| `incident` |
| `rating` | assessment_rating | `at_risk` \| `needs_work` \| `solid` \| `strong` (reuses the assessment scale) |
| `note` | text | per-dimension narrative — client-sensitive |

> `UNIQUE (sbr_id, dimension)` — one re-score per dimension per review.

## Joins

- `sbr_id` → [`strategic_business_review`](strategic_business_review.md) (CASCADE). The trend
  is read against the SBR's `benchmark_assessment_id` → [`assessment`](assessment.md) baseline
  and the matching assessment pillar scores.

## Notes

Dimension ratings and notes describe a client's security posture — sensitive. Keep specifics
out of this doc; resolve against the live read-only DB.
