# Anomaly-sweep rubric (Mark-editable — anomaly classes + detection signals + tie-out + confidence threshold)

> DEFAULTS authored by the agent 2026-06-29. The rubric for `anomaly-sweep`: the financial-
> anomaly + controls-drift classes Audrey scans for, each class's detection signal and
> tie-out, and the confidence threshold for a confirmed flag. Mark: edit freely — this is the
> canonical anomaly rubric (stages cite it, nothing restates it). It is a flag list, not a
> correction list: every confirmed anomaly is escalated, never posted, deleted, fixed, or
> pushed to QBO (ADR-0123). No client PII, no figures — this is the *rubric*, not the period's
> data (ADR-0060).

## How to read this rubric

Each row is one anomaly class. For each, state the **detection signal** (the measured fact
that raises a candidate), the **tie-out** (baseline / expected, actual, deviation), and the
**signal source**. Always show the **as-of date** of the read and label every figure
**measured vs derived**. A bare "this looks wrong" is not a finance flag — show the tie-out.

## The anomaly classes

| # | Anomaly class | Detection signal | Tie-out | Signal source |
|---|---|---|---|---|
| 1 | **Margin compression** | period margin below a baseline / prior-period margin | expected margin, actual margin, deviation | invoice revenue vs cost from attested time / expense (silver `invoice`, `time_record`, `expense_item`) |
| 2 | **Cost spike** | a cost line (labor or expense category) materially above its run-rate baseline | baseline run-rate, actual, deviation | attested `time_record` / approved `expense_item` (+ `expense_report`) |
| 3 | **Duplicate / aberrant entry** | a likely-duplicate or out-of-pattern entry (same amount / vendor / period, or an out-of-range value) | the matched pair / the out-of-range value vs the expected range | `expense_item` / `expense_report` / `invoice` / `generated_invoice` |
| 4 | **Reconciliation drift** | a draft (`generated_invoice`) diverging from the QBO `invoice` mirror, or an attestation count not tying out | expected (mirror / attested count), actual, the drift | `generated_invoice` vs `invoice` mirror; `timesheet` attestation tie-out |

A flagged duplicate / aberrant entry (row 3) is **raised for a human (and QBO) to resolve** —
Audrey never deletes, merges, or corrects it (ADR-0123).

## The confidence / materiality threshold

A candidate becomes a **confirmed anomaly** when it crosses the rubric threshold — by default
the **greater of an absolute deviation floor and a percentage deviation from the baseline**,
combined with a confidence judgment (a clean tie-out, not a coincidence). Sub-threshold
candidates are reported as noise, not flagged. State the threshold used on every run so the
flag set is reproducible.

## Tie-out discipline

- **Show the arithmetic.** For each flagged anomaly write: the baseline / expected, the actual,
  the deviation, and the as-of date. "Expense category X is <deviation> above its run-rate
  baseline as of <date>" is a flag; "spending seems high" is not.
- **Signal, not inference.** The detection figures are **measured**; the deviation / baseline
  comparisons are **derived**. Label which is which. If a source is missing or stale,
  **escalate the gap** — never estimate into it. A confident wrong "anomaly" (or a missed real
  one) is worse than an honest "this source isn't current."
- **As-of discipline.** Every figure carries the as-of date of the read. An undated anomaly is
  not auditable.
- **Verdict, never disclosure.** Where an individual pay rate enters margin / cost math, report
  only the aggregate figure and the deviation — never an individual's rate (the salary
  non-disclosure refusal-class rule, audrey.md).
- **Flag, not correction.** The output is the flagged-anomaly set escalated to the cockpit /
  Sterling. Resolving, deleting, correcting, or posting anything — and any QBO push — stays a
  human (and QBO) call.

## Sweep verdict

- **Clean** — no candidate crosses the confidence / materiality threshold; report the scan
  coverage and the as-of date.
- **Anomalies flagged** — one or more confirmed anomalies; list each with its class, tie-out,
  signal source, and as-of date.
- **Gap** — a source is missing or stale and a class could not be swept; escalate the gap, do
  not guess. A run with any gap is not a clean sweep.
