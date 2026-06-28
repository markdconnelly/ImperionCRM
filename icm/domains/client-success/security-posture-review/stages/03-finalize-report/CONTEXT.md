# Stage 03 — finalize-report

**Job:** finalize the client-facing posture report as a parked artifact (any send is always-gated).

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Report draft | `report-draft.md` (stage 02 output) | full | the structured posture report |
| Reporting rubric | `./skills/posture-reporting-rubric.md` | all | final structure + the MSSP advisory boundary + the no-commitments rule |

## Process

1. `[sonnet]` Finalize the client-facing report in Celeste's relationship voice — clear,
   consultative, business-framed. Confirm every posture statement labels Vera's measured
   finding vs Celeste's inference, and that the report makes **no** binding commitment
   (roadmap · SLA · pricing · spend · security-remediation commitment).
2. `[script]` Mark the disposition: the finalized report parks as the run product. Route any
   remediation item to a **human / Datto** hand-off (never a Celeste action). The client-facing
   delivery is **always-gated** (ADR-0058) — it parks for human approval and is never sent here.

## Outputs

`report.md` — the finalized, **parked** client-facing posture report, plus the parked
disposition: client-facing delivery awaits human approval (ADR-0058), and any remediation item
is tagged as a human / Datto hand-off. Terminal stage; the run ends parked.

## Audit

- [ ] Every posture statement labels Vera's measured finding vs Celeste's inference
- [ ] No binding commitment in the report (all recommendations are advisory)
- [ ] Remediation items routed to human / Datto, never proposed as a Celeste action
- [ ] No client-facing send emitted — the report parks for human approval (ADR-0058)

## Checkpoint

The Teams loop: a human co-shapes and approves the report before any client-facing delivery.
**`auto` (L2) may self-approve the internal report assembly ONLY** — every client-facing send
parks for a human in every mode (ADR-0058), and remediation routes to human / Datto. The
NO-COMMITS-EVER and MSSP-advisory-only ceilings are dial-proof.
