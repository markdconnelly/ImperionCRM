---
type: Silver Table
title: assessment
description: Paid security/readiness assessment — website system of record, scored across six pillars; anchor of the assessment-led GTM.
resource: ../../../decision-records/ADR-0022-assessment-led-gtm-and-engagement-model.md
tags: [silver, sales, assessment, security]
timestamp: 2026-06-14T00:00:00Z
---

# assessment

The paid readiness assessment that anchors the go-to-market motion (lead → discovery →
paid assessment → managed services). Born silver — website system of record. Governed by
[ADR-0022](../../../decision-records/ADR-0022-assessment-led-gtm-and-engagement-model.md).

## Source of record / authority

**Website system of record.** Status drives the lifecycle; six pillar ratings capture the
verdict. Evidence is held separately in `assessment_artifact` (lossless per-source
snapshots: Televy, M365 Graph, scans, manual).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` | uuid | FK → `account` |
| `opportunity_id` | uuid | FK → `opportunity` (nullable) |
| `name` | text | |
| `status` | enum | assessment lifecycle |
| `fee_amount` | numeric | paid-assessment fee |
| `credit_to_onboarding` | bool | fee credited if they proceed |
| `identity/endpoint/network/email/backup/incident_rating` | enum | the six pillar ratings |
| `top_priorities` / `recommendation` | text | |
| `report_url` | text | deliverable |
| `kickoff_at` / `delivered_at` | date / timestamptz | |

## Joins

- `account_id` → `account`; `opportunity_id` → `opportunity`.
- `assessment_artifact` (evidence), and downstream: `project.source_assessment_id`,
  `ticket.source_assessment_id`, `strategic_business_review.benchmark_assessment_id`.

## Notes

Ratings, priorities, and report links describe a client's security posture — sensitive and
client-identifying. Keep specifics out of this doc; resolve against the live read-only DB.
