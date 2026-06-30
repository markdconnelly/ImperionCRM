# Cost-to-serve rubric (Mark-editable — which governed contracts to consume + per-client/service read + thin-margin threshold + advise-never-block)

> DEFAULTS authored by the agent 2026-06-29. The rubric for `cost-to-serve`: which governed
> `metric_definition` contracts to consume, how to structure the per-client / per-service-line
> profitability read, when a margin is thin / compressing, and the consumes-never-re-derives +
> advise-never-block boundaries. Mark: edit freely — this is the canonical cost-to-serve rubric
> (stages cite it, nothing restates it). It is a read, not an action list: every output is a flag
> / read, never a post, an invoice change, a metric-definition edit, or a QBO push (ADR-0123). No
> client PII, no figures — this is the *rubric*, not the period's data (ADR-0060).

## What to consume (governed contracts — never re-derived)

Audrey **consumes** the governed contracts; she does **not** re-derive the allocation math (D1).
The cost / revenue allocation views (migs 0197/0198/0200) are **upstream** — exposed through the
governed metrics, which IS the consumption surface:

| Metric | What it is | Source contract |
|---|---|---|
| **cost_to_serve** | the allocated cost to serve a client / service line | the governed `cost_to_serve` contract in `metric_definition` (#1091/#1093) — `okf:metric_definition` |
| **margin_to_serve** | the margin after cost-to-serve (revenue − cost_to_serve) | the governed `margin_to_serve` contract (#1093) |

Where a contract resolves through billed revenue or cost, ground against the `invoice` mirror
(`okf:invoice`) and the attested `time_record` cost basis (`okf:time_record`) — but the metric
arithmetic stays the **governed contract's**, never recomputed here.

## The per-client / per-service-line read structure

A profitability read, not a worklist. Report, each with its as-of date:

- **Cost-to-serve** — the governed cost-to-serve per client / service line (**measured /
  governed**).
- **Margin-to-serve** — the governed margin per client / service line (**measured / governed**);
  the margin **% of revenue** is **derived** from the governed figures.
- **Thin / compressing margin** — any client / service line whose margin crosses the threshold
  below, flagged with its tie-out (cost-to-serve, revenue, margin, margin %, as-of date).
- **Trend** — margin direction vs the prior snapshot **only when a prior snapshot exists** (a
  single snapshot has no trend — say so).
- **Notable concentrations** — a client / service line driving the margin picture, by account /
  service-line name (a business identifier, not personal PII).
- **Note-only line-agent context** — the relevant profitability context supplied note-only to
  Pierce / Celeste / Vance; it informs, it does not gate.
- **Data gaps** — an unbound contract, a stale source — noted, never guessed into.

## The thin-margin / compression threshold

A margin is **thin** when it falls below a stated floor, or **compressing** when it drops past a
stated amount / percentage versus the prior snapshot. Sub-threshold margins are reported in the
distribution but not flagged. State the threshold + floor used on every run so the flag set is
reproducible.

## Discipline

- **Consume, don't re-derive (D1).** The cost-to-serve / margin figures are the governed contract
  result; read them, never recompute the allocation math. The allocation views (0197/0198/0200)
  are upstream — do not read them directly; read the governed metric they feed. If you find
  yourself reimplementing the allocation, you are off-contract.
- **Don't duplicate the profitability epic (#1044).** Read its governed output; do not re-run its
  computation.
- **Signal vs inference; don't estimate into a data gap.** The governed cost / margin figures are
  measured / governed; margin %, trends, concentrations are derived. Label which is which. Missing
  or stale → **note the gap**; never guess a number to fill it (audrey.md).
- **As-of discipline.** Every figure carries the as-of date of the snapshot it was read from.
- **Verdict, never disclosure; advise, never block.** Report the margin picture; never disclose an
  individual pay rate that enters a cost figure (salary non-disclosure, audrey.md). The line
  agents' block / approve stays theirs and a human's — Audrey's profitability context is note-only.
- **No PII, no row-level values committed.** Report shape and aggregates; query the live read-only
  DB for actuals. Account / service-line names are business identifiers; never emit personal PII.

## Read verdict

- **Healthy** — no client / service line crosses the thin / compression threshold; report the
  distribution with tie-outs and as-of date.
- **Margin flagged** — one or more lines cross the threshold; list each with cost-to-serve,
  revenue, margin, margin %, and as-of date.
- **Gap** — a governed contract is unbound or a source is stale; escalate the gap, do not guess. A
  run with any gap is not a clean "healthy".
