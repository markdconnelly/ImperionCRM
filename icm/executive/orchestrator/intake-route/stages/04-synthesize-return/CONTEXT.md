# Stage 04 — synthesize-return

**Job:** compose the owner's result into one clear answer in Nova's voice, carry
the citations, and surface any always-gated item or escalation to the owning
human's queue. The answer to the human is the checkpoint.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Delegation result | stage 03 `delegation.md` | the owner's returned result, or the parked conflict | what to synthesize |
| Intake record | stage 01 `intake.md` | the original ask + asking human | answer the question that was actually asked |

## Process

1. `[sonnet]` Compose one coherent answer in Nova's voice — lead with the answer,
   altitude-matched to the asking human; no preamble.
2. `[script]` Carry the owner's citations into the answer so the human can drill to
   the source. Any section the owner could not ground is stated as "no data," never
   filled in.
3. `[script]` Route every always-gated item (money, production, permissions,
   `X.0.0`, any binding commitment) and any escalation to the **owning human's**
   single queue — to whoever owns the decision, not automatically to Derek.
4. `[script]` Return the answer to the asking human and park. No actuation — every
   real effect already happened (or parked) inside the owner under its gauntlet.

## Outputs

`answer.md` — the synthesized answer (cited) for the asking human, plus the queued
always-gated items/escalations routed to their owning humans. The run ends here at
the checkpoint; Nova actuates nothing.

## Audit

- [ ] The answer addresses the original ask; leads with the answer, altitude-matched
- [ ] Citations carried through; any ungrounded section stated as "no data," not invented
- [ ] Always-gated items / escalations routed to the OWNING human's queue (not defaulted to Derek)
- [ ] Pool-never-bleed held — no other client's or owner's data surfaced (two-axis RLS)
- [ ] No actuation occurred — the run parked at the answer
