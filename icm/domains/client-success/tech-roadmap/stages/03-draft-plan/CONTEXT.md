# Stage 03 — draft-plan

**Job:** draft the roadmap as a PARKED recommendation — current/target framing, the
sequenced initiatives, and the strategic narrative — committing nothing.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Strategic context | `strategic-context.md` (stage 01 output) | full | current vs target state |
| Roadmap shape | `roadmap-shape.md` (stage 02 output) | full | the sequenced initiatives + rationale |
| Roadmap rubric | `./skills/roadmap-rubric.md` | all | roadmap structure + no-commits framing |

## Process

1. `[sonnet]` Write the roadmap: the current/target framing, the sequenced initiatives,
   and the **strategic narrative** that ties them together (business-framed, in the
   client's interest). Carry forward the signal-vs-inference labels from stage 02.
2. `[sonnet]` Make **no commitment**: the roadmap, every **refresh spend**, and every
   **SLA target** are recommendations to a human, not binding here (guardrail 1,
   dial-proof). Security stays advisory only (guardrail 2). Where the roadmap surfaces
   real expansion value, draft it as an opportunity to hand to **Chase** (the Chase ↔
   Celeste seam) — note the seam; do not close the transaction.
3. `[script]` Mark the disposition: the roadmap draft + its parked-recommendation status.
   Nothing is committed or sent here.

## Outputs

`roadmap.md` — the drafted technology roadmap (current/target, sequenced initiatives with
signal-vs-inference labels, strategic narrative), every recommendation tagged parked
(Celeste draft → human approve; any expansion → Chase). Terminal stage; the run ends
parked.

## Audit

- [ ] No binding commitment proposed as executed — the roadmap, refresh spend, and SLA
      targets all park as recommendations
- [ ] Every roadmap item labels measured signal vs inference
- [ ] Any non-interest upsell is flagged, not buried
- [ ] No client-facing send emitted (this workflow drafts + recommends only)

## Checkpoint

The Teams loop: a human co-shapes and approves the roadmap before it leaves. This is L1
propose-only — **`auto` self-approves nothing**; the entire roadmap parks for a human in
every mode (NO-COMMITS-EVER, dial-proof; MSSP work is advisory-only — remediation is
human / Datto).
