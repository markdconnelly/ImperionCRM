---
type: Silver Table
title: change_request
description: App-native ITIL 4 Change Enablement working object — a typed (standard|normal|emergency) change Imperion creates over the managed estate, with status, affected CMDB CIs, and nullable risk/approval/schedule columns the downstream slices populate. Autotask is the eventual change record SoR via a separate gated route (#661).
resource: ../../../decision-records/ADR-0079-change-enablement.md
tags: [silver, service-desk, change-enablement, itil, cmdb, overlay, archetype-d, app-native]
timestamp: 2026-06-17T15:00:00Z
---

# change_request

The **Change Enablement** working object
([#656](https://github.com/markdconnelly/ImperionCRM/issues/656), parent
[#373](https://github.com/markdconnelly/ImperionCRM/issues/373) [Change Enablement; problem
management dropped per Mark 2026-06-15], **ADR-0079**). It implements the ITIL 4 **Change
Enablement** practice on top of the existing incident/CMDB spine: Imperion **creates** the
change (typed standard | normal | emergency), assesses **CMDB-derived risk**, runs a
**lightweight approval**, and **schedules** it — an **app-native working object** — then
later **gated-writes it out to Autotask** change management
([#661](https://github.com/markdconnelly/ImperionCRM/issues/661)).

It is **archetype D** (app-owned working copy with a deferred external write-back — the same
posture as the CMDB overlays [`ci_relationship`](ci_relationship.md) /
[`cmdb_ci_overlay`](cmdb_ci_overlay.md), which are app-native with a deferred IT Glue
round-trip). Unlike a CI (a projection over silver), a `change_request` is a **real persisted
row** with a uuid PK, so the affected-CI link FKs to it.

This slice (#656) creates the working object + its affected-CI link. The
**risk / approval / schedule / `autotask_change_id`** columns are seeded nullable here and
**populated by the downstream slices** ([#658](https://github.com/markdconnelly/ImperionCRM/issues/658)
risk · [#659](https://github.com/markdconnelly/ImperionCRM/issues/659) approval ·
[#660](https://github.com/markdconnelly/ImperionCRM/issues/660) schedule ·
[#661](https://github.com/markdconnelly/ImperionCRM/issues/661) route) — none ADD a column.

## Source of record / authority

- **The website is the system of record for the working object.** Imperion owns the change
  while it is drafted, assessed, approved and scheduled.
- **Autotask is the eventual change RECORD system of record**, reached via the separate
  **gated write** slice ([#661](https://github.com/markdconnelly/ImperionCRM/issues/661)) and
  joined by `autotask_change_id` (NULL until routed). Nothing here writes Autotask before
  that gated slice (the same app-native posture as the CMDB overlays' deferred IT Glue
  write-back).
- **Effective risk = `risk_override ?? risk_derived`**, resolved in the app layer (not a
  generated column) — the same override-wins rule as the CMDB criticality overlay.
- **Affected CIs are business keys, not FKs.** A CI is the read-only `cmdb_ci` union
  projection over silver (#645); the link stores `(ci_type, ci_id)` text pairs and the app
  validates each exists in `listConfigurationItems` before insert.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | surrogate PK |
| `change_type` | `change_type` enum | `standard` \| `normal` \| `emergency` |
| `status` | `change_status` enum | `draft` \| `pending_approval` \| `approved` \| `rejected` \| `scheduled` \| `completed` \| `cancelled` |
| `title` | text | the change summary |
| `description` | text | optional detail |
| `requester_user_id` | uuid → `app_user` | who raised it (null = system/agent) |
| `account_id` | uuid → `account` | optional owning client account (null = estate-wide) |
| `risk_derived` | integer (0–100) | CMDB-derived risk score (#658); NULL = unassessed |
| `risk_override` | integer (0–100) | admin risk override (#658); NULL = none |
| `approval_status` | `change_approval_status` enum | `pending` \| `approved` \| `rejected` (#659); NULL = not requested |
| `approved_by_user_id` | uuid → `app_user` | approver (#659); NULL until approved |
| `approved_at` | timestamptz | approval time (#659); NULL until approved |
| `schedule_start` / `schedule_end` | timestamptz | planned change window (#660); CHECK end ≥ start |
| `autotask_change_id` | text | Autotask change id once routed (#661); NULL until then |
| `created_at` / `updated_at` | timestamptz | row timestamps |

`change_affected_ci` (the link): `id` uuid PK · `change_id` uuid → `change_request` (FK,
CASCADE) · `ci_type` text CHECK in (account|user|device) · `ci_id` text · unique
`(change_id, ci_type, ci_id)`.

## Joins

- `change_affected_ci.(ci_type, ci_id)` → the `cmdb_ci` union read-model (#645) — i.e. silver
  [`account`](account.md), [`contact`](contact.md) (the `user` CI), or [`device`](device.md).
  Business-key joins, **not FKs** (the register is a VIEW/union).
- `requester_user_id` / `approved_by_user_id` → [`app_user`](app_user.md);
  `account_id` → [`account`](account.md).
- **Consumers:** the `/changes` list/create/detail surface (this slice); CMDB-derived risk
  ([#658](https://github.com/markdconnelly/ImperionCRM/issues/658)) reads the affected-CI set
  + [`cmdb_ci_overlay`](cmdb_ci_overlay.md) criticality; the lightweight approval
  ([#659](https://github.com/markdconnelly/ImperionCRM/issues/659)) writes
  `status`/`approval_status`/`approved_by_user_id`/`approved_at` and the calendar
  ([#660](https://github.com/markdconnelly/ImperionCRM/issues/660)) populates the schedule.
  Read accessors: `changes.listChangeRequests` / `getChangeRequest`; writes
  `createChangeRequest` / `updateChangeRequest` / `setChangeRiskOverride` /
  `decideChangeApproval` (#659) / `setChangeSchedule` (#660) / `deleteChangeRequest`. Pure
  helpers in `src/lib/change.ts`.

  **Lightweight approval (#659).** The flow is keyed to `change_type`: a **standard** change is
  **pre-authorized** — `createChangeRequest` opens it `status=approved`/`approval_status=approved`,
  system-attributed (`approved_by_user_id` NULL), audited `change.auto_approved`. **Normal** and
  **emergency** open `pending_approval`/`pending` and require an approver
  (`decideChangeApproval`, gated `change:approve`, audited `change.approved`/`change.rejected`);
  **emergency is flagged expedited** (surfaced first in the `/changes/approvals` queue) but still
  takes a human decision. The state machine (`initialApprovalState` / `applyApprovalDecision`,
  `src/lib/change.ts`) refuses any decision on a change not in `pending_approval`/`pending`.

  **Scheduling + calendar (#660).** `setChangeSchedule` (gated `change:write`) sets/clears the
  planned window (`schedule_start`/`schedule_end`, validated end ≥ start in-app via
  `validateScheduleWindow`, mirroring the DB CHECK; both blank clears it). The window is
  reflected onto `status` by the **reversible `approved ↔ scheduled` toggle** (`nextScheduleStatus`):
  setting a window on an `approved` change promotes it to `scheduled`; clearing a `scheduled`
  change's window reverts to `approved`. Every other status (draft/pending_approval/rejected/
  completed/cancelled) is left untouched — scheduling **never clobbers approval state**. The
  `/changes/calendar` route lays scheduled changes on a month grid (reusing the pure
  `buildMonth`/`bucketByDay` calendar helpers, #342), filterable by account / type / risk band.
  Overlapping windows that share an account or affected CI are surfaced as **context** on the
  change detail (`findScheduleConflicts`) — informational only, **no hard enforcement in v1**
  (freeze-period gating is a deliberate follow-up).

## Notes

Gated by `change:write` (admin∨support — the ITIL Service practice; mirrors `canSeeService`/
`canSeeCmdb`) on every write; `change:approve` (admin-only) gates the approval slice (#659).
**App-native: nothing here propagates to Autotask** until the gated route (#661). **PII-free:**
a change is a title/description + status + CI business keys + app_user references — it mints no
personal data of its own; CI display names and requester/account names resolve live from the
read-only register / silver.
