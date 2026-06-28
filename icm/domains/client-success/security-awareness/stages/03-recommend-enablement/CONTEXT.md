# Stage 03 — recommend-enablement

**Job:** park the recommended security-awareness/enablement plan; any client-facing delivery is human-gated.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Needs | `needs.md` (stage 02 output) | full | the assessed awareness/enablement needs |
| Rubric | `./skills/awareness-rubric.md` | all | gap → enablement mapping + advisory-boundary discipline |

## Process

1. `[sonnet]` Draft the recommended awareness/enablement plan as **parked** proposals per
   `awareness-rubric.md`: the training topics, a phishing-sim cadence, and the policy
   reminders, each mapped to the client's gap and labeling measured signal vs inference. Flag
   any non-interest upsell explicitly — never recommend paid enablement purely for Imperion's
   revenue (guardrail 4).
2. `[script]` Mark the disposition: the parked recommendation list, each item tagged for human
   review and human-led delivery. Nothing is committed, configured, or sent here — Imperion
   advises; humans and Datto remediate (MSSP / vCISO advisory boundary, guardrail 2).

## Outputs

`recommendation.md` — the parked awareness/enablement plan (training topics + phishing-sim
cadence + policy reminders), signal-vs-inference labeled, each item tagged "Celeste recommend
→ human deliver". Terminal stage; the run ends parked.

## Audit

- [ ] Every recommendation labels measured signal vs inference
- [ ] Nothing proposed as executed, configured, or delivered (all recommendations park)
- [ ] Any non-interest upsell is flagged, not buried
- [ ] No client-facing delivery emitted (this workflow recommends only; humans/Datto deliver)

## Checkpoint

The Teams loop: a human co-shapes and approves the awareness/enablement plan before anything
reaches the client. **`auto` (L2) may self-approve the internal needs assessment ONLY** —
every recommendation and every client-facing delivery (training rollout, phishing-sim, policy
notice) parks for a human in every mode (NO-COMMITS-EVER, dial-proof; MSSP / vCISO work is
advisory-only — delivery and remediation are human / Datto).
