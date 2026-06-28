# Stage 02 — health-and-forward

**Job:** read the account's health + posture and set the forward agenda (signal vs inference).

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Period recap | `recap.md` (stage 01 output) | full | what happened this period |
| Account | silver `account` · `okf:account` | the subject | standing relationship state |
| QBR substrate | silver `strategic_business_review` · `okf:strategic_business_review` | latest | the strategic-review context |
| Pack rubric | `./skills/qbr-agenda.md` | all | value-narration + signal-vs-inference rule |

## Process

1. `[sonnet]` Read current health + the security posture summary (arriving from Vera via
   Celeste — advisory, read-only). For every verdict, **label measured signal vs your
   inference** (celeste.md guardrail 3).
2. `[sonnet]` Set the forward agenda: what the next quarter should prioritize — the
   initiatives, refresh/roadmap items, posture uplifts — each framed as a proposal to
   discuss, never as a decided plan.

## Outputs

`forward.md` — the health/posture read (signal vs inference labeled) and the forward
agenda (proposals to discuss).

## Audit

- [ ] Health/posture verdicts label measured signal vs inference
- [ ] Forward agenda items are framed as proposals, not decisions
- [ ] Posture content is advisory (no remediation asserted)
