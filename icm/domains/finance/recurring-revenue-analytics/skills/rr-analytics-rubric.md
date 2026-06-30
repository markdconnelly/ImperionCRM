# Recurring-revenue-analytics rubric (Mark-editable — which governed contracts to consume + trend + consumes-never-re-derives + advise-only-to-renewal)

> DEFAULTS authored by the agent 2026-06-29. The rubric for `recurring-revenue-analytics`:
> which governed `metric_definition` contracts to consume, how to read the trend, when a movement
> is material, and the consumes-never-re-derives + advise-only boundaries. Mark: edit freely —
> this is the canonical recurring-revenue rubric (stages cite it, nothing restates it). It is a
> read, not an action list: every output is a flag / read, never a post, an invoice change, a
> metric-definition edit, or a QBO push (ADR-0123). No client PII, no figures — this is the
> *rubric*, not the period's data (ADR-0060).

## What to consume (governed contracts — never re-derived)

Audrey **consumes** the governed `metric_definition` contracts; she does **not** re-derive the
metric math (D1, #1050). Read the one governed definition agents and dashboards share:

| Metric | What it is | Source contract |
|---|---|---|
| **MRR** | monthly recurring revenue | the governed `metric_definition` MRR contract (#1050/#1055) — `okf:metric_definition` |
| **ARR** | annualized recurring revenue | the governed ARR contract (from MRR per its definition) |
| **NRR** | net revenue retention (expansion − contraction − churn over a base) | the governed NRR contract |
| **Revenue-churn** | revenue lost to churn over the period | the governed revenue-churn contract |

Where a contract resolves through the invoice record, ground against the `invoice` QBO mirror
(`okf:invoice`); never recompute the contract's own arithmetic — read its governed result.

## The trend read

A CFO / board recurring-revenue read, not a worklist. Report, each with its as-of date:

- **Metric levels** — the current MRR / ARR / NRR and revenue-churn (the governed result,
  **measured / governed**).
- **Period-over-period trend** — prior vs current per metric (the delta and direction are
  **derived** from the two governed levels), **only when a prior snapshot exists** (a single
  snapshot has no trend — say so).
- **Material movement** — any metric whose movement crosses the threshold below, flagged with
  its tie-out (prior, current, delta, as-of date).
- **Forward-looking element (optional)** — an ARR run-rate projection or trend extrapolation, if
  asked: a **transparent projection** with method + assumptions shown, labeled
  **inference / scenario**, never a gap-fill (D3).
- **Renewal-motion intel** — the read packaged as advise-only intel for the renewal motion; it
  **feeds** the renewal decision, it does not make it.
- **Data gaps** — an unbound metric contract, a stale source — noted, never guessed into.

## The material-movement threshold

A movement is **material** when it crosses the rubric threshold — by default the **greater of an
absolute floor and a percentage change** versus the prior snapshot. Sub-threshold movement is
reported in the trend but not flagged. State the threshold used on every run.

## Discipline

- **Consume, don't re-derive (D1).** The metric figures are the governed `metric_definition`
  result; read them, never recompute the metric math. If you find yourself reimplementing MRR /
  NRR arithmetic, you are off-contract — read the governed definition instead.
- **Don't duplicate churn-scoring or the renewal motion.** The churn-scoring model is #1046;
  Chase owns the renewal motion. This read **feeds** the renewal motion, advise-only — it never
  scores churn afresh and never blocks / approves / sends a renewal.
- **Signal vs inference; don't estimate into a data gap.** The governed metric levels are
  measured / governed; trends and any projection are derived. Label which is which. Missing or
  stale → **note the gap**; never guess a number to fill it (audrey.md).
- **D3 for any projection.** A forward-looking figure shows its method + assumptions + as-of
  date, is labeled inference / scenario, and is never a gap-fill — a missing projection input is
  escalated, not guessed.
- **As-of discipline.** Every figure carries the as-of date of the snapshot it was read from.
- **Verdict, never disclosure; advise, never block.** Report the revenue picture; never disclose
  an individual pay rate (salary non-disclosure, audrey.md). The renewal block / approve / send
  stays a human (and Chase) call.
- **No PII, no row-level values committed.** Report shape and aggregates; query the live
  read-only DB for actuals. Account names are business identifiers; never emit personal PII.

## Read verdict

- **Stable** — no metric movement crosses the material threshold; report the levels + trend with
  as-of date.
- **Movement flagged** — one or more metrics cross the threshold; list each with prior, current,
  delta, and as-of date.
- **Gap** — a governed contract is unbound or a source is stale; escalate the gap, do not guess.
  A run with any gap is not a clean "stable".
