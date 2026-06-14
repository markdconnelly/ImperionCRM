---
type: Silver Table
title: posture_snapshot
description: Immutable Imperion Secure Score capture for an account — append-only; the grade is stored at capture and never recomputed.
resource: ../../../decision-records/ADR-0051-security-posture-model-imperion-secure-score.md
tags: [silver, security, posture, secure-score, append-only]
timestamp: 2026-06-14T00:00:00Z
---

# posture_snapshot

A point-in-time Imperion Secure Score for an account. Governed by
[ADR-0051](../../../decision-records/ADR-0051-security-posture-model-imperion-secure-score.md).
Per-pillar breakdown lives in `posture_snapshot_pillar`.

## Source of record / authority

**Append-only and immutable — `GRANT INSERT` only (no UPDATE/DELETE); the web role reads.**
The `grade` and `composite_score` are **stored at capture and never recomputed**, pinned
to `score_model_version` so a score is always reproducible as it was scored. `trigger`
records why it was taken (`scheduled` / `on_demand` / `business_review`).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` | uuid | FK → `account` |
| `taken_at` | timestamptz | capture time |
| `trigger` | text | scheduled / on_demand / business_review |
| `business_review_id` | uuid | FK → SBR (nullable) |
| `score_model_version` | integer | pins the scoring model |
| `composite_score` | numeric | stored at capture |
| `grade` | text | stored at capture, never recomputed |

## Joins

- `account_id` → `account`; `business_review_id` → `strategic_business_review`.
- Children: `posture_snapshot_pillar` (per-pillar 0–100 + weight). Live tenant rollup is
  `tenant_posture`.

## Notes

Scores describe a client's security posture — sensitive. Keep specific values out of this
doc; resolve against the live read-only DB.
