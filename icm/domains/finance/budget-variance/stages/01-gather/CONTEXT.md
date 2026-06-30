# Stage 01 — gather

**Job:** read the period's `budget` plan and the matching actuals (attested time, approved
expense, invoice mirror) into one as-of-dated plan-and-actuals record. Gather only; no
variance, no flag, no action.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Period scope | the triggering run (the budgeted period being read) | the period bounds + as-of date | the subject |
| Operating plan | silver `budget` · `okf:budget` | plan lines for the period (per account) | the plan side of plan-vs-actual (READ-ONLY, #1718) |
| Actual labor | silver `time_record` · `okf:time_record` | period attested time | actual labor cost (row 1) |
| Actual expense | silver `expense_item` · `okf:expense_item` | period approved expense, by category | actual expense (row 2) |
| Actual revenue | silver `invoice` (QBO read-only mirror) · `okf:invoice` | period billed revenue | actual revenue (row 3) |
| Rubric | `./skills/variance-rubric.md` | all | what each plan line / actual feeds |

## Process

1. `[script]` Fix the period bounds and the read as-of date; stamp every subsequent figure
   with that as-of date.
2. `[script]` Read the `budget` plan lines for the period (per account / period). The budget
   is **read-only** — write no row to it (#1718). A plan line absent for an account that has
   an actual is a **noted gap**, not a guessed zero.
3. `[script]` Read the actuals per the rubric: period labor cost from attested `time_record`,
   period approved expense by category from `expense_item`, period billed revenue from the
   `invoice` QBO mirror. Record figures; write no silver row (read-only).
4. `[script]` Align each actual to its plan account / period key. Mark each captured figure
   **measured** (a direct read) or **derived**, and flag any plan line or actual that is
   missing or stale as a **gap** — never fill a gap with an estimate.

## Outputs

`plan-actuals.md` — for the period and its as-of date: the `budget` plan lines, the three
actuals (labor / expense / revenue) aligned to their plan keys, every figure labelled
measured/derived, and any gaps called out. No variance or flag yet — that is stage 02.

## Audit

- [ ] Period bounds and a single read as-of date are stated
- [ ] Plan lines + the three actuals present, each aligned to its account / period key
- [ ] Each figure labelled measured or derived; no figure estimated into a gap
- [ ] Any missing/stale plan line or actual recorded as a gap (never estimated)
- [ ] No silver row written (budget and all sources read-only); no money action taken
