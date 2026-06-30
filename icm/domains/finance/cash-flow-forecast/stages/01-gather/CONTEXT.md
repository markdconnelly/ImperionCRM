# Stage 01 — gather

**Job:** read the grounded inflow + outflow inputs — expected AR inflow, and payroll /
recurring outflow against the budget plan — into one as-of-dated inputs record. Gather only;
no projection, no flag, no action.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| As-of scope | the triggering run | the as-of date + projection horizon | the subject |
| AR inflow (QBO mirror) | silver `invoice` (QBO read-only mirror) · `okf:invoice` | open invoices as of the date | expected inflow input (#1580) |
| Payroll / recurring labor | silver `time_record` · `okf:time_record` | recent attested labor cost | outflow input — labor run-rate |
| Recurring expense | silver `expense_item` · `okf:expense_item` | recent approved expense | outflow input — expense run-rate |
| Outflow plan baseline | silver `budget` · `okf:budget` | planned outflow for the horizon | the plan baseline (READ-ONLY, #1718) |
| Rubric | `./skills/forecast-rubric.md` | all | which inputs feed the projection, measured vs projected |

## Process

1. `[script]` Fix the **as-of date** and the **projection horizon** for the run; stamp every
   subsequent figure with that as-of date.
2. `[script]` Read the AR inflow input from the `invoice` QBO read-only mirror — open balances
   as the **measured** inflow basis. If the AR mirror is unhydrated (#1580) or stale, record a
   **gap** — the missing input is escalated, never guessed.
3. `[script]` Read the outflow inputs: recent payroll / recurring labor from `time_record` and
   recurring expense from `expense_item` as the **measured** outflow basis, and the planned
   outflow from the `budget` baseline (read-only, #1718). Write no silver row (read-only).
4. `[script]` Mark each captured figure **measured** (a direct read, the grounded basis) and
   flag any missing or stale input as a **gap** — never fill a forecast input with an estimate.
   No projection here.

## Outputs

`inputs.md` — for the as-of date and horizon: the measured inflow basis (open AR), the measured
outflow basis (labor + expense run-rate), the budget outflow baseline, every figure labelled
measured, and any missing input recorded as an escalated gap. No projection yet — that is stage
02.

## Audit

- [ ] As-of date and projection horizon stated (not blank)
- [ ] Inflow basis (open AR) and outflow basis (labor + expense) read, each as a measured figure
- [ ] Budget outflow baseline read (read-only); no silver row written
- [ ] Any missing/stale forecast input recorded as an escalated gap (never guessed)
- [ ] No projection produced here; no money action taken (read-only)
