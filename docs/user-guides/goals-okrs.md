# Goals & OKRs — objectives above projects

[← User guides](README.md)

Goals (left nav → **Projects** → **Goals →**, or directly at `/projects/goals`) are
measurable objectives that sit **above** projects — introduced in #348, with GUI
authoring + link management + task-level rollup added in #621 (ADR-0069 D3).
Where the [project board](project-board.md) and the
[portfolio rollup](portfolio-rollup.md) show the work itself, a goal answers "are we
moving the number we set out to move?" by rolling up the progress of the projects and
tasks that contribute to it.

## What you see

A list, one card per goal (the title links to the goal's editable detail page):

- **Name · Owner · Period** — the objective, who owns it, and its cadence label
  (e.g. `Q3 2026`, `FY26 H2` — free text, not a fixed set).
- **current / target** — the goal's numeric key result.
- **Progress bar + percent** — the goal's progress. The bar is red below 34%, amber
  below 67%, green above. The tag on the right says **Rolled up** or **Manual**.
- **Contributing work** — for a rolled-up goal, the linked projects and tasks with
  their account/type, status, link **weight**, and each item's own completion (`Done %`).

## Authoring a goal (#621)

- **New goal** (button on the list, or `/projects/goals/new`) — name, owner, free-text
  period, numeric target/current, progress mode, and notes.
- **Edit / delete** — open a goal to change its fields or delete it (deleting removes
  its links too).

## Managing links (#621)

On a goal's detail page, the **Linked contributing work** panel lists every linked
project and task (each removable) and lets you **add** a project or a task with a
rollup **weight**. Re-adding the same item just updates its weight. All writes are
delivery-management-gated (`delivery:write`).

## Rolled up vs. manual

Each goal has a **progress mode**:

- **Rollup** — progress is the **weight-weighted average** of its linked work's
  completion, projects and tasks in one pool. A **project's** completion is its
  milestone progress (`done / total`), or **100%** when the project is `complete` with
  no milestones, otherwise 0%. A **task's** completion is binary — **100%** when the
  task is `done`, otherwise 0%. A rollup goal with no links yet falls back to its
  manual figure and is tagged *Manual* until work is linked. This is the acceptance for
  #348: *a goal shows rolled-up progress from its linked work.*
- **Manual** — progress is the owner's `current` vs `target` (e.g. CSAT tracked off a
  survey dashboard), independent of any linked work.

Weights let an uneven goal count one item more than another (a 3×-weighted done
project plus a 1× not-started task rolls up to 75%, not 50%).

## Access

Goals are a delivery-planning surface, so the view is **delivery-management only**
(admin / project manager — the same gate as Workload and the project board write
surface, per ADR-0069's staff-planning security note). Other users see an access
notice.

## How it is built

The **read** is a pure read model over the `goal` and `goal_link` tables plus the
existing `project_milestone` / `task` completion — the GUI reads the database directly
for rendering (ADR-0042). **Writes** go through `delivery:write`-gated server actions
(`src/app/(app)/projects/goals/actions.ts`) into the typed repository
(`createGoal`/`updateGoal`/`deleteGoal`/`addGoalLink`/`removeGoalLink`). The rollup
math lives in `src/lib/goals.ts` (unit-tested, `src/lib/goals.test.ts`); the read is
`crm.listGoals()`; the screens are under `src/app/(app)/projects/goals/`. `goal_link`
is **polymorphic** (`parent_type/parent_id`) so projects and tasks share one rollup
mechanism. Schema: migration `0102_goals_okrs.sql` (the web role already has
SELECT/INSERT/UPDATE/DELETE on both tables — no new migration for authoring). These
are PM application tables, not silver entities, so the OKF semantic-layer gate does
not apply.
