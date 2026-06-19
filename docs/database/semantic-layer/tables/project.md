---
type: Silver Table
title: project
entity: project
archetype: B
description: Delivery/onboarding workstream for an account — website system of record; one board across all project types.
resource: ../../../decision-records/ADR-0020-delivery-project-model.md
tags: [silver, delivery, project]
timestamp: 2026-06-15T23:59:00Z
---

# project

A delivery workstream (onboarding → implementation → handoff). Born silver — website
system of record. Governed by
[ADR-0020](../../../decision-records/ADR-0020-delivery-project-model.md) and
[ADR-0052](../../../decision-records/ADR-0052-project-board-tasks-meetings-sales-activity.md)
(one board, user-creatable types).

## Source of record / authority

**Website system of record.** `project_type_id` is a table (not an enum) so types are
user-creatable. Provenance links record what spawned the project (`source_assessment_id`
/ `source_sbr_id`). The Autotask write-back lives in the `project_provisioning` sidecar
(idempotent, DocuSign-gated) — the front end requests, the backend executor writes.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` | uuid | FK → `account` |
| `opportunity_id` | uuid | FK → `opportunity` (nullable) |
| `project_type_id` | uuid | FK → `project_type` |
| `name` | text | |
| `status` | enum | `project_status`: `not_started` / `in_progress` / `blocked` / `complete`. Legacy delivery lifecycle; authoritative during the compatibility window |
| `status_def_id` | uuid | FK → `status_def` (configurable status, ADR-0065 B5); nullable, backfilled from `status` |
| `owner_user_id` | uuid | FK → `app_user` |
| `target_live_date` | date | |
| `source_assessment_id` / `source_sbr_id` | uuid | what spawned it |
| `started_at` / `completed_at` | timestamptz | |

## Joins

- `account_id` → `account`; `opportunity_id` → `opportunity`.
- Children: `project_milestone`, `task` (`task.project_id`), `onboarding_step`, and the
  `project_provisioning` write-back sidecar (→ Autotask Project+Tasks).
- `status_def_id` → `status_def` (configurable status, ADR-0065 B5): admin-definable
  status set, optionally scoped per `project_type`. Reporting rolls up off
  `status_def.category` (todo/in_progress/done), **not the label**. The legacy
  `project_status` enum column stays authoritative during the compatibility window; the
  FK is backfilled from it via the seeded global default set (no data loss).

## Notes

Project names can carry client identity — keep specifics out of this doc; resolve against
the live read-only DB.
