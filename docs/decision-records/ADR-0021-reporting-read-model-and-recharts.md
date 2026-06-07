# ADR-0021: Reporting read model and Recharts for visualization

- **Status:** Accepted
- **Date:** 2026-06-07

## Problem
The Reporting page needs real analytics (pipeline by stage, conversion/win rate,
proposal and delivery-project distributions, time-to-live) and a way to render
charts. The base stack (CLAUDE.md §3) specifies no charting library.

## Context
The CRM spine now has opportunities, proposals (ADR-0019), and delivery projects
(ADR-0020) — enough to aggregate. Reporting is **read-only** and fully in-repo per
ADR-0018 (database reads through the repository abstraction, ADR-0007; no external
function). Charts must render in the dark premium theme (CLAUDE.md §6) and work with
the App Router and React 19.

## Decision
1. **A dedicated `reports` repository** alongside `dashboard`/`crm`/`agent`, with
   read-only aggregate methods (`getSummary`, `pipelineByStage`, `proposalsByStatus`,
   `projectsByStatus`). Aggregation runs in SQL (`GROUP BY` / `FILTER`), not in app
   code. Like its siblings, the Postgres implementation falls back to mock per call,
   so the page renders with illustrative data before a database is configured.
2. **Recharts** (`^3.1.0`) as the charting library. Chart components are thin
   `"use client"` wrappers in `src/components/reporting/`; the page stays a server
   component that fetches data and passes plain arrays down. Colors are the §6 design
   tokens passed explicitly (Recharts can't consume Tailwind classes).

Recharts v3 is chosen specifically because its peer range includes React 19; v2 does
not, which would break `npm install` in CI (no lockfile yet — ADR/CI note in
`ci.yml`).

## Options considered
- **Hand-rolled CSS/SVG charts, no dependency** — zero deps and full control, but
  re-implements axes/tooltips/responsiveness and scales poorly as report types grow.
- **Recharts v3 (this decision)** — declarative, React-19-compatible, themeable;
  one well-maintained dependency.
- **Recharts v2 / Chart.js / visx** — v2 lacks React 19 peer support; Chart.js is
  canvas/imperative (awkward in React, weaker SSR story); visx is lower-level (more
  code for standard charts).

## Security impact
No new external surface. Recharts is a client-render library (no network). Reads go
through the repository layer behind the Entra auth gate (ADR-0002); a new runtime
dependency marginally widens the supply-chain surface — covered by the dependency
scanning in the security posture (CLAUDE.md §5).

## Cost impact
None beyond a small client-bundle increase.

## Operational impact
No schema change, so no migration and no ERD update. Adds `recharts` to
`package.json`; once a `package-lock.json` is committed (see `ci.yml` interim note),
the version pins exactly. Aggregate queries are simple `GROUP BY`s over indexed
columns.

## Future considerations
Time-series (MRR/pipeline trend over time) once historical snapshots or
event-sourced stage changes exist; campaign ROI and account-health distribution when
those modules land; reading from the Gold layer (CLAUDE.md §4) for AI-derived
metrics; date-range filtering and CSV export.
