# Stage 03 — escalate-mismatch

**Job:** escalate the recon mismatches to the CFO as an internal, reversible flag.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Recon table | `recon.md` (stage 02 output) | full | the classified lines to escalate from |
| Recon rubric | `./skills/recon-rubric.md` | all | the tie-out + salary-non-disclosure discipline |

## Process

1. `[sonnet]` Select the **mismatch** lines (and any **outstanding** lines past the cycle)
   from the recon table. For each, carry its tie-out arithmetic (inputs · expected · actual ·
   delta · as-of date), labeled measured vs derived.
2. `[script]` Assemble the internal recon-mismatch flag for the CFO. Report each item **by
   amount** only — the Pay Rate / individual salary figure is **never** included (refusal-class).
   A data gap is escalated as a gap, not estimated. The flag is internal and **reversible** (it
   can be dismissed). Nothing is posted, pushed to QBO, or moved — QBO is the system of record
   (ADR-0123).

## Outputs

`escalation.md` — the internal recon-mismatch flag for the CFO: the mismatch (and past-cycle
outstanding) lines with their arithmetic + as-of dates, results by amount only, plus any
escalated data gap. Terminal stage; ends parked for the CFO loop.

## Audit

- [ ] Only mismatch / past-cycle-outstanding lines escalated; matched lines not flagged
- [ ] Every escalated line shows its arithmetic + as-of date (measured vs derived labeled)
- [ ] No individual Pay Rate / salary figure disclosed (results by amount only)
- [ ] Data gaps escalated, not estimated
- [ ] Flag is internal + reversible; no posting, QBO push, or money move emitted

## Checkpoint

The CFO loop: the CFO reviews the recon-mismatch flag and decides any correction; the
pay/reimbursement and any money movement are a human + QBO (ADR-0123). **`auto` (L2) may
self-approve raising the internal recon-mismatch flag to the CFO ONLY** — there is no
posting, QBO push, or money move in Audrey's catalog at any rung (read-only ceiling,
audrey.md).
