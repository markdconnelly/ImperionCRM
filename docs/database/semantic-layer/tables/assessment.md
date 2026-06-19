---
type: Silver Table
title: assessment
entity: assessment
archetype: B
description: Paid security/readiness assessment — website system of record, scored across six pillars; anchor of the assessment-led GTM.
resource: ../../../decision-records/ADR-0022-assessment-led-gtm-and-engagement-model.md
tags: [silver, sales, assessment, security]
timestamp: 2026-06-15T00:00:00Z
---

# assessment

The paid readiness assessment that anchors the go-to-market motion (lead → discovery →
paid assessment → managed services). Born silver — website system of record. Governed by
[ADR-0022](../../../decision-records/ADR-0022-assessment-led-gtm-and-engagement-model.md).

## Source of record / authority

**Website system of record.** Status drives the lifecycle
(`proposed → scheduled → in_progress → delivered → closed`); the six pillar ratings
capture the verdict, each on the same four-step scale
`at_risk → needs_work → solid → strong` (NULL = not yet scored). Evidence is held
separately in `assessment_artifact` (lossless per-source snapshots: Televy, M365 Graph,
scans, manual).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` | uuid | FK → `account` (ON DELETE CASCADE) |
| `opportunity_id` | uuid | FK → `opportunity` (ON DELETE SET NULL; the opportunity that sold it) |
| `name` | text | |
| `status` | enum `assessment_status` | `proposed` · `scheduled` · `in_progress` · `delivered` · `closed` |
| `fee_amount` | numeric | one-time paid-assessment fee |
| `credit_to_onboarding` | bool | fee credited toward onboarding on conversion (default true) |
| `identity_rating` `endpoint_rating` `network_rating` `email_rating` `backup_rating` `incident_rating` | enum `assessment_rating` | the six pillar ratings (Identity / Endpoint / Network / Email & Collaboration / Backup & Recovery / Incident Readiness), each `at_risk` · `needs_work` · `solid` · `strong`; NULL = not yet scored |
| `top_priorities` / `recommendation` | text | ranked priorities; recommendation (e.g. proceed to managed services) |
| `report_url` | text | written report / scorecard deliverable |
| `kickoff_at` / `delivered_at` | date / timestamptz | scheduled kickoff; set on delivered/closed |

## Joins

- `account_id` → `account`; `opportunity_id` → `opportunity`.
- `assessment_artifact` (evidence), and downstream: `project.source_assessment_id`,
  `ticket.source_assessment_id`, `strategic_business_review.benchmark_assessment_id`.

## Notes

Ratings, priorities, and report links describe a client's security posture — sensitive and
client-identifying. Keep specifics out of this doc; resolve against the live read-only DB.
