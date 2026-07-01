---
type: Silver Table
title: posture_score
entity: posture_score
archetype: C
description: Posture-vs-standard scoring verdict — one append-only row per (account, standard version, posture snapshot); conforming / drifting / critical.
resource: ../../../decision-records/ADR-0051-security-posture-model-imperion-secure-score.md
tags: [silver, security, posture, scoring, standard, append-only]
data_class: security_credentials
timestamp: 2026-07-01T00:00:00Z
---

# posture_score

The verdict of scoring a client's immutable [`posture_snapshot`](posture_snapshot.md)
against a [`security_standard_version`](security_standard_version.md) (migration 0256,
[#1715](https://github.com/markdconnelly/ImperionCRM/issues/1715)): an `overall_score`
plus `conforming | drifting | critical`.

## Source of record / authority

**Computed, append-only ledger.** Writers are the backend scoring API (#439) and the
LocalPipeline scheduled scoring cycle (LP #399) — both INSERT-only with
`ON CONFLICT DO NOTHING` on the **UNIQUE (account_id, standard_version_id,
posture_snapshot_id)**, so re-scores are idempotent and a verdict is never recomputed
in place: a new snapshot or a new standard version means a NEW row. Nobody holds
UPDATE/DELETE — verdict history is governance record. Web reads.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` | uuid | FK → `account` |
| `posture_snapshot_id` | uuid | FK → `posture_snapshot` (the immutable input) |
| `standard_version_id` | uuid | FK → `security_standard_version` (the criteria used) |
| `overall_score` | numeric | stored at scoring |
| `conformance_status` | text | conforming / drifting / critical |
| `scored_at` | timestamptz | |

## Joins

- `account_id` → `account`; `posture_snapshot_id` → `posture_snapshot`;
  `standard_version_id` → `security_standard_version`.
- Drift over time: compare consecutive verdicts per account (LP #399 emits drift
  signals when a client falls out of conformance or the standard version changes).

## Notes

Verdicts describe a client's security posture — sensitive (`security_credentials`
class). Keep specific values out of this doc; resolve against the live read-only DB.
