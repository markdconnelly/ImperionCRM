# Stage 02 — flag-handoff

**Job:** raise the cost-variance flag and hand it to Audrey for reconciliation/true-up.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Computed variances | `variance.md` (stage 01 output) | full | the cited variances to flag and hand off |
| Variance rubric | `./skills/variance-rubric.md` | thresholds + the Audrey handoff shape | which variances flag, how the handoff is packaged |

## Process

1. `[automation]` Flag every variance that crosses a rubric threshold, urgency computed
   from size and direction (A6 — a large adverse variance on a client-billed vendor
   outranks a small favorable one); sub-threshold variances are logged, not flagged.
   Every flag carries its cost citations + as-of unchanged (A5).
2. `[automation]` **SEAM → hand to Audrey** in the rubric's handoff shape (per flag: the
   variance, the actual citation, the expected derivation, the candidate explanation
   class, the term boundary if one is near). This is the A11 obligation/action
   separation made concrete: **Vance MEASURES, Audrey owns the money clock** —
   reconciliation, true-up, credit pursuit, and every money act live in Audrey's stream
   (→ Stream 09), gated there. Any procurement-side remediation (a true-up buy, a term
   change) is noted for the **governed-procurement money gate (02-B2)**, never actuated
   here (`always_gate`, 0184).

## Outputs

`handoff.md` — the flags raised (variance + citations + urgency per flag), the Audrey
handoff package emitted (per the rubric shape), items noted for 02-B2 (procurement-side
remediation candidates, not staged as commitments), and the carried-forward gaps.
Terminal stage; ends at the Audrey seam.

## Audit

- [ ] Every flag carries its cost source citations + as-of dates (A5); thresholds per the rubric
- [ ] Handoff to Audrey in the rubric shape — measurement handed over, no money act taken (A11)
- [ ] Procurement-side remediation only NOTED for 02-B2 — nothing staged as a commitment, nothing actuated
- [ ] Read-only money throughout — no reconciliation, credit, dispute, true-up, term change, or external message emitted

## Checkpoint

The Audrey-seam loop: the variance flag lands with **Audrey**, whose stream owns
reconciliation/true-up and every money commitment (gated on her side, Stream 09; A11 —
Vance measures, Audrey owns the money clock). **`auto` (L2) may self-approve raising the
flag and emitting the Audrey handoff ONLY** (internal, reversible); no money act runs in
this workflow at any rung, and procurement-side remediation waits for a human at the
02-B2 money gate (`always_gate`, ADR-0109 / migration 0184; BO-03 Procurement §5).
