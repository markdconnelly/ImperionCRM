# Stage 03 — draft-plan

**Job:** assemble the Account Success Plan and park every commitment for a human.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Account context | `context.md` (stage 01 output) | full | the standing picture |
| Trajectory | `trajectory.md` (stage 02 output) | full | health/direction + risk lists |
| Plan rubric | `./skills/success-plan-rubric.md` | all | plan structure + goal/initiative quality |

## Process

1. `[sonnet]` Assemble the five plan sections per `success-plan-rubric.md`: relationship
   goals (client outcomes, not Imperion revenue), health & trajectory, strategic
   initiatives (prioritized, each serving a goal), open risks (each with its signal + a
   parked mitigation), and next actions (owner · due).
2. `[sonnet]` For every binding commitment in the plan — roadmap, SLA, pricing, spend,
   security-remediation — write it as a **parked recommendation to a human**, never as
   decided. Flag any **non-interest upsell** explicitly (guardrail 4). Where expansion
   value is real, mint the opportunity for Chase (the Chase ↔ Celeste seam) rather than
   close it here.
3. `[script]` Mark the disposition: the plan + the parked recommendation/commitment list,
   each tagged with its owner (Celeste draft → human approve, or → Chase for an expansion
   close). Nothing is committed or sent here.

## Outputs

`plan.md` — the Account Success Plan (the five sections) + the parked recommendation list.
Terminal stage; the run ends parked.

## Audit

- [ ] All five plan sections present (goals · health/trajectory · initiatives · risks · next actions)
- [ ] Every binding commitment (roadmap/SLA/pricing/spend/remediation) is parked, not decided
- [ ] Any non-interest upsell is flagged, not buried
- [ ] No client-facing send emitted (this workflow plans + recommends only)

## Checkpoint

The Teams loop: a human co-shapes and approves the plan before it is treated as agreed.
**`auto` (L2) may self-approve the internal plan assembly + trajectory compute ONLY** —
every recommendation, binding commitment, and client-facing touch parks for a human in
every mode (NO-COMMITS-EVER, dial-proof; MSSP work is advisory-only — remediation is
human/Datto).
