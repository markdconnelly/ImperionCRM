# Stage 02 — draft-remediation-plan

**Job:** for each failing criterion, draft the get-back-in-shape step — gap → target →
recommended action — ordered severity-first.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Gap | `gap.md` (stage 01) | the failing criteria + bars + golden targets + evidence, and the data-gap list | the material to plan against |
| Plan rules | `./skills/remediation-planning.md` | the step shape + severity ordering + advisory-only boundary | how to build each step |
| Conformance rubric | the shared `conformance-engine/skills/conformance-rubric.md` | signal-vs-inference + audit-by-reference | how to state each step |

## Process

1. `[sonnet]` Per failing criterion, draft the step: the **measured gap** (the criterion bar
   vs the snapshot evidence, by reference), the **target** from `posture_policy`, and a
   **recommended action** that would close it — **labeled inference** where the action is a
   judgment (there is usually more than one path; recommend, do not dictate). Never estimate
   an action into a data gap.
2. `[script]` Order the steps **severity-first** per `remediation-planning.md`: critical-
   designated / band-to-critical failures first, then remaining drifting failures worst-gap
   first, then the not-assessable data gaps listed last as gaps-to-close (distinct from
   remediation steps).
3. `[sonnet]` State the band being closed and, **labeled inference**, what a fully-actioned
   plan would move the client to — noting the authoritative confirmation is a future
   `posture_snapshot` + B2 re-score, never this plan's assertion.

## Outputs

`plan.md` — the severity-ordered remediation steps (each: gap + target + recommended action,
by reference, measured-vs-inferred labeled), the data-gaps-to-close list, and the band being
closed with its labeled-inference target outcome. No posture values reproduced; nothing
actuated.

## Audit

- [ ] One step per failing criterion; not-assessable handled as data gaps, not fabricated steps
- [ ] Steps ordered severity-first; actions labeled inference where they are judgments
- [ ] Gap/target/action cited by reference; no posture values; nothing estimated into a gap
