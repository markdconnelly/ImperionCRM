# Budget-variance rubric (Mark-editable — plan-vs-actual alignment + material-variance threshold + tie-out)

> DEFAULTS authored by the agent 2026-06-29. The rubric for `budget-variance`: how to align
> the human-authored `budget` plan to the period's actuals, when a variance is **material**,
> and the tie-out discipline. Mark: edit freely — this is the canonical variance rubric
> (stages cite it, nothing restates it). It is a read, not an action list: every row produces
> a variance flag, never a budget edit, a post, an invoice change, or a QBO push (ADR-0123;
> the budget is agent READ-ONLY, #1718). No client PII, no figures — this is the *rubric*,
> not the period's data (ADR-0060).

## How to read this rubric

Each row is one plan-vs-actual comparison. For each, state the **plan** (the budgeted figure
read from `budget`), the **actual** (the measured figure from the actuals source), the
**delta** (actual − plan, and % of plan), and the **signal source**. Always show the **as-of
date** of the read and label every figure **measured vs derived**. A bare "we're over" is not
a finance flag — show the tie-out (plan, actual, delta, as-of date).

## The plan-vs-actual alignment (period = the budgeted period being read)

| # | Plan line | Actual signal | Actuals source | Variance computed |
|---|---|---|---|---|
| 1 | labor / staffing plan | period labor cost from attested time | silver `time_record` (attested, ADR-0082) — `okf:time_record` | actual labor − plan labor |
| 2 | expense plan (by category) | period approved expense by category | silver `expense_item` (approved, ADR-0083) — `okf:expense_item` | actual expense − plan expense |
| 3 | revenue plan | period billed revenue from the invoice mirror | silver `invoice` (QBO read-only mirror, ADR-0085) — `okf:invoice` | actual revenue − plan revenue |

The `budget` plan is the **human-authored operating plan**, read-only to the agent (#1718).
Align each actual to its plan **account / period** key; an actual with no matching plan line
(or a plan line with no actual) is a **noted gap**, not a guessed zero.

## The material-variance threshold

A variance is **material** when it crosses the rubric threshold — by default the **greater of
an absolute floor and a percentage of the plan line** (e.g. a variance is material if it
exceeds both a small absolute amount and a percentage of the plan figure; tune the two
knobs here). Immaterial variances are reported in the distribution but not flagged. State the
threshold used on every run so the flag set is reproducible.

## Tie-out discipline

- **Show the arithmetic.** For each flagged row write: plan, actual, delta, % of plan, and
  the as-of date. "Labor actual exceeds plan by <delta> (<%> of plan) as of <date>" is a
  flag; "labor looks high" is not.
- **Signal, not inference.** The actual figures are **measured**; the delta and % of plan are
  **derived** from plan + actual. Label which is which. If a plan line or an actual is missing
  or stale, **escalate the gap** — never estimate into it. A confident wrong "on track" is
  worse than an honest "this period is not yet comparable to plan."
- **As-of discipline.** Every figure carries the as-of date of the read it came from. Plan and
  actuals must be read at a single stated as-of date; an undated variance is meaningless.
- **Verdict, never disclosure.** Where an individual pay rate enters the labor-actual math,
  report only the aggregate labor figure and the variance — never an individual's rate (the
  salary non-disclosure refusal-class rule, audrey.md).
- **Read, not action.** The output is the variance read + material-variance flags raised to
  the cockpit / Sterling. The decision to re-plan, re-forecast, or adjust — and any posting,
  invoice change, budget edit, or QBO push — stays a human (and QBO) call.

## Variance verdict

- **On plan** — no plan line crosses the material threshold; report the distribution with
  tie-outs and as-of date.
- **Variance flagged** — one or more plan lines cross the material threshold; list each with
  plan, actual, delta, % of plan, signal source, and as-of date.
- **Gap** — a plan line or an actual is missing or stale; escalate the gap, do not guess. A
  run with any gap is not a clean "on plan".
