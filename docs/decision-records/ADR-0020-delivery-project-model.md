# ADR-0020: Delivery project model (onboarding/implementation)

- **Status:** Accepted
- **Date:** 2026-06-07

## Problem
Model the delivery phase so that a won deal has a first-class, manually editable
record tracking the path from sale to managed customer (CLAUDE.md §1: onboarding →
implementation → operational readiness → handoff), ahead of any automated workflow.

## Context
ADR-0010 reserved the delivery spine (`project`, `milestone`, `readiness_item`,
`handoff`) but did not build it. Accounts, tasks, and proposals (ADR-0019) already
have manual CRUD. The Onboarding page was a placeholder. Per ADR-0018 this is fully
in-repo: database reads/writes through the repository abstraction (ADR-0007), no
external function. The account's `lifecycle_stage`
(onboarding/implementation/operational_readiness) already drives the dashboard's
Onboarding count; a `project` makes that phase an explicit, trackable record.

## Decision
A `project` row **belongs to one `account`** (`account_id NOT NULL`,
`ON DELETE CASCADE`) and optionally references the `opportunity` it came from
(`opportunity_id` nullable, `ON DELETE SET NULL` — the project outlives a deleted
deal). `type` is `project_type` (`onboarding | implementation`) and `status` is
`project_status` (`not_started | in_progress | blocked | complete`). It carries a
`name`, a `target_live_date`, free-text `notes`, and two derived timestamps,
`started_at` and `completed_at`.

As with proposals, the timestamps are **derived from the status transition**: moving
off `not_started` stamps `started_at` (preserved once set); moving to `complete`
stamps `completed_at`; reverting clears them. CRUD lives in
`crm.{list,get,create,update,delete}Project` behind the repository contract, Postgres
impl with per-call mock fallback.

## Options considered
- **Project under account, optional opportunity link (this decision)** — one delivery
  record per engagement; survives opportunity deletion; clean roll-up to account
  health.
- **Project required-linked to opportunity** — rejected: not every delivery effort
  maps 1:1 to a sales opportunity (e.g. re-onboarding, internal projects), and we
  don't want a delivery record to cascade-delete with a deal.
- **Reuse `task` with a "project" flag** — rejected: projects need their own
  lifecycle, target date, and (soon) milestone/readiness/handoff children.

## Security impact
No new external surface. Writes go through server actions behind the Entra auth gate
(ADR-0002) and the repository layer; access inherits account ownership scoping
(ADR-0016).

## Cost impact
None beyond Postgres storage.

## Operational impact
Adds migration `0009_project.sql` (idempotent, transactional, ADR-0017) and the
`project_type` / `project_status` enums. The ERD in `docs/database/data-model.md` is
updated to match.

## Future considerations
The `milestone`, `readiness_item`, and `handoff` children (ERD Diagram 1) — a
per-project milestone list, an operational-readiness checklist gating handoff, and a
handoff record to managed services. Auto-create a project when a proposal is accepted
/ opportunity is won (the deferral noted in ADR-0019). Per-stage SLAs and a
computed delivery health signal.
