# Stage 02 — ground

**Job:** assemble the recalled items into one grounded working context for the
current turn — the cited picture Nova reasons over — flagging every gap explicitly
as "no data / no recall."

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Recall record | stage 01 `recall.md` | all | the cited prior turns, deliberate captures, gold summaries + their bronze drill refs |

## Process

1. `[sonnet]` Assemble the working context: place the thread's prior turns, the
   deliberate memory, and the gold summaries in order into one coherent picture for
   the current turn. The gold summary is the reasoning substrate; its bronze drill
   reference travels with it for faithful recall (ADR-0113).
2. `[script]` Carry every item's source reference into the assembled context so the
   current turn can drill to source. No item appears uncited.
3. `[script]` Flag every gap explicitly as "no data / no recall" — a section with no
   recall is named as empty, never filled. No fabrication on empty (CONSTITUTION §8).

## Outputs

`context.md` — the grounded working context for the current turn: the cited prior
turns, deliberate memory, and gold summaries (each with its source + bronze drill
ref), with every gap marked "no data / no recall."

## Audit

- [ ] Every item in the assembled context carries a source reference; none uncited
- [ ] Every gap is marked "no data / no recall"; nothing fabricated on empty (CONSTITUTION §8)
- [ ] Gold summaries retain their bronze drill reference (ADR-0113); no verbatim text inlined as the substrate
- [ ] Read-only — nothing actuated, no memory written
