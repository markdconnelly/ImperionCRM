# Stage 03 — evaluate-route

**Job:** evaluate the new `lead_score` against the MQL threshold and route — crossed →
to Chase as the explicit A11 seam; below → stays in nurture.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Score | stage 02 output | all | the recomputed score to evaluate |
| Score record | `` `okf:lead_score` `` | this lead | the MQL threshold (governed config) + the score's standing |

## Process

1. `[script]` Compare the recomputed `lead_score` to the **marketing-qualified (MQL)
   threshold** (governed config — not the agent's to set). A single deterministic
   comparison.
2. `[script]` **Crossed → route the lead to Chase / Stream 02 (lead-response).** This
   is the **terminal hand-off STEP — the canonical Belle→Chase seam (A11)**: a
   **deterministic governed event**, not an actuation and not a self-approval. Belle
   owns the marketing-qualification clock; Chase owns qualify/close. Do not duplicate
   Chase's work — reference Stream 02 as the terminal step.
3. `[script]` **Below threshold → no route; the lead stays in Belle's nurture.** Stamp
   the evaluation outcome on the score record and close the run.

## Outputs

`route.md` — the threshold comparison, the routing decision (MQL → Chase/Stream 02, or
below → nurture), and the closed-run outcome stamp.

## Audit

- [ ] Score compared to the governed MQL threshold (threshold not altered here)
- [ ] Crossed → routed to Chase/Stream 02 as the explicit seam step (deterministic, not a send)
- [ ] Below → retained in nurture; no route emitted
- [ ] Outcome stamped on the score record; run closed
- [ ] No Chase qualify/close work duplicated here
