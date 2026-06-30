# Stage 02 — extract

**Job:** extract the call OUTCOME and the proposed NEXT-STEP from the
conversational-intelligence analysis — traced to the interaction, no fabricated
outcome or next-step.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Grounding | stage 01 `ground.md` | all | interaction id + opportunity id + as-of being worked |
| Interaction | the conv-intel-landed `interaction` · `okf:interaction` | this call only | the summary + outcome to extract from |
| Capture rules | `./skills/capture-rules.md` | all | what counts as a next-step · phrasing · trace requirement |
| Voice | `../../../skills/voice-and-tone.md` | all | how the parked proposal reads (domain-tier skill) |

## Process

1. `[script]` Confirm `ground.md` is `live`; a `stale-not-live` grounding is a
   **HARD stop** — park, never extract from an absent interaction (A5c).
2. `[haiku]` Read the conv-intel summary + outcome off the `interaction` and lift
   the **call OUTCOME** (what happened on the call), citing the interaction + as-of
   (A5). Ground only on this call's interaction and this opportunity —
   **pool-never-bleed** (A7); no other deal, tenant, or prior run leaks in.
3. `[sonnet]` Derive the **proposed NEXT-STEP**: one concrete, internal, reversible
   advance action per `./skills/capture-rules.md` — singular, plainly phrased,
   voice-compliant. **It must trace to the conv-intel record** — no invented
   outcome, no invented next-step (A5). No fabricated capability/timeline/price
   (chase.md §5); no false urgency (BO-02 §5).

## Outputs

`extract.md` — the call outcome (with cited interaction + as-of), the single
proposed next-step (internal/reversible, plainly phrased), and a short rationale
naming the basis in the interaction. Nothing asserted without a source.

## Audit

- [ ] Outcome and next-step each trace to the conv-intel interaction + as-of (A5); none fabricated
- [ ] Exactly one next-step, internal/reversible, phrased per capture-rules
- [ ] Pool isolation held — only this call's interaction + this opportunity grounded (A7)
- [ ] No fabricated capability/timeline/price; no false urgency
