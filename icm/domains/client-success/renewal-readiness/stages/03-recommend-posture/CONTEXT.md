# Stage 03 — recommend-posture

**Job:** park the recommended renewal posture for a human and route the transaction to Chase.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Readiness | `readiness.md` (stage 02) | full | the per-dimension readiness read |
| Readiness rubric | `./skills/renewal-readiness-rubric.md` | all | the posture rule |

## Process

1. `[sonnet]` Pick the recommended posture per the rubric: renew-as-is / uplift /
   at-risk → save-play. State the signals behind it. Flag any **non-interest** uplift and
   decline it (guardrail 4).
2. `[sonnet]` Where the posture is uplift with real client-interest value, note the
   expansion for **Chase** (mint the opportunity via the Chase ↔ Celeste seam — Chase
   prices + closes). Where at-risk, draft a **parked** save-outreach recommendation.
3. `[script]` Mark the disposition: the recommended posture + the parked recommendation,
   each tagged with its owner (human approve / → Chase). No price, no commitment, no send.

## Outputs

`recommendation.md` — the recommended renewal posture (with signals), the parked
recommendation, and the Chase routing where applicable. Terminal stage; ends parked.

## Audit

- [ ] A single recommended posture stated, with its signals
- [ ] No renewal price set and no renewal committed (Chase owns the transaction)
- [ ] Any non-interest uplift is flagged and declined
- [ ] No client-facing send emitted

## Checkpoint

The Teams loop: a human co-shapes and approves the posture before anything leaves; the
renewal price + close route to Chase (gated). **`auto` (L2) may self-approve the internal
readiness compute ONLY** — the posture, every binding commitment, and every client-facing
touch park for a human (NO-COMMITS-EVER, dial-proof; security is advisory-only).
