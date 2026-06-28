# Stage 01 — read-draft

**Job:** read one `generated_invoice` draft and the two signals it will be tied out
against — the attested time behind its hours and the contract rate behind its rates.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Invoice draft | silver `generated_invoice` · `okf:generated_invoice` | the one draft in the pre-QBO-push state | the subject of the review |
| Attested time | silver `time_record` / `timesheet` · `okf:time_record` `okf:timesheet` | only the time backing this draft's lines | the hours-tie-out signal (#458) |
| Contract rate | silver `license_assignment` · `okf:license_assignment` | only the agreement items on this draft | the rate-vs-contract signal (#1041) |
| Rubric | `../../skills/precheck-rubric.md` | all | what the signals are and how to tie out |

## Process

1. `[script]` Read the draft's line items: per line the description, quantity
   (hours), unit rate, and line amount; and the draft total — each with the
   draft's as-of date. No cross-checking here.
2. `[haiku]` Read the attested time backing the draft's hour-billed lines (the
   approved `timesheet` / `time_record` figures), with their as-of date. Absence
   is information — record a line with no attested-time signal as a gap, do not
   fabricate one.
3. `[haiku]` Read the contract/true-up rate for the draft's agreement lines (the
   `license_assignment` rate), with its as-of date. A line with no contract-rate
   signal is recorded as a gap.
4. `[script]` Assemble the signal table: per draft line, the draft figure and the
   matching attested-time and contract-rate figure (or `gap`), each with its as-of
   date. This is the input the next stage cross-checks — no verdict yet.

## Outputs

`draft-and-signals.md` — the draft's lines (description, hours, rate, amount,
total) plus, per line, the matched attested-time and contract-rate figure or
`gap`, every figure carrying its source and as-of date. No anomaly verdicts yet.

## Audit

- [ ] Exactly one `generated_invoice` draft read; its total and every line present
- [ ] Each draft line has a matched attested-time figure OR an explicit `gap`
- [ ] Each agreement line has a matched contract-rate figure OR an explicit `gap`
- [ ] Every figure carries a source and an as-of date (blank is not valid)
- [ ] No per-person Pay Rate read or recorded (salary non-disclosure, audrey.md)
