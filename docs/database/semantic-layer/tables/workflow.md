---
type: Silver Table
title: workflow
description: Automation sequence (nurture / pre-discovery / re-engagement) — website system of record; parents steps and enrollments.
resource: ../../../decision-records/ADR-0027-pre-discovery-automation-and-agent-answer-approval.md
tags: [silver, automation, workflow, nurture]
timestamp: 2026-06-14T00:00:00Z
---

# workflow

A contact-automation sequence. Born silver — website system of record. Governed by
[ADR-0027](../../../decision-records/ADR-0027-pre-discovery-automation-and-agent-answer-approval.md);
marketing journeys in
[ADR-0073](../../../decision-records/ADR-0073-marketing-automation-journeys.md).

## Source of record / authority

**Website system of record.** `kind` is an enum (`nurture` / `pre_discovery` /
`re_engagement`); `trigger` (jsonb) defines enrollment criteria. Ordered steps live in
`workflow_step`; a contact's run is `workflow_enrollment` (one ACTIVE per
`workflow × contact`). Any send a step performs still passes the consent gate and the
approval-gated send path.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | |
| `kind` | enum | nurture / pre_discovery / re_engagement |
| `trigger` | jsonb | enrollment criteria |
| `status` | text | active / paused / etc. |
| `created_by_user_id` | uuid | FK → `app_user` |

## Joins

- Children: `workflow_step` (send_email / send_sms / agent_enrich / wait / branch …),
  `workflow_enrollment` (`workflow_id`, `contact_id`, `account_id`).
- `campaign.workflow_id` may attach a campaign to a workflow.

## Notes

Workflow structure is internal config — no client PII. Enrollment rows reference contacts
(personal) — resolve those against the live read-only DB.
