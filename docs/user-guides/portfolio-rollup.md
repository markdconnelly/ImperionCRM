# Portfolio rollup — every project on one screen

[← User guides](README.md)

The Portfolio rollup (left nav → **Reporting** → **Portfolio rollup →**, or
directly at `/reporting/portfolio`) is the cross-project planning surface
introduced in #350 (ADR-0069 D5). Where the [project board](project-board.md)
groups projects by status or type, the portfolio lists **every project at once**
with its rolled-up health and its next milestone — the one screen a delivery lead
opens to see where every engagement stands.

## What you see

A single table, one row per project, with:

- **Health** — a R/Y/G dot rolled up from the project's milestones (red beats
  amber beats green, the same rule as the [onboarding dashboard](../README.md)). A
  milestone that is past due and not complete reads **red**. A project with no
  milestones shows a dash (—) — it still lists, it just has no rolled-up signal.
- **Project · Account · Type · Owner · Status** — the project's identity and where
  it sits. Status uses the project lifecycle (not started / in progress / blocked
  / complete).
- **Milestones** — `done/total` across the project's milestones.
- **Next milestone** — the earliest not-yet-complete milestone by order, with its
  due date when set. Blank (—) when every milestone is complete or there are none.
- **Target go-live** — the project's target date.

## Filters

Four dropdowns plus a toggle narrow the list (all client-side — no page reload):

- **Account** / **Owner** / **Type** — exact-match facets built from the live data.
  Owner also offers **Unassigned**.
- **Health** — Green / Amber / Red, plus **No milestones** for projects with no
  rolled-up health.
- **Active only** (on by default) — hides completed projects so the view shows the
  live portfolio. Untick it to include completed work.

The counter (`N of M`) shows how many projects match.

## Export

**Export CSV** downloads the **currently filtered** rows as a CSV file
(`portfolio-YYYY-MM-DD.csv`) — header row plus one line per project, with every
column. The export happens entirely in your browser; nothing is sent to a server.

## How it is built

The portfolio is a **pure read model** over the existing `project` and
`project_milestone` tables (no new schema) — the GUI reads the database directly
for rendering (ADR-0042). The rollup/filter/export logic lives in
`src/lib/portfolio.ts` (unit-tested), the read in `crm.listPortfolio()`, the
screen at `src/app/(app)/reporting/portfolio/`. It is money/comp-free, so it
carries no role redaction.

## Not yet on the portfolio

Deferred per ADR-0069 (COULD) or pending data:

- **Saved filter sets / shareable views** — follow-up, mirrors the task board's
  saved views (#327 family).
- **Baseline / forecast-vs-actual slippage** column — ADR-0069 D6, its own slice.
