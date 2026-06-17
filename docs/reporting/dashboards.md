# Dashboards

[← Reporting](README.md) · [Report builder](report-builder.md) · [Semantic model](semantic-model.md)

"Dashboards" in **Imperion Business Manager** means two distinct things, both reached from
the `/reporting` hub. This page covers both:

1. **The curated BI hub** (ADR-0062) — the hand-built intelligence sections and the
   purpose-built rollup pages we author.
2. **Self-serve dashboards** (ADR-0075 §3) — user-composed boards of saved report tiles.

---

## 1. The curated BI hub (ADR-0062)

The `/reporting` landing page (`src/app/(app)/reporting/page.tsx`) is the BI hub: a set of
read-optimized intelligence sections over the gold layer, each a grid of charts. The
sections (verified against source) are:

| Section | `id` | What it covers |
|---|---|---|
| **Sales** | `sales` | Open pipeline by stage, SBR posture by dimension, proposals by status, delivery projects by status. |
| **Marketing & Social** | `marketing` | New leads by source, organic social stats (source-truthful Meta insight metrics), campaign performance. |
| **Service Desk** | `service-desk` | Tickets by status, by queue, opened-per-week flow, Defender pairings. |
| **Security Fleet** | `security` | Policy posture mix across policy families (ADR-0051 classifications), open Defender incidents by severity, fleet totals. |

Charts render via `src/components/reporting/report-charts.tsx`. A cross-domain summary
strip on the **Dashboard** deep-links into each section by its `id`.

> **Source-honesty.** The hub renders what the gold layer actually holds. Where a source
> is still maturing the subtitles say so — e.g. service-desk tickets show "raw Autotask
> statuses — labels land with the 0074 follow-up" and "no completion dates in the source
> yet — opened flow only". This is deliberate: the BI hub never fabricates a metric it
> cannot back.

### 1.1 Purpose-built rollup pages

Alongside the four sections, the hub links several focused rollup pages (each its own
route under `/reporting`):

| Route | Page | What it is |
|---|---|---|
| `/reporting/forecast` | Forecast | Pipeline forecast rollup. |
| `/reporting/portfolio` | Portfolio rollup | Cross-project / portfolio rollup. |
| `/reporting/agile` | Agile reporting | Agile / sprint-flow reporting. |
| `/reporting/custom-fields` | Custom-field report | Reporting over user-defined custom fields. |
| `/reporting/builder` | Report builder | The self-serve builder (§2 below). |
| `/reporting/dashboards` | Dashboards | Self-serve dashboards (§3 below). |

These are curated, server-rendered surfaces — distinct from the self-serve builder.

---

## 2. The relationship to the report builder

The curated BI hub is *authored by us*; the **report builder** ([report-builder.md](report-builder.md))
is authored *by the user*, over the governed [semantic model](semantic-model.md). A
self-serve **dashboard** (next section) composes the user's *saved reports* into tiles — it
is the user-facing analogue of the curated hub.

---

## 3. Self-serve dashboards (ADR-0075 §3, #412)

A self-serve dashboard is a **named composition of saved report definitions**. It builds on
the report builder (#411): each tile points at a saved `report_definition` and re-executes
it. Persistence is the `dashboard` / `dashboard_item` tables (migration 0124, #410).
[ADR-0075](../decision-records/ADR-0075-self-serve-report-builder.md) is normative.

### 3.1 Surfaces

| Route | What it is |
|---|---|
| `/reporting/dashboards` | List-first: own + shared dashboards, new, open, delete. |
| `/reporting/dashboards/new` | Create a dashboard (name + visibility). |
| `/reporting/dashboards/[id]` | The dashboard — renders tiles; owner can add/remove tiles, rename, re-share. |

Reached from the Reporting BI hub header ("Dashboards →") and from the report builder.

### 3.2 How a tile renders

Each `dashboard_item` references a `report_definition`. On view, the page resolves the
definition and runs it through
[`run-saved-report.ts`](../../src/lib/reporting/run-saved-report.ts):

1. **Reconstruct** the registry selection + filters from the stored row (pure
   [`saved-report.ts`](../../src/lib/reporting/saved-report.ts)).
2. **Re-validate + RBAC-strip** against the **viewer's** roles (`validateReportSelection`,
   run-time enforcement, ADR-0075 §2) — a dashboard shared by an admin still strips money
   for a support viewer.
3. **Load + shape** via the same curated loader + pure runner as the builder preview (#411).
4. **Render** with the shared `ReportResultView` (table + Recharts, ADR-0021).

A tile whose report was deleted (FK `ON DELETE CASCADE` removes the item) or is no longer
shared with the viewer (resolves to null) shows an honest placeholder rather than failing
the page.

### 3.3 Security

- **Field RBAC is the report's, evaluated for the viewer** — composing a report onto a
  dashboard never widens access; every tile re-runs the run-time strip.
- **Ownership** — create/rename/re-share/delete are owner-scoped (the data layer enforces;
  admins may delete a shared dashboard). Tile add/remove carry no owner in the accessor, so
  the actions verify the caller owns the dashboard first.
- `dashboard` / `dashboard_item` store composition + layout only — no result rows, no PII.
- App-native config tables (not silver) → no OKF concept file applies.

### 3.4 Limits / follow-ups

- v1 layout is ordinal order (the `position.ordinal` blob); a drag-grid layout is a future
  enhancement. `layout` is reserved on the `dashboard` row for it.
- Tiles render server-side, one curated read per tile — fine for v1 tile counts; the #413
  query-cost guardrails apply per tile (see [report-builder.md](report-builder.md)).
