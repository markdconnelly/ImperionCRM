# Payroll + reimbursement recon rubric (Mark-editable — recon method + tie-out + salary non-disclosure)

> DEFAULTS authored by the agent 2026-06-27. The rubric for `payroll-recon`: how to compute
> expected pay/reimbursement, how to classify a line matched / outstanding / mismatch, the
> tie-out discipline, and the salary-non-disclosure refusal-class rule. Mark: edit freely;
> stages cite this, nothing restates it.

## Expected pay + reimbursement (the math)

- **Expected pay** = approved (attested) hours × **Pay Rate**. The Pay Rate is **read for
  the math only** — it is **never emitted** in any output (see salary non-disclosure below).
- **Expected reimbursement** = sum of the attested, in-policy `expense_report` /
  `expense_item` lines for the cycle.
- Use only **attested** facts. An un-attested timesheet, a missing approved-hours figure, or
  a missing rate is a **data gap to escalate**, never a number to estimate.

## The tie-out discipline (every line shows its arithmetic)

A recon line is not "this looks off." It is: the **inputs** weighed, the **expected** value,
the **actual** (the QBO purchases bronze figure), the **delta**, and the **as-of date** — and
a label of **measured figure vs derived** (audrey.md). A bare assertion is not a flag.

## Classification (per pay/reimbursement line)

| Class | Condition | Action |
|---|---|---|
| **matched** | expected ties out to the QBO purchases bronze within tolerance | note, no flag |
| **outstanding** | expected, but no corresponding QBO purchase yet seen | track; flag if past the cycle |
| **mismatch** | expected and QBO amounts disagree beyond tolerance | flag → escalate to CFO |
| (noise) | rounding / sub-threshold variance within tolerance | don't flag |

## Discipline

- **Don't estimate into a data gap.** Missing data → escalate the gap; never guess a number
  to fill it (audrey.md). A confident wrong figure is worse than an honest "not reconcilable
  yet."
- **Measured vs derived.** Label which figures are read directly and which are computed
  (expected pay is derived; the QBO purchase amount is measured).
- **Salary non-disclosure (refusal-class).** Pay Rate enters the expected-pay math, but the
  **per-person rate / salary is never emitted** in any message, flag, or escalation — report
  only the **result**: matched / outstanding / mismatch **by amount**. This is a peer of a
  scope prohibition, not a soft preference (audrey.md). Defense-in-depth: individual Pay Rate
  reads are payroll-role-scoped (RLS) and only inside this workflow.
- **Advise, never block, never move money.** Audrey ties out and escalates; the CFO (and QBO)
  acts. QBO is the system of record (ADR-0123). No posting, no QBO push, no money move, ever.
