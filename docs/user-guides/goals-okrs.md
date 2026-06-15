# Goals & OKRs — objectives above projects

[← User guides](README.md)

Goals (left nav → **Projects** → **Goals →**, or directly at `/projects/goals`) are
measurable objectives that sit **above** projects — introduced in #348 (ADR-0069 D3).
Where the [project board](project-board.md) and the
[portfolio rollup](portfolio-rollup.md) show the work itself, a goal answers "are we
moving the number we set out to move?" by rolling up the progress of the projects that
contribute to it.

## What you see

A read-only list, one card per goal:

- **Name · Owner · Period** — the objective, who owns it, and its cadence label
  (e.g. `Q3 2026`, `FY26 H2` — free text, not a fixed set).
- **current / target** — the goal's numeric key result.
- **Progress bar + percent** — the goal's progress. The bar is red below 34%, amber
  below 67%, green above. The tag on the right says **Rolled up** or **Manual**.
- **Contributing projects** — for a rolled-up goal, the linked projects with their
  account, status, link **weight**, and each project's own completion (`Done %`).

## Rolled up vs. manual

Each goal has a **progress mode**:

- **Rollup** — progress is the **weight-weighted average** of its linked projects'
  completion. A project's completion is its milestone progress (`done / total`), or
  **100%** when the project is `complete` with no milestones, otherwise 0%. A
  rollup goal with no links yet falls back to its manual figure and is tagged
  *Manual* until projects are linked. This is the acceptance for #348: *a goal shows
  rolled-up progress from its linked projects.*
- **Manual** — progress is the owner's `current` vs `target` (e.g. CSAT tracked off a
  survey dashboard), independent of any linked work.

Weights let an uneven goal count one project more than another (a 3×-weighted done
project plus a 1× not-started project rolls up to 75%, not 50%).

## Access

Goals are a delivery-planning surface, so the view is **delivery-management only**
(admin / project manager — the same gate as Workload and the project board write
surface, per ADR-0069's staff-planning security note). Other users see an access
notice.

## How it is built

A **pure read model** over the new `goal` and `goal_link` tables plus the existing
`project_milestone` completion — the GUI reads the database directly for rendering
(ADR-0042). The rollup math lives in `src/lib/goals.ts` (unit-tested,
`src/lib/goals.test.ts`); the read is `crm.listGoals()`; the screen is
`src/app/(app)/projects/goals/`. `goal_link` is **polymorphic**
(`parent_type/parent_id`) so projects roll up today and tasks can join the same
mechanism later. Schema: migration `0102_goals_okrs.sql`. These are PM application
tables, not silver entities, so the
OKF semantic-layer gate does not apply.

## Not yet on goals

Deferred per ADR-0069 (COULD), tracked on #348:

- **Authoring + link management in the GUI** — creating goals and attaching/detaching
  contributing projects. This slice ships the schema, the rollup, and the read-only
  view; editing is the follow-up.
- **Task-level rollup** — the schema already allows `parent_type='task'`; only project
  rollup is wired today.
