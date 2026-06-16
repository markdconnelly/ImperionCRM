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

### Forecast accuracy

The lower section grades **how good our past forecasts were** — the point of the
nightly `forecast_snapshot` ([ADR-0072](../decision-records/ADR-0072-revenue-forecasting-model.md)
decision 5). Each snapshot is a point-in-time forecast *call* for one
owner/team/period; once a period closes, its **realised closed-won** is known and
every earlier call can be scored against it.

- **Mean accuracy** — average of `1 − |forecast − realised| / realised` across all
  graded calls, coloured green (≥90%), amber (≥70%), or red. A wild over-forecast
  reads as 0%, never negative.
- **Settled periods** — how many periods have closed and therefore have a realised
  actual to grade against.
- **Forecast bias** — the average **signed** variance (forecast − realised). A
  positive figure means we habitually **over-forecast**; negative means we
  **under-forecast**. This is the systematic lean, distinct from the miss size.
- **Typical miss** — the average **absolute** variance (miss size regardless of
  direction).
- **Accuracy over time** — a line chart of each call's accuracy %, with a dashed
  100% reference line; accuracy should climb as calls get closer to the period
  close.
- **Graded calls** — a table (newest first) of each call: the date it was made, the
  target, the period end, the **lead** (days ahead the call was made), the forecast,
  the realised actual, the signed **variance** (amber = over, blue = under), and the
  accuracy %.

The forecast number graded is the **weighted** call by default (the
probability-discounted pipeline-health number). The accuracy section keys off the
snapshot's **owner/team dimension** when it is present — accuracy is reported per
target, so a per-owner attainment/accuracy split is available; if the snapshots are
account/category-scoped only, the surface says so honestly and reports the
account/category accuracy instead. Until a period has settled (a snapshot captured
on or after the period end), the section explains that accuracy populates once the
nightly job has run and at least one period has closed.

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

The **accuracy trend** ([ADR-0062](../decision-records/ADR-0062-reporting-bi-hub.md)
BI hub · [ADR-0072](../decision-records/ADR-0072-revenue-forecasting-model.md)
decision 5, #384) is the same read-only pattern over the `forecast_snapshot` table
(also migration 0114, no new schema): the grading math (realised actual per period,
variance, accuracy %) is the pure, unit-tested `src/lib/forecast-accuracy.ts`; the
read + sample fallback is `src/lib/forecast-accuracy-data.ts`
(`crm.listForecastSnapshots()`); the chart is `ForecastAccuracyChart` in
`src/components/reporting/forecast-charts.tsx`. The snapshots themselves are
**written by the backend/pipeline nightly job** (#382, ADR-0042) — never by this
front end.

## Not yet on the forecast

- **Setting forecast fields in the UI** — editing a deal's category / probability /
  expected close date is a separate control surface; today they are set upstream.
- **Choosing the accuracy basis in the UI** — the accuracy trend grades the
  **weighted** call; grading the commit call (or toggling between them) is a small
  follow-up.
- **Period / owner filters on the live forecast** — the headline view rolls up the
  whole open pipeline; the accuracy section already breaks out per owner/team target
  from the snapshots, but interactive period/owner slicing of the live forecast is
  still to come.
