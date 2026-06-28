# Stage 01 — read-attested

**Job:** read the attested time/expense facts + the reconciliation summary for the subject.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Attested time | silver `timesheet` · `okf:timesheet` / silver `time_record` · `okf:time_record` | the subject's cycle | the attested hours to tie out |
| Attested expense | silver `expense_report` · `okf:expense_report` / silver `expense_item` · `okf:expense_item` | the subject's cycle | the attested expenses to tie out |

## Process

1. `[script]` Resolve the attestation subject (the timesheet / expense report under
   approval) and its cycle. No resolvable subject → audit fail.
2. `[script]` Read the attested time + expense facts and the wired reconciliation summary
   (ADR-0082 / ADR-0083). An un-attested or missing record is noted as a gap — not guessed.

## Outputs

`attested.md` — the resolved subject, the attested time + expense facts, the reconciliation
summary, and any attestation/data gaps noted.

## Audit

- [ ] Resolved subject + cycle stated (not blank)
- [ ] Attested time + expense facts read (or gaps noted, not guessed)
- [ ] No figure estimated into a data gap
