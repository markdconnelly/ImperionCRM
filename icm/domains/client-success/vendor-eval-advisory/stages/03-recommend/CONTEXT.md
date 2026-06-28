# Stage 03 — recommend

**Job:** park the recommendation and hand the procurement seam to Vance.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Evaluation | `evaluation.md` (stage 02 output) | full | the options / tradeoffs / fit to recommend from |
| Evaluation rubric | `./skills/evaluation-rubric.md` | all | recommendation discipline (client-interest, non-interest-upsell, the Vance seam) |

## Process

1. `[sonnet]` Draft the recommendation: the recommended direction with its rationale and
   the runner-up, framed **in the client's interest, not Imperion's revenue**. Flag any
   **non-interest upsell** explicitly — never steer to a pricier option to grow revenue
   (guardrail 4). Label measured signal vs your inference behind the call.
2. `[script]` Mark the disposition: a **parked recommendation** plus the seam → **Vance**
   (#1398) for the actual procurement. Note that **the buy is human-gated money**
   (CONSTITUTION §5.4) — Celeste advises, Vance sources/buys, a human approves the spend.
   Nothing is committed, sourced, or sent here.

## Outputs

`recommendation.md` — the parked recommendation (recommended direction + runner-up +
rationale, signal vs inference labeled), any non-interest-upsell flag, and the Vance
procurement seam (with the human-gated-money note). Terminal stage; the run ends parked.

## Audit

- [ ] The recommendation labels measured signal vs inference
- [ ] No commitment proposed as executed (advisory only — the recommendation parks)
- [ ] Procurement is handed to Vance, not performed here; the buy is noted as human-gated money
- [ ] Any non-interest upsell is flagged, not buried
- [ ] No client-facing send emitted (this workflow evaluates + recommends only)

## Checkpoint

The Teams loop: a human co-shapes and approves the advisory before it leaves. **`auto`
(L2) may self-approve the internal evaluation + parked recommendation ONLY** — every
recommendation, binding commitment (spend / a procurement direction), and client-facing
touch parks for a human in every mode (NO-COMMITS-EVER, dial-proof; MSSP work is
advisory-only — remediation is human/Datto). Procurement is not Celeste's seam: it hands
to Vance, who sources/buys under human-gated money.
