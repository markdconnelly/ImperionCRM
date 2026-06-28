# Workflow: payroll-recon (finance v1)

**Job:** read the attested `timesheet` / `expense_report` for a pay/reimbursement cycle,
compute the **expected** pay + reimbursement, match it against the QBO purchases (bronze,
held as matched context) → **matched / outstanding / mismatch**, and **escalate the
mismatches to the CFO** as an internal reversible flag. Read-only; Audrey reconciles and
flags, a human + QBO act.

**Trigger:** a payroll / reimbursement reconciliation cycle (a pay run or expense
reimbursement batch to tie out), or an on-demand request. One run per recon subject/cycle.

**What this is NOT:** no posting, no QBO push, no money move at any rung — QBO is the system
of record for money movement (ADR-0123). Audrey reads the attested facts, ties out against
the QBO purchases bronze, and escalates mismatches; the pay/reimbursement and any correction
are a human + QBO. Individual salary / **Pay Rate enters the expected-pay math but is NEVER
disclosed** — only the result (matched / outstanding / mismatch by amount) is reported
(salary non-disclosure, audrey.md).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | expected-pay | Read attested time/expense; compute expected pay + reimbursement | — |
| 02 | match-qbo | Match expected vs the QBO purchases bronze; classify matched/outstanding/mismatch | — |
| 03 | escalate-mismatch | Escalate mismatches to the CFO as an internal reversible flag | **CFO loop** |

## Autonomy

Read-only; **tops out at L2** (Audrey has no higher rungs — no send, no money action).
Default rung **L1** (draft the recon-mismatch flag → park for the CFO). At **L2**, the
internal **recon-mismatch flag auto-raises** to the CFO (reversible — a flag can be
dismissed). No posting, no QBO push, no money move at any rung. Pay Rate is used in the
expected-pay math but **never disclosed** (refusal-class, audrey.md).

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `recon-rubric.md` (the payroll/reimbursement recon
method — expected = approved hours × Pay Rate; matched/outstanding/mismatch classification;
tie-out arithmetic; salary-non-disclosure refusal-class discipline). Mark-editable; stages
cite, never restate. Rules of the format: `../../../CONVENTIONS.md`. The structured manifest
is `agent.yaml`; the composed prose is `prose.md`.
