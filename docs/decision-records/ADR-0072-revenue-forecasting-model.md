# ADR-0072: Revenue forecasting — categories, probability, quota, and snapshots

| Field | Value |
|---|---|
| **Repo** | frontend (schema + read model + GUI); backend/pipeline (snapshot job) |
| **Status** | Accepted (2026-06-12, merged to main; scope locked with Mark; schema audited — additions required) |
| **Date** | 2026-06-12 |
| **Cross-references** | ADR-0010 (customer data model / dual-axis stages), ADR-0021 (reporting read model + Recharts), ADR-0062 (reporting BI hub), ADR-0067 (CPQ — quote-derived deal value), ADR-0030/0016 (RBAC — revenue visibility), ADR-0042 (division of labor) |
| **Epic** | #316 · Parent #314 |

## Problem

We can see a pipeline but cannot forecast from it. There is no expected/weighted revenue, no forecast categories (commit / best-case / pipeline / omitted), no quota or attainment, and no point-in-time history to show trend or measure forecast accuracy. Forecasting is table-stakes across the majors and is the natural consumer of CPQ deal value (#317).

## Context — schema audit (the open "is it schema-light?" question, answered)

The existing `opportunity` table (migrations 0001/0005) has:

- `sales_stage` enum — `lead | qualified | proposal | won | lost`
- `amount_mrr numeric` — **MRR only**; no one-off / term / TCV
- `owner_user_id`, `account_id`, `attribution jsonb`, `source`/`external_ref`
- `closed_at timestamptz` — the **actual** close, set on won/lost

What forecasting needs and the schema **lacks**: an **expected close date** (distinct from `closed_at`), a **win probability**, a **forecast category** (the human judgement call, independent of stage), **quota**, and **point-in-time snapshots**. Conclusion: **forecasting requires schema additions** — it is not schema-light. This ADR settles their shape.

Two facts shape the model:

1. **Stage ≠ forecast category.** Sales stage is where the deal *is*; forecast category is what the owner *commits to*. The majors keep these independent (a late-stage deal can still be "best-case", an early deal "omitted"). We adopt that separation rather than deriving category from stage.
2. **Deal value is about to change source (ADR-0067).** Today value is the single `amount_mrr`. After CPQ, the authoritative value (MRR / one-off / TCV) comes from the approved quote materialized onto the deal. The forecast reads a deal-value field that v1 backfills from `amount_mrr` and CPQ later populates from the quote — so forecasting does not block on CPQ but aligns with it.

## Options considered

- **A. Pure stage-weighted forecast (probability = f(stage)).** Simple, no human input. Rejected as the *only* model: gives no commit/best-case judgement and no quota view — the numbers reps and finance actually run on.
- **B. Forecast categories + quota, live-only (no history).** Covers the judgement and attainment views but cannot show trend or measure forecast accuracy (you can't compare "what we called 3 weeks ago" to now). Rejected: snapshots are cheap and accuracy is half the point.
- **C. Categories + probability + quota + periodic snapshots (chosen).** Independent forecast category, a probability (default per stage, overridable), quota per owner/period, and nightly snapshots for trend + accuracy. Reads through the ADR-0021 read model onto the BI hub (ADR-0062).

## Decision

1. **Add forecasting fields to the deal.** On `opportunity` (or a `1:1` forecast extension if we keep the core table lean): `expected_close_date date`, `win_probability numeric` (0–1; **defaulted per `sales_stage`**, owner-overridable), `forecast_category text check (in ('commit','best_case','pipeline','omitted'))`, and a `deal_value` source that is `amount_mrr` in v1 and quote-derived post-CPQ (ADR-0067).

2. **Forecast category is independent of stage** (decision fact 1). It is the owner's explicit call; stage transitions may *suggest* a category but never silently set it.

3. **Two forecast numbers, both shown.** **Weighted** = Σ(deal_value × win_probability) over the period; **categorised** = Σ by forecast category (commit / +best_case / +pipeline). Finance reads categorised; pipeline health reads weighted. Closed-won in the period is the realised floor.

4. **Quota + attainment.** `quota` per `(owner_user_id | team, period)`; attainment = closed-won in period ÷ quota. Surfaced per owner and rolled up.

5. **Snapshots for trend + accuracy.** A nightly `forecast_snapshot` captures, per owner/period, the weighted + categorised totals and quota. This powers the forecast-over-time trend and **forecast-accuracy** (snapshot call vs eventual actual). The snapshot job runs in backend/pipeline (ADR-0042); the read model and views live here (ADR-0021).

6. **RBAC (ADR-0030/0016).** Revenue is already gated server-side (`canSeeRevenue`, pipeline blanks MRR for Support). Forecast views inherit this — no revenue or quota leaks to roles without the grant.

**Table sketch (migration number assigned at implementation; verify on disk):**

```sql
-- option: extend opportunity, or a 1:1 extension table:
alter table opportunity
  add column expected_close_date date,
  add column win_probability numeric,          -- 0..1, default per stage
  add column forecast_category text
    check (forecast_category in ('commit','best_case','pipeline','omitted'));

quota (
  id, owner_user_id fk null, team text null,
  period_start date, period_end date, amount numeric, ...
  -- exactly one of owner_user_id / team set
)
forecast_snapshot (                              -- nightly, point-in-time
  id, captured_on date, owner_user_id fk null, team text null,
  period_start date, period_end date,
  weighted numeric, commit_total numeric, best_case_total numeric,
  pipeline_total numeric, closed_won numeric, quota numeric, ...
)
```

## Consequences

- Forecasting and CPQ (#317) share the deal-value field; build the field once, CPQ fills it from quotes — sequence CPQ's quote→deal value with this so the source is unambiguous.
- Snapshots add a small nightly job and a steadily-growing table (one row per owner/period/day) — bounded and cheap; prune policy is a future item.
- Probability defaults per stage are a starting heuristic; a learned/predicted probability is a future enhancement (pairs with conversational-intel risk signals, #315).

## Future considerations

- Predicted win probability (model over deal + engagement + conversation-risk features, #315) replacing the per-stage default.
- Multi-line / multi-product forecasting once CPQ quote lines exist (split MRR vs one-off vs TCV in the forecast).
- Territory/team hierarchy rollups — deferred with the territory-management exclusion (#314).
