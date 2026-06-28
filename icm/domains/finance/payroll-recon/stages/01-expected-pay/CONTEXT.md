# Stage 01 — expected-pay

**Job:** read the attested time/expense facts and compute the expected pay + reimbursement
for the recon subject.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Attested time | silver `timesheet` · `okf:timesheet` / silver `time_record` · `okf:time_record` | the subject's cycle | approved hours for the expected-pay math |
| Attested expense | silver `expense_report` · `okf:expense_report` / silver `expense_item` · `okf:expense_item` | the subject's cycle | attested expense lines for the expected reimbursement |
| Recon rubric | `./skills/recon-rubric.md` | all | the expected-pay/reimbursement method + tie-out discipline |

## Process

1. `[script]` Resolve the recon subject (the person + pay/reimbursement cycle to tie out).
   No resolvable subject/cycle → audit fail.
2. `[script]` Read the attested time facts (approved hours) and attested, in-policy expense
   lines for the cycle. An un-attested or missing record is noted as a gap — not guessed.
3. `[sonnet]` Compute **expected pay = approved hours × Pay Rate** and the **expected
   reimbursement** total per `recon-rubric.md`. The Pay Rate is used in the math only and is
   **never written into the output** (refusal-class). A missing rate or missing approved
   hours is a data gap to escalate, not a figure to estimate.

## Outputs

`expected.md` — the resolved subject + cycle, the **expected pay** total and **expected
reimbursement** total (results only — no per-person Pay Rate), the inputs weighed with their
as-of dates, and any attestation / data gaps noted.

## Audit

- [ ] Resolved subject + cycle stated (not blank)
- [ ] Attested time + expense facts read (or gaps noted, not guessed)
- [ ] Expected pay + expected reimbursement computed as results only — **no Pay Rate / salary figure emitted**
- [ ] No figure estimated into a data gap
