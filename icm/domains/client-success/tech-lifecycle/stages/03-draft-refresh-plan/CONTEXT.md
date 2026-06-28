# Stage 03 — draft-refresh-plan

**Job:** draft the prioritized refresh plan; spend / refresh-budget parks as a recommendation.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Lifecycle assessment | `lifecycle-assessment.md` (stage 02 output) | full | the at-risk asset list + signals |
| Estate context | `estate-context.md` (stage 01 output) | full | the strategic / renewal context to align the plan to |
| Lifecycle rubric | `./skills/lifecycle-rubric.md` | all | prioritization (client-risk × business value) + advisory framing |

## Process

1. `[sonnet]` Draft the prioritized refresh plan per `lifecycle-rubric.md`: order the
   candidates by **client-risk × business value** (risk first, then value), each with its
   rationale and the signals behind it. Align to the client's own roadmap / standards from
   the strategic record where present.
2. `[sonnet]` Frame every line as a **vCIO recommendation** — the plan, any spend /
   refresh-budget, and any roadmap / SLA / pricing implication park for a human; nothing is
   committed (guardrail 1, dial-proof). Keep security-posture items advisory (MSSP boundary).
   Flag any **non-interest upsell** explicitly — never recommend a refresh purely for
   Imperion's revenue (guardrail 4).
3. `[script]` Where a refresh carries real expansion value (new project / added scope), mark
   it to **mint an opportunity for Chase** (the Chase ↔ Celeste seam) — drafted here, not
   closed here. Set the disposition: the parked refresh plan + any Chase-handoff flags.
   Nothing is committed or sent.

## Outputs

`refresh-plan.md` — the prioritized refresh plan (each item: lifecycle status, signals,
client-risk × business-value rationale), every line tagged as a parked recommendation; spend
/ refresh-budget parked for a human; any non-interest upsell flagged; any expansion item
marked for handoff to Chase. Terminal stage; the run ends parked.

## Audit

- [ ] Every plan item carries its rationale (client-risk × business value) and its signals
- [ ] No binding commitment proposed as executed — the plan + all spend park for a human
- [ ] Security-posture items stay advisory (no remediation proposed as a CS action)
- [ ] Any non-interest upsell is flagged, not buried
- [ ] No client-facing send emitted (this workflow assesses + recommends only)

## Checkpoint

The Teams loop: a human co-shapes and approves the refresh plan before anything leaves.
**`auto` (L2) may self-approve the internal lifecycle assessment + the plan DRAFT ONLY** —
the plan itself, every refresh recommendation, any spend / refresh-budget, and every
client-facing touch parks for a human in every mode (NO-COMMITS-EVER, dial-proof; MSSP /
vCISO work is advisory-only — remediation is human / Datto). A real expansion item is minted
as an opportunity and handed to Chase, who owns the close.
