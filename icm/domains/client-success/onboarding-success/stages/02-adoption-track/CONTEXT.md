# Stage 02 — adoption-track

**Job:** track adoption + first-value against the milestone plan from measured signals,
and surface early-warning churn-risk for routing to 08-D. (💤 dormant until the substrate
hydrates — #991 + #1369/#1370, ADR-0123.)

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Milestone plan | `onboarding-plan.md` (stage 01 output) | full | the 30/60/90 plan + per-milestone success criteria to measure against |
| Engagement + service | silver `interaction` / `ticket` · `okf:interaction` `okf:ticket` | recent history for this account | adoption (usage/engagement) + early-friction (ticket cluster) signals |
| Strategic record | silver `strategic_business_review` · `okf:strategic_business_review` | this account | the strategic context of the relationship's value read |
| Adoption rubric | `./skills/adoption-rubric.md` | all | milestone read + first-value definition + early-warning dispositions |

## Process

1. `[script]` Pull this client's recent `interaction` + `ticket` and the
   `strategic_business_review` record. Stay within THIS client (strict confidential
   boundary — never read across clients).
2. `[sonnet]` Compare the measured signals to the milestone plan's success criteria: are
   the 30/60/90 adoption + first-value milestones being met? For every verdict, **label
   measured signal vs your inference** — an adoption verdict carries the signals that
   produced it (celeste.md guardrail 3). Never invent adoption or value; a gap is a gap.
3. `[sonnet]` Apply the early-warning disposition per the rubric. Low/no adoption,
   silence, or early friction → flag a **churn-risk signal for routing to
   [08-D health-intervention](../../health-intervention/CONTEXT.md)** (08-D owns the
   intervene-vs-watch decision and the save — this stage routes, it does not run the save).
4. `[script]` Set the disposition seed: on-track / early-warning (→ 08-D) / acute, each
   carrying its evidencing signals.

## Outputs

`adoption-status.md` — the per-milestone adoption + first-value read (measured signal vs
inference labeled), the disposition (on-track / early-warning / acute) with its signals,
and any churn-risk routing note for 08-D. Read-only; no outreach.

## Audit

- [ ] Only this client's data was read (no cross-client leakage)
- [ ] Each milestone read labels measured signal vs inference
- [ ] Any early-warning / churn-risk flag carries the signals that produced it (no unsourced flag)
- [ ] Early-warning is routed to 08-D, not actioned here (no save outreach in this stage)
- [ ] No outreach drafted or sent here (read + compute only)
