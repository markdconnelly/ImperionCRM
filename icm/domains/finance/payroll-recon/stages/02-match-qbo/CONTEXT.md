# Stage 02 — match-qbo

**Job:** match the expected pay + reimbursement against the QBO purchases bronze and classify
each line matched / outstanding / mismatch.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Expected pay/reimbursement | `expected.md` (stage 01 output) | full | the expected figures to tie out |
| QBO purchases (bronze) | QBO purchases bronze — raw source, held as matched context (NOT a curated room) | the cycle | the actual amounts to tie out against |
| Recon rubric | `./skills/recon-rubric.md` | all | matched/outstanding/mismatch classification + tie-out discipline |

> The QBO purchases are **bronze** (raw source), matched in as context only — they are not a
> curated OKF room and carry no grounding marker. Audrey reads them as the actual side of the
> tie-out; she never posts to or pushes QBO (ADR-0123).

## Process

1. `[sonnet]` Tie out each expected pay + reimbursement line against the QBO purchases bronze
   per `recon-rubric.md`. For every line **show the arithmetic** (inputs · expected · actual ·
   delta · as-of date) and **label measured figure vs derived** (expected is derived; the QBO
   purchase amount is measured).
2. `[sonnet]` Classify each line **matched** (ties out within tolerance), **outstanding**
   (expected, not yet seen in the QBO purchases bronze), or **mismatch** (amounts disagree
   beyond tolerance). Sub-threshold variance within tolerance is noise — don't flag it.
3. `[script]` Assemble the classified recon table. Do not estimate into a data gap — note it
   for escalation. Report results **by amount** only; the Pay Rate / salary figure is **never**
   emitted (refusal-class). Nothing is posted or pushed.

## Outputs

`recon.md` — the per-line recon table (each line: expected · actual · delta · as-of, class =
matched / outstanding / mismatch), and any data gap noted for escalation. Results by amount
only — no per-person Pay Rate.

## Audit

- [ ] Every line shows its arithmetic + as-of date (measured vs derived labeled)
- [ ] Each line classified matched / outstanding / mismatch
- [ ] No individual Pay Rate / salary figure disclosed (results by amount only)
- [ ] Data gaps noted for escalation, not estimated
- [ ] No posting, QBO push, or money move emitted
