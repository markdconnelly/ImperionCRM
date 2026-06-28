# Stage 01 — gather-close-state

**Job:** read the period's close-relevant facts — attested time, approved
expense, reconciliation summaries, and invoice state — into one as-of-dated
close-state record. Gather only; no checklist, no flag, no action.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Period scope | the triggering run (the accounting month being closed) | the period bounds + as-of date | the subject |
| Attested time | silver `timesheet` / `time_record` · `okf:timesheet` `okf:time_record` | period rows, by attestation state | check 1 — all timesheets attested |
| Approved expense | silver `expense_item` / `expense_report` · `okf:expense_item` `okf:expense_report` | period rows, by approval state | check 2 — all expenses approved |
| Invoice state | silver `invoice` (QBO read-only mirror) + app-native drafts · `okf:invoice` | period invoices: drafted vs mirrored | check 5 — invoices drafted / mirrored |
| Time recon summary | the ADR-0082 time reconciliation summary (plain prose — NOT an OKF room; read as a verdict, never recomputed) | this period's verdict (matched / outstanding / mismatch) | check 3 — time recon matched |
| Expense recon summary | the ADR-0083 expense reconciliation summary (plain prose — NOT an OKF room; read as a verdict, never recomputed) | this period's verdict (matched / outstanding / mismatch) | check 4 — expense recon matched |
| Rubric | `../../skills/close-checklist-rubric.md` | all | what each fact feeds |

## Process

1. `[script]` Fix the period bounds and the read as-of date; stamp every
   subsequent figure with that as-of date.
2. `[script]` Read attested time: count period timesheets by attestation state
   (attested vs not). Record counts; do not write any silver row (read-only).
3. `[script]` Read approved expense: count period expense reports by approval
   state (approved vs not). Record counts.
4. `[script]` Read invoice state: count period invoices drafted vs the QBO
   mirror state; note any draft that diverges from the mirror.
5. `[haiku]` Read the time + expense reconciliation summaries (ADR-0082 /
   ADR-0083) and capture each period verdict — matched / outstanding / mismatch —
   in **plain prose**. These are read as signal; never recompute the
   reconciliation here.
6. `[script]` Mark each captured figure **measured** (a direct count) or
   **derived**, and flag any input that is missing or stale as a **gap** — never
   fill a gap with an estimate.

## Outputs

`close-state.md` — for the period and its as-of date: time-attestation counts,
expense-approval counts, invoice drafted-vs-mirror counts, the two reconciliation
verdicts (plain prose), and every figure labelled measured/derived with any gaps
called out. No checklist or blocker verdict yet — that is stage 02.

## Audit

- [ ] Period bounds and a single read as-of date are stated
- [ ] Time, expense, invoice counts present; each figure labelled measured or derived
- [ ] Both reconciliation verdicts captured in plain prose (no recomputation)
- [ ] Any missing/stale input recorded as a gap (never estimated)
- [ ] No silver row written and no money action taken (read-only)
