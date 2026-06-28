# Stage 02 — assess-trajectory

**Job:** assess health/churn-risk and read where the relationship is heading — labeling
measured signal vs inference.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Account context | `context.md` (stage 01 output) | full | the standing account picture |
| Plan rubric | `./skills/success-plan-rubric.md` | all | the signal-vs-inference rule + trajectory reading |

## Process

1. `[sonnet]` Assess current health + churn-risk and the **direction** (improving /
   steady / drifting / at-risk). For every verdict, **label measured signal vs your
   inference** — a trajectory call carries the signals that produced it (celeste.md
   guardrail 3). Never invent health, sentiment, or momentum.
2. `[sonnet]` Identify what is improving, what is drifting, and what is at risk — the raw
   material the plan's goals, initiatives, and risks draw on. Note any renewal in range
   and any margin/cost signal arriving from Audrey (read-only, handoff).

## Outputs

`trajectory.md` — the health verdict + the direction (signal vs inference labeled), the
improving/drifting/at-risk lists, and any renewal-in-range flag.

## Audit

- [ ] Every health/trajectory verdict labels measured signal vs inference
- [ ] Improving / drifting / at-risk lists present (or explicitly "none observed")
- [ ] No fabricated momentum or sentiment
