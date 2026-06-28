# Stage 02 — assess-report

**Job:** assess and structure the client posture report (signal vs inference; recommendations only).

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Posture handoff | `handoff.md` (stage 01 output) | full | Vera's findings + resolved client + relationship context |
| Reporting rubric | `./skills/posture-reporting-rubric.md` | all | report structure, signal-vs-inference, the MSSP advisory boundary |
| QBR substrate | silver `strategic_business_review` · `okf:strategic_business_review` | latest for this account | frame recommendations against the standing strategic picture |

## Process

1. `[sonnet]` Structure the report per `posture-reporting-rubric.md`. For every statement,
   **label Vera's measured posture finding vs your relationship-framed inference** — a risk
   statement carries the Vera finding that produced it (celeste.md guardrail 3). Never invent a
   finding Vera did not measure; never re-score her measurement.
2. `[sonnet]` Translate the findings into the client's business language and draft
   **recommendations only** (visibility · posture · risk · recommendation). Any item whose
   substance is *fixing something* is tagged as a **human / Datto remediation hand-off**, never
   a Celeste action — remediation is out of scope (MSSP advisory boundary). Flag any
   non-interest upsell explicitly; never inflate risk to drive spend (guardrail 4).
3. `[script]` Assemble the structured report: relationship framing, posture summary (measured),
   risk (inference, tied to findings), recommendations (advisory, each routed to a human).
   Nothing is committed or sent here.

## Outputs

`report-draft.md` — the structured client posture report: relationship framing, posture summary
(measured findings, cited as Vera's), risk in plain terms (inference, each tied to its finding),
and advisory recommendations (each routed to a human; remediation items tagged human / Datto).

## Audit

- [ ] Every statement labels Vera's measured finding vs Celeste's inference
- [ ] No posture finding invented and no Vera measurement re-scored
- [ ] Recommendations only — no remediation action and no remediation commitment proposed
- [ ] Any non-interest upsell is flagged, not buried
- [ ] No client-facing send emitted (this stage structures only)
