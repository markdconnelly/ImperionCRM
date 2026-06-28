# Stage 03 — assess-flag

**Job:** assess health/churn-risk (signal vs inference) and park the recommended next steps.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Client-360 | `client-360.md` (stage 02 output) | full | the aggregated picture |
| Health rubric | `./skills/health-signals.md` | all | signal-vs-inference rubric + churn indicators |

## Process

1. `[sonnet]` Assess account health + churn-risk per `health-signals.md`. For every verdict,
   **label measured signal vs your inference** — a churn flag carries the signals that
   produced it (celeste.md guardrail 3). Never invent health or sentiment.
2. `[sonnet]` Draft the recommended next steps as **parked** proposals: a save outreach, a
   QBR, an expansion opportunity to hand to Chase, or an advisory. Flag any **non-interest
   upsell** explicitly — never recommend spend purely for Imperion's revenue (guardrail 4).
3. `[script]` Mark the disposition: at-risk flag (with its signals) + the parked recommendation
   list. Nothing is committed or sent here.

## Outputs

`assessment.md` — the health/churn verdict (signal vs inference labeled), the at-risk flag,
and the parked recommendations (each tagged with its owner: Celeste draft → human approve,
or → Chase for an expansion close). Terminal stage; the run ends parked.

## Audit

- [ ] Every health/churn verdict labels measured signal vs inference
- [ ] No binding commitment proposed as executed (all recommendations park)
- [ ] Any non-interest upsell is flagged, not buried
- [ ] No client-facing send emitted (this workflow aggregates + recommends only)

## Checkpoint

The Teams loop: a human co-shapes and approves any recommendation before it leaves. **`auto`
(L2) may self-approve the internal assessment + at-risk flag ONLY** — every recommendation,
binding commitment, and client-facing touch parks for a human in every mode (NO-COMMITS-EVER,
dial-proof; MSSP work is advisory-only — remediation is human/Datto).
