# Stage 02 — next-step

**Job:** execute the next due cadence step for the enrolled contact — an A/B send, a
wait, a branch, or a score-bump — as a reversible internal step record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Enrollment | stage 01 output | the contact's journey instance | current position in the cadence |
| Journey definition | `` `okf:workflow` `` | the target journey | the step graph + cadence timing (ADR-0073) |
| Brand voice | `../../skills/brand-voice.md` | all | how a send sounds (domain-tier skill) |
| Current score | `` `okf:lead_score` `` | this contact | a branch/score-bump reads the score |

## Process

1. `[script]` Resolve the **next due step** from the journey definition against the
   enrollment position + cadence clock (wait timers / branch conditions are date and
   field math, not interpretation).
2. `[script]` For a **wait / branch / score-bump**: apply it as a reversible internal
   step record (L2) — set the next-due time, take the branch, or bump the score. No
   external party is touched.
3. `[sonnet]` For a **send** step: draft the on-brand message (and its A/B variant if
   the step defines one) — no fabricated claim, stat, or timeline. **Do not send
   here** — hand the drafted send to stage 03 (the consent gate).

## Outputs

`next-step.md` — the resolved step type, the applied internal change (wait / branch /
score delta) **or** the drafted send + variant awaiting the gate, and the updated
enrollment position.

## Audit

- [ ] Next step resolved deterministically from the definition + cadence clock
- [ ] Internal step (wait / branch / score-bump) applied as a reversible L2 record
- [ ] A send step is **drafted only** — not dispatched here (the gate owns the send)
- [ ] Drafted send is on-brand; every claim sourced or cut (no fabrication)
