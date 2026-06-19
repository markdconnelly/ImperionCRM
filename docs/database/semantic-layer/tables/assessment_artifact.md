---
type: Silver Table
title: assessment_artifact
entity: assessment_artifact
archetype: B
description: Evidence store for an assessment — Televy / M365 / Google / scan / phishing-sim outputs held once as received, with optional normalized and summary forms.
resource: ../../../decision-records/ADR-0023-engagement-capture-and-relationship-data-model.md
tags: [silver, sales, assessment, evidence, televy]
timestamp: 2026-06-15T00:00:00Z
---

# assessment_artifact

The evidence behind a paid assessment: Televy reports/analytics, current-state pulls from
the client's Microsoft 365 / Google environment, and external scan or phishing-simulation
outputs. Each artifact is stored **once as received** (bronze), with optional normalized
(silver) and summary (gold) forms for downstream use — the parent `assessment` carries the
verdict, this carries the proof. Governed by
[ADR-0023](../../../decision-records/ADR-0023-engagement-capture-and-relationship-data-model.md).

## Source of record / authority

**Per-source, captured under the parent assessment.** `source` names the originating system
(`televy` · `m365_graph` · `google_workspace` · `external_scan` · `phishing_sim` ·
`manual`) and is authoritative for that artifact; collection runs in external functions
(ADR-0018), this is only the store. The bronze→silver→gold ladder
(`payload_bronze` → `normalized_silver` → `summary_gold`) preserves the lossless original.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `assessment_id` | uuid | FK → `assessment` (cascade) |
| `source` | enum | originating system (see above) |
| `kind` | enum | `report` · `analytics` · `snapshot` · `finding` · `metric` |
| `title` | text | |
| `dimension` | text | which scorecard dimension it informs (optional) |
| `collected_at` | timestamptz | |
| `payload_bronze` | jsonb | raw as received |
| `normalized_silver` | jsonb | cleaned/normalized |
| `summary_gold` | text | agent-ready summary |
| `blob_ref` | text | pointer to a report file in object storage |
| `external_ref` | text | source-system identifier |

## Joins

- `assessment_id` → `assessment`; through it, → `account` and `opportunity`.

## Notes

Artifacts capture a client's security posture and environment detail — highly sensitive and
client-identifying. Keep specifics (findings, scan output, report links) out of this doc;
resolve against the live read-only DB.
