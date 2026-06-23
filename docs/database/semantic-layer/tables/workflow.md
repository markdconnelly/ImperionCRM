---
type: Silver Table
title: workflow
entity: workflow
archetype: B
description: Automation sequence (nurture / pre-discovery / re-engagement / journey) — website system of record; legacy kinds parent steps + enrollments, journeys are a single object.
resource: ../../../decision-records/ADR-0027-pre-discovery-automation-and-agent-answer-approval.md
tags: [silver, automation, workflow, nurture, journey]
data_class: operational
timestamp: 2026-06-22T00:00:00Z
---

# workflow

A contact-automation sequence. Born silver — website system of record. Governed by
[ADR-0027](../../../decision-records/ADR-0027-pre-discovery-automation-and-agent-answer-approval.md);
marketing journeys in
[ADR-0073](../../../decision-records/ADR-0073-marketing-automation-journeys.md).

## Source of record / authority

**Website system of record.** `kind` is an enum (`nurture` / `pre_discovery` /
`re_engagement` / `journey`); `trigger` (jsonb) defines enrollment criteria. A contact's
run is `workflow_enrollment` (one ACTIVE per `workflow × contact`). Any send a step
performs still passes the consent gate and the approval-gated send path.

**Two authoring shapes, one table (ADR-0073).** The legacy kinds keep ordered steps in
child `workflow_step` rows. A **marketing journey** (`kind = journey`) is instead a
**single object**: its steps (send / wait / branch / score / exit), the A/B variant config
on send steps, and the source segment refs all live embedded in `workflow.definition`
(jsonb) — there are deliberately NO `journey_step` / `journey_enrollment` child tables
(ratified by Mark). The shape is validated in the app (`lib/journey.ts`), not the DB.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | |
| `kind` | enum | nurture / pre_discovery / re_engagement / journey |
| `trigger` | jsonb | enrollment criteria |
| `definition` | jsonb | journey-only: the whole journey object (steps + A/B + source segments), ADR-0073 |
| `status` | text | active / paused / etc. |
| `created_by_user_id` | uuid | FK → `app_user` |

`workflow_enrollment` additionally carries two journey-only columns: `variant_assignments`
(jsonb — sticky A/B per enrollee) and `current_step_key` (text — the branch-aware runtime
cursor, vs the legacy linear `current_step_ordinal`).

## Joins

- Children: `workflow_step` (legacy kinds only — send_email / send_sms / agent_enrich /
  wait / branch …), `workflow_enrollment` (`workflow_id`, `contact_id`, `account_id`).
- `campaign.workflow_id` may attach a campaign to a workflow.
- A journey enrolls from one or more `segment`s (refs held in `definition.sourceSegmentIds`;
  the `segment` table is a later build, #420).

## Notes

Workflow / journey structure is internal config — no client PII. Enrollment rows reference
contacts (personal) — resolve those against the live read-only DB. Journey sends are not a
gate bypass (ADR-0058/0055): an automated send crosses the same approval gate + autonomy
dial as a manual one.
