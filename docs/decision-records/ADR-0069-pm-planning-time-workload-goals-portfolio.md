# ADR-0069: PM planning — time tracking, workload, goals, sprints, portfolio, baselines

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-12 |
| **Cross-references** | ADR-0052 (project board), ADR-0065 (assignment/estimates fields), ADR-0066 (views), ADR-0062 (reporting BI hub), `docs/product/pm-feature-requirements.md` Theme D |

## Problem

There is no effort/estimate or time tracking, no workload/capacity visibility, no
goals/OKRs above projects, no sprints/backlog, no cross-project portfolio rollup
(only per-type grouping), and no baseline/forecast-vs-actual.

## Context

For an MSP-delivery use case these are lower-urgency than collaboration and views,
but they are the planning surface that distinguishes mature PM tools. They build on
assignment (ADR-0065 B3) and feed reporting (ADR-0062) and agile charts (ADR-0066
C5). This ADR fixes the **shape** and sequences most of the build to v2/later.

## Options considered

1. **Record the full planning model now, build incrementally** (this ADR) — lets the
   data model land coherently while deferring UI heft.
2. **Integrate an external time/resource tool** — rejected: data leaves the model,
   adds an integration surface, conflicts with self-contained posture.

### Tradeoffs

Defining tables ahead of UI risks unused schema; mitigated by landing each table only
with its first consuming slice. Estimate unit (hours vs. points) is contentious →
made configurable per project_type rather than globally fixed.

## Decision

Adopt the following model; build per the phase column in the requirements set
(mostly v2/later):

- **Time tracking & estimates (D1, v2)** — `task.estimate`, `task.estimate_unit`
  (configurable per project_type); `time_entry{ task_id, user_id, minutes, started_at?,
  note, billable }`. Rollup estimate vs. logged at milestone/project.
- **Workload / capacity (D2, could)** — `user_capacity{ user_id, weekly_hours }`; load
  derived from open assignments × estimates over a range; over-allocation highlight;
  reassign from the view.
- **Goals / OKRs (D3, later)** — `goal{ id, name, owner, period, target, current }` +
  `goal_link{ goal_id, parent_type, parent_id, weight }`; progress manual or rolled up
  from linked work.
- **Sprints / backlog (D4, later)** — `sprint{ id, name, project_id?, starts_at,
  ends_at, status }` + `task.sprint_id`; backlog list + active-sprint board scope;
  carry-over of unfinished items.
- **Portfolio rollup (D5, could)** — cross-project view of status/health/owner/
  target-date beyond per-type grouping; filter by account/owner/type/health; export.
- **Baselines (D6, could)** — `project_baseline{ project_id, captured_at, planned_dates
  jsonb }`; planned-vs-actual slippage on completion.

## Consequences

- A coherent planning model exists for the data layer to grow into; reporting (ADR-0062)
  and agile charts (ADR-0066 C5) gain their inputs (estimates, sprints).
- Risk of premature schema is bounded by landing each table with its first UI slice,
  not all at once.

### Security impact

Time entries and capacity are staff-performance data → RBAC-gated visibility (NFR-1),
audited (NFR-2). `billable` may feed invoicing later — treat as financial-adjacent,
no automated money movement. No new external surface.

### Cost impact

Schema/indexes only; negligible.

### Operational impact

Workload/portfolio are read-heavy aggregates — back with indexed queries or
materialized views if needed (NFR-5). No new backend process required for v2 scope.

## Future considerations

Billable time → proposal/invoice linkage; capacity-aware assignment suggestions
(would consume the excluded rules engine); OKR auto-progress from completion signals.
