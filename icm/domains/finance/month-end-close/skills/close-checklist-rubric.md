# Close-checklist rubric — month-end close readiness (Mark-editable)

> DEFAULTS authored by the agent 2026-06-27 — Mark: edit freely, this file is the
> canonical close-readiness checklist (stages cite it, nothing restates it). It is
> Audrey's checklist, not an action list: every item produces a flag, never a close,
> a post, an invoice edit, or a QBO push (ADR-0123). No client PII, no figures — this
> is the *rubric*, not the period's data (ADR-0060).

## How to read this rubric

Each row is one close-readiness check. For each, state the **measured signal**
(the fact you read), the **blocker condition** (when it stops the close), and the
**signal source** (where the fact comes from). Always show the **as-of date** of
the read and label every figure **measured vs derived**. A bare "looks ready" is
not a finance flag — show the tie-out (the count expected, the count actual, the
delta).

## The checklist (period = the accounting month being closed)

| # | Check | Measured signal | Blocker condition | Signal source |
|---|---|---|---|---|
| 1 | All timesheets attested | count of period timesheets by attestation state | any timesheet for the period not attested | attested time facts (silver `timesheet` / `time_record`, ADR-0082) |
| 2 | All expenses approved | count of period expense reports by approval state | any expense report for the period not approved | attested expense facts (silver `expense_item` / `expense_report`, ADR-0083) |
| 3 | Time reconciliation matched | recon summary verdict (matched / outstanding / mismatch) | any unresolved time recon mismatch for the period | the ADR-0082 time reconciliation summary (plain prose — not an OKF room; read as signal, never recomputed) |
| 4 | Expense reconciliation matched | recon summary verdict (matched / outstanding / mismatch) | any unresolved expense recon mismatch for the period | the ADR-0083 expense reconciliation summary (plain prose — not an OKF room; read as signal, never recomputed) |
| 5 | Invoices drafted / mirrored | count of period invoices drafted vs the mirrored QBO invoice state | a period item that should be billed has no draft, or a draft diverges from the QBO mirror | app-native invoice drafts + the QBO read-only invoice mirror (silver `invoice`, ADR-0085) |

## Tie-out discipline

- **Show the arithmetic.** For each checked row write: expected, actual, delta,
  and the as-of date. "3 of 14 timesheets unattested as of <date>" is a flag; "time
  looks off" is not.
- **Signal, not inference.** Label what is a measured count versus a derived
  figure. If a row's input is missing or stale, **escalate the gap** — never
  estimate into it. A confident wrong "ready" is worse than an honest "this period
  is not yet reconcilable."
- **Reconciliation rows are signal, not recomputation.** Rows 3 and 4 read the
  already-wired ADR-0082 / ADR-0083 reconciliation summaries as a verdict. Audrey
  surfaces that verdict; she does not re-derive the reconciliation here.
- **Verdict, never disclosure.** Where pay/rate enters reconciliation math, report
  only the result (matched / outstanding / mismatch by amount) — never an
  individual's rate (the salary non-disclosure refusal-class rule, audrey.md).
- **Checklist, not close.** The output is the checklist + blocker flags raised to
  the CFO. The decision to close the period — and any posting, invoice change, or
  QBO push — stays a human (and QBO) call.

## Readiness verdict

- **Ready** — every row's blocker condition is clear (no unmet item), each with its
  tie-out and as-of date.
- **Blocked** — one or more rows hit their blocker condition; list each blocker with
  its signal source and tie-out.
- **Gap** — a row's input is missing or stale; escalate the gap, do not guess. A run
  with any gap is not "Ready".
