# Stage 02 — flag-deviations

**Job:** tie out the figures and flag the hard deviations for the approver.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Attested facts | `attested.md` (stage 01 output) | full | the figures to tie out |
| Deviation rubric | `./skills/deviation-rubric.md` | all | hard-deviation rubric + tie-out discipline |

## Process

1. `[sonnet]` Tie out the attested time + expense per `deviation-rubric.md`. For every
   flag, **show the arithmetic** (inputs · expected · actual · delta · as-of) and **label
   measured figure vs derived**. Sub-threshold variance within tolerance is noise — don't
   flag it.
2. `[script]` Assemble the deviation flag + the reconciliation memory-jogger for the
   approver. Do not estimate into a data gap — escalate the gap. Salary / Pay Rate, if used
   in any tie-out, is **never** emitted as a figure (refusal-class). Nothing is approved,
   posted, or pushed.

## Outputs

`flags.md` — the hard-deviation flags (each with its arithmetic + as-of), the reconciliation
memory-jogger, and any escalated data gap. Terminal stage; ends parked for the approver.

## Audit

- [ ] Every flag shows its arithmetic + as-of date (measured vs derived labeled)
- [ ] No individual Pay Rate / salary figure disclosed
- [ ] Data gaps escalated, not estimated
- [ ] No approval, posting, or QBO push emitted

## Checkpoint

The CFO/approver loop: a human reviews the flags and approves/rejects the attestation; any
money movement is QBO (ADR-0123). **`auto` (L2) may self-approve raising the internal
deviation flag + memory-jogger ONLY** — there is no approval, posting, or money move in
Audrey's catalog at any rung (read-only ceiling, audrey.md).
