# Cash-flow-forecast rubric (Mark-editable — inflow/outflow inputs + runway method + the D3 transparent-projection discipline)

> DEFAULTS authored by the agent 2026-06-29. The rubric for `cash-flow-forecast`: the inflow
> and outflow inputs, how to project the runway transparently, when runway risk is material,
> and the hard never-guess-an-input rule. Mark: edit freely — this is the canonical forecast
> rubric (stages cite it, nothing restates it). It is a projection read, not an action list:
> every output is a flag, never a post, an invoice change, a budget edit, or a QBO push
> (ADR-0123). No client PII, no figures — this is the *rubric*, not the period's data
> (ADR-0060).

## The inputs (grounded — never guessed)

| Side | Input signal | Source | Measured / projected |
|---|---|---|---|
| **Inflow** | expected AR collection | silver `invoice` (QBO read-only mirror, ADR-0085; #1580) — `okf:invoice` | open balances are **measured**; the timing of collection is **projected** |
| **Outflow** | payroll / recurring labor cost | silver `time_record` (attested, ADR-0082) — `okf:time_record` | recent labor is **measured**; forward labor is **projected** |
| **Outflow** | recurring expense | silver `expense_item` (approved, ADR-0083) — `okf:expense_item` | recent expense is **measured**; forward expense is **projected** |
| **Plan baseline** | planned outflow | silver `budget` (human-authored, agent READ-ONLY, #1718) — `okf:budget` | the plan is **measured** input; the run-rate applied is **projected** |

Each input is read at a single stated **as-of date**. A missing input — an unhydrated AR
mirror (#1580), an absent outflow signal — is a **noted gap that is escalated**, never a
guessed number.

## The runway projection method (shown on every run — D3)

A runway projection is a **transparent forward-looking inference**. On every run, show:

- **Method** — how the runway is computed (e.g. opening cash position + projected net inflow
  over the horizon, period by period, until cash crosses a stated floor). State the horizon.
- **Assumptions** — every assumption made explicit: the collection-timing assumption applied to
  open AR, the run-rate applied to labor / expense, the opening cash basis, and any scenario
  toggles. An assumption is part of the output, never hidden.
- **Label** — every projected figure is labeled **inference / scenario**, distinct from the
  **measured** inputs it is built on. A projection is never presented as a measured fact.
- **Reversible signal** — the runway projection is an internal, reversible signal for a human;
  it never acts.

## The material-runway-risk threshold

Runway risk is **material** when the projection crosses the rubric threshold — by default when
projected cash falls below a stated floor inside the horizon, or the runway shortens past a
stated number of periods versus the prior snapshot. State the threshold + horizon used on every
run so the flag set is reproducible.

## The D3 transparent-projection discipline (hard)

- **A projection is never a gap-fill.** If a forecast **input** is missing, **escalate THAT
  gap** — do not invent the input to keep the projection whole. A projection built on a guessed
  input is a fabrication (audrey.md "never estimate into a data gap"; D3, epic #1394).
- **Measured input vs projected figure.** Label which figures are measured (read off silver)
  and which are projected (forward inference). The reader must always be able to tell the
  grounded basis from the projection.
- **Method + assumptions are part of the output.** A runway number without its method and
  assumptions is not a finance projection — it is an unsupported claim. Show them every time.
- **As-of discipline.** Every input and the projection carry the as-of date of the read. A
  runway figure without its as-of date is meaningless.
- **Verdict, never disclosure.** Where an individual pay rate enters the outflow math, report
  only the aggregate outflow and the runway — never an individual's rate (the salary
  non-disclosure refusal-class rule, audrey.md).
- **Projection, not action.** The output is the runway projection + risk flags raised to the
  cockpit / Sterling. Any treasury action, posting, invoice change, budget edit, or QBO push
  stays a human (and QBO) call.

## Runway verdict

- **Runway clear** — the projection stays above the floor across the horizon under the stated
  assumptions; report the projection with method, assumptions, and as-of date.
- **Risk flagged** — the projection crosses the material threshold; flag it with the tie-out
  (opening basis, projected net flow, the period the floor is crossed) and the assumptions.
- **Gap** — a forecast input is missing or stale; escalate the gap, do not guess the input. A
  run with any input gap is not a clean "runway clear" (this is the propose-only / dormant case
  until the AR mirror hydrates, #1580).
