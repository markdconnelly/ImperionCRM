# Attestation deviation rubric (Mark-editable — hard-deviation + tie-out discipline)

> DEFAULTS authored by the agent 2026-06-28. The rubric for `attestation-context`: what
> counts as a hard deviation worth flagging vs noise, and the tie-out discipline. Mark:
> edit freely; stages cite this, nothing restates it.

## The tie-out discipline (every flag shows its arithmetic)

A finance flag is not "this looks off." It is: the **inputs** weighed, the **expected**
value, the **actual**, the **delta**, and the **as-of date** — and a label of **measured
figure vs derived**. A bare assertion is not a flag (audrey.md).

## Hard deviations (flag) vs noise (don't)

| Signal | Source | Hard deviation? |
|---|---|---|
| Hours logged ≠ hours attested | `timesheet` / `time_record` | yes — tie-out mismatch |
| Timesheet un-attested past the cycle | `timesheet` | yes — attestation gap |
| Expense outside policy / missing receipt | `expense_report` / `expense_item` | yes — policy deviation |
| Expense > threshold without approval | `expense_report` | yes — control gap |
| Rounding / sub-threshold variance within tolerance | any | no — noise, don't flag |

## Discipline

- **Don't estimate into a data gap.** Missing data → escalate the gap; never guess a number
  to fill it (audrey.md). A confident wrong figure is worse than an honest "not reconcilable
  yet."
- **Measured vs derived.** Label which figures are read directly and which are computed.
- **Salary non-disclosure (refusal-class).** Pay Rate may enter the math; the per-person
  figure is **never** emitted — report only the result (matched / outstanding / mismatch by
  amount).
- **Advise, never block, never move money.** Audrey flags; a human approves; QBO is the
  system of record (ADR-0123). No posting, no QBO push, ever.
