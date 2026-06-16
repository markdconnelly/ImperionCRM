# Dashboards (compose + share)

A dashboard is a **named composition of saved report definitions** (ADR-0075 §3, #412).
It builds on the report builder (#411): each tile points at a saved `report_definition`
and re-executes it. Persistence is the `dashboard` / `dashboard_item` tables (migration
0124, #410). [ADR-0075](../decision-records/ADR-0075-self-serve-report-builder.md) is
normative; this note covers the dashboard surface.

## Surfaces

| Route | What it is |
|---|---|
| `/reporting/dashboards` | List-first: own + shared dashboards, new, open, delete. |
| `/reporting/dashboards/new` | Create a dashboard (name + visibility). |
| `/reporting/dashboards/[id]` | The dashboard — renders tiles; owner can add/remove tiles, rename, re-share. |

Reached from the Reporting BI hub header ("Dashboards →") and from the report builder.

## How a tile renders

Each `dashboard_item` references a `report_definition`. On view, the page resolves the
definition and runs it through
[`run-saved-report.ts`](../../src/lib/reporting/run-saved-report.ts):

1. **Reconstruct** the registry selection + filters from the stored row (pure
   [`saved-report.ts`](../../src/lib/reporting/saved-report.ts)).
2. **Re-validate + RBAC-strip** against the **VIEWER's** roles (`validateReportSelection`,
   run-time enforcement, ADR-0075 §2) — a dashboard shared by an admin still strips money
   for a support viewer.
3. **Load + shape** via the same curated loader + pure runner as the builder preview (#411).
4. **Render** with the shared `ReportResultView` (table + Recharts, ADR-0021).

A tile whose report was deleted (FK `ON DELETE CASCADE` removes the item) or is no longer
shared with the viewer (resolves to null) shows an honest placeholder rather than failing
the page.

## Security

- **Field RBAC is the report's, evaluated for the viewer** — composing a report onto a
  dashboard never widens access; every tile re-runs the run-time strip.
- **Ownership** — create/rename/re-share/delete are owner-scoped (data layer enforces;
  admins may delete a shared dashboard). Tile add/remove carry no owner in the accessor,
  so the actions verify the caller owns the dashboard first.
- `dashboard` / `dashboard_item` store composition + layout only — no result rows, no PII.
- App-native config tables (not silver) → no OKF concept file.

## Limits / follow-ups

- v1 layout is ordinal order (the `position.ordinal` blob); a drag-grid layout is a future
  enhancement. `layout` is reserved on the `dashboard` row for it.
- Tiles render server-side, one curated read per tile — fine for v1 tile counts; the #413
  query-cost guardrails apply per tile.
