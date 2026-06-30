# Stage 01 — scan

**Job:** sweep the finance silver for candidate anomalies across the rubric's anomaly classes,
into one as-of-dated candidate record. Scan only; no confirmed flag, no escalation, no action.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| As-of scope | the triggering run | the scan window + as-of date | the subject |
| Attested time | silver `time_record` / `timesheet` · `okf:time_record` `okf:timesheet` | window rows | cost-spike + reconciliation-drift signals |
| Approved expense | silver `expense_item` / `expense_report` · `okf:expense_item` `okf:expense_report` | window rows | cost-spike + duplicate / aberrant-entry signals |
| Invoice record | silver `invoice` (QBO read-only mirror) · `okf:invoice` | window rows | margin + duplicate + reconciliation-drift signals |
| Invoice drafts | silver `generated_invoice` · `okf:generated_invoice` | window rows | duplicate + reconciliation-drift (draft vs mirror) signals |
| Rubric | `./skills/anomaly-rubric.md` | all | the anomaly classes + detection signals |

## Process

1. `[script]` Fix the **scan window** and the **as-of date** for the run; stamp every
   subsequent figure with that as-of date.
2. `[script]` Sweep each anomaly class per the rubric: read the margin inputs (invoice revenue
   vs attested cost), the cost run-rates (`time_record` / `expense_item`), the
   duplicate / aberrant-entry candidates (matched amount / vendor / period, out-of-range
   values), and the reconciliation-drift candidates (`generated_invoice` vs `invoice` mirror;
   attestation tie-outs). Write no silver row (read-only).
3. `[haiku]` For each candidate, capture the **measured** detection signal and its baseline /
   expected in plain prose. Candidates only — no confirmed flag yet.
4. `[script]` Mark each captured figure **measured** or **derived**, and flag any source that is
   missing or stale as a **gap** — never fill a gap with an estimate (a class that could not be
   swept is a noted gap, not a "clean").

## Outputs

`candidates.md` — for the scan window and its as-of date: the candidate anomalies by class,
each with its measured detection signal and baseline / expected, every figure labelled
measured/derived, and any source gaps called out. No confirmed flag or escalation yet — that is
stage 02.

## Audit

- [ ] Scan window and a single as-of date are stated
- [ ] Each anomaly class swept (or its source recorded as a gap, not guessed)
- [ ] Each captured figure labelled measured or derived; no figure estimated into a gap
- [ ] No silver row written; no entry posted, deleted, or corrected (read-only)
