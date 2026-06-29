# Stage 02 — compose

**Job:** compose one channel-correct, voice-compliant pursuit touch with a
rationale — grounded, consent-clean, no fabricated capability/timeline/price.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Grounding | stage 01 `ground.md` | all | the action being pursued |
| Consent | consent ledger · `okf:consent_event` | this contact's entries | opt-out + frequency-cap gate |
| Voice | `../../../skills/voice-and-tone.md` | all | how we sound (domain-tier skill) |
| Pursuit rules | `./skills/pursuit-rules.md` | all | frequency caps · no false urgency · carve-out definition |

## Process

1. `[script]` Check the consent ledger: an opt-out/suppression OR a tripped
   frequency cap (`pursuit-rules.md`) is a **HARD stop** — park the run with the
   reason, never compose past it.
2. `[haiku]` Select channel (email default; in-channel DM for DM-sourced signals
   inside the messaging window) and classify the touch: transactional-ack
   carve-out vs communicative/committal (`pursuit-rules.md`).
3. `[sonnet]` Draft the touch: advance the action, one CTA, voice-compliant.
   **Never invent pricing, availability, or capability** — pricing intent is a
   handling note, not numbers (chase.md §5). No false urgency (BO-02 §5).
4. `[sonnet]` Write a 2–3 sentence rationale: the angle, the CTA, what was left
   out, and the touch class (carve-out vs committal) for stage 03's gate.

## Outputs

`touch.md` — channel, recipient address/handle, subject (email only), body,
rationale, and the touch class (`transactional-ack` | `communicative-committal`).

## Audit

- [ ] No opt-out/cap breach (a tripped cap parks, never drafts)
- [ ] No fabricated capability, timeline, or pricing/commitment in the body
- [ ] Exactly one CTA; voice checklist passes; no false urgency
- [ ] Touch class stated (drives the stage-03 gate)
