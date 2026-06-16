# Forecast — weighted pipeline, category rollup, attainment vs quota

[← User guides](README.md)

The Forecast view (left nav → **Reporting** → **Forecast →**, or directly at
`/reporting/forecast`) is the revenue-forecasting surface on the Reporting BI hub
([ADR-0062](../decision-records/ADR-0062-reporting-bi-hub.md)). It answers the three
questions a sales leader asks of an open pipeline (ADR-0072): *what will we
realistically close?*, *what has each owner committed to?*, and *are we on track
against quota?*

## Who can see it

Forecast and quota are **revenue data**, so the whole surface is gated by the same
rule that hides MRR elsewhere (`canSeeRevenue`, ADR-0030/0016). A user whose only
role is **Support** cannot open it — they are redirected back to the Reporting hub,
and the **Forecast →** link does not appear for them. Every other role sees it. The
gate is enforced server-side, so no figure ever reaches a browser that may not see
it.

## What you see

### Headline tiles

- **Weighted pipeline** — Σ (deal value × win probability) over every open,
  non-omitted deal. The pipeline-health number: probability-discounted expected
  revenue.
- **Commit** — the total of deals the owner explicitly placed in the **commit**
  band. The number you'd stand behind.
- **Closed-won** — revenue already realised in the period. The forecast's floor.
- **Attainment** — closed-won ÷ total quota, coloured green (≥100%), amber (≥60%),
  or red. Shows **—** when no quota is set.

### Forecast scenarios

A bar chart laddering from conservative to optimistic: **closed-won** (realised) →
**weighted** (probability-discounted) → **commit** → **+ best case** → **+
pipeline** (each a cumulative running total). This is the side-by-side **weighted vs
categorised** comparison ADR-0072 decision 3 calls for — finance reads the
categorised ladder, pipeline-health reads weighted.

### Category rollup

A table, one row per band (**Commit · Best case · Pipeline**), showing each band's
deal count, its own total, and the **cumulative** total (commit ⊆ +best_case ⊆
+pipeline). Forecast category is the **owner's explicit call and is independent of
sales stage** (ADR-0072 decision 2) — a late-stage deal can still be best-case, an
early deal omitted. A footer row tallies **omitted** deals (count + value), which
are excluded from every band and from the weighted total but shown for transparency.

### Attainment vs quota

A table, one row per quota target (an **owner** or a **team**, for a period),
showing closed-won, the quota, the attainment percentage, and a colour-coded bar.
Empty until a quota lands.

## Sample vs live data

Until owners start setting forecast categories and quotas land, the page shows an
**illustrative sample forecast** behind an amber notice, so the surface is legible
before there is real data. Once any categorised deal or quota exists in the
database, the page switches to live figures and the notice disappears.

## How it is built

The Forecast view is a **read-only** surface (ADR-0042 — this front end renders;
processes live in the backend/pipeline). It consumes the forecast read model
shipped with migration 0114 (`crm.listOpportunityForecast()` +
`crm.listQuotas()`, #381) — no new schema, no new migration. The roll-up
arithmetic is the pure `src/lib/forecast.ts` (per-stage default probability +
weighted/categorised totals); the view shaping (category rollup ladder, omitted
tally, per-quota attainment) is the unit-tested `src/lib/forecast-view.ts`; the
read + sample fallback is `src/lib/forecast-view-data.ts`; the screen is
`src/app/(app)/reporting/forecast/`.

## Not yet on the forecast

- **Forecast trend over time + forecast accuracy** — reads the nightly
  `forecast_snapshot` (the call N weeks ago vs the eventual actual), written by the
  backend/pipeline snapshot job (ADR-0072 decision 5). Its own slice, **#384**.
- **Setting forecast fields in the UI** — editing a deal's category / probability /
  expected close date is a separate control surface; today they are set upstream.
- **Per-owner closed-won attribution** — v1 attributes the period closed-won floor
  to each quota target; the per-owner split lands with owner attribution (#384).
- **Period / owner filters** — the v1 view rolls up the whole open pipeline; period
  and owner slicing follow with the snapshot trend.
