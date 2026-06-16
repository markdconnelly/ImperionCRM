# Self-serve report builder (UI + executor)

The report builder lets a user pick a reportable object, choose fields,
aggregations, grouping and filters, choose a visualization, and preview + save the
result — all over the governed [semantic model](semantic-model.md) (ADR-0075 §1).
This note covers the **builder UI + executor** (#411); the persistence schema
(`report_definition` / `dashboard` / `dashboard_item`, migration 0124) and accessors
are #410, and the registry itself is the [semantic model](semantic-model.md) (#409).
[ADR-0075](../decision-records/ADR-0075-self-serve-report-builder.md) is normative.

## Surfaces

| Route | What it is |
|---|---|
| `/reporting/builder` | List-first: the viewer's own saved reports + any shared, "New report", open/edit, delete. |
| `/reporting/builder/new` | The interactive builder for a new report. |
| `/reporting/builder/[id]` | Open & edit an owned report (non-owners are redirected — view-only). |

Reached from the Reporting BI hub header ("Report builder →"). Reporting is broadly
available (like saved views, ADR-0046) — **no capability gate**. Authorization is
ownership (the data layer enforces owner-only mutation) plus field-level RBAC.

## How a report executes — no dynamic SQL

ADR-0075 §5: "the read model, not ad-hoc table scans, backs reports." So execution is
**not** dynamic SQL. The flow:

1. **Load** — [`curated-sources.ts`](../../src/lib/reporting/curated-sources.ts) maps
   each reportable object to ONE existing curated repository read (e.g. `account` →
   `crm.listAccounts()`) and projects its rows to a flat row set keyed by the
   registry's field keys. Money fields the read formats as strings (`$1,200`) are
   parsed back to numbers so they can be summed/avg'd.
2. **Validate + strip** — the server action re-runs `validateReportSelection` against
   the caller's roles (run-time RBAC, ADR-0075 §2): a field the author lacks the grant
   for is stripped, never executed.
3. **Shape** — [`report-runner.ts`](../../src/lib/reporting/report-runner.ts) (pure,
   edge-safe, unit-tested) does projection / grouping / aggregation in memory:
   - **Detail mode** (no group-by and every aggregation is `none`): project selected
     fields, one row per source row, capped at `MAX_DETAIL_ROWS` (1000) with an honest
     `truncated` flag (no silent truncation, ADR-0075 §5).
   - **Aggregate mode** (any group-by, or any real aggregation): bucket by the group-by
     dimensions and roll up each measure (`count`/`sum`/`avg`/`min`/`max`).
4. **Render** — [`report-result-view.tsx`](../../src/components/reporting/report-result-view.tsx)
   shows a table always, plus a Recharts bar/line chart when the viz asks for one and
   the result has a categorical dimension + a numeric measure (ADR-0021).

## Security

- **Field RBAC is enforced twice** — build-time (the builder is handed only
  RBAC-filtered objects/fields, so a forbidden field is never offered or shipped to the
  client) and run-time (`previewReportAction` / save actions re-validate). Same posture
  as `canSeeRevenue` (ADR-0030): no report can surface data its author could not see.
- **No raw-SQL / arbitrary-scan surface** — a report can only ever scan a curated read
  the BI hub already runs. There is no path to an unmodelled table or join.
- **Ownership** — create/update/delete carry the signed-in email; the data layer
  enforces owner-only mutation (admins may delete a shared report). `report_definition`
  stores a staff-authored query *shape* (object/field names + filter values), never
  result rows or PII.

## Limits / follow-ups

- v1 is single-root-object (no cross-object joins, ADR-0075 §4). Pre-modelled relations
  are a future ADR-0075 item.
- Query-cost guardrails (row/time limits, required filters on large objects) are the
  **#413** follow-up; v1 ships the `MAX_DETAIL_ROWS` cap only.
- Dashboards composing saved reports are **#412**.

## Extending

Adding a reportable field/object is a change to the [semantic model](semantic-model.md)
plus (if a new object) a curated-source loader branch in `curated-sources.ts`. No
schema change — the registry is in code.
