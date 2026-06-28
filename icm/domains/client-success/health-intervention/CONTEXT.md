# Workflow: health-intervention (client-success)

> 💤 **DORMANT until its data substrate lands (ADR-0123 built-but-inert).** This
> playbook is authored **capability-complete** but stays **inert** in production until
> the health/churn substrate exists: the **health_score weighting** (#1046) and the
> **interaction / comms collectors** (#1369 / #1370) that hydrate engagement, sentiment,
> and service signals. Until then there is no measured signal to compute on, so the
> workflow never wakes — it is built, registered, and reviewable, not running. Do not
> read its dormancy as "deferred/broken"; it lights up the moment its source signals
> hydrate (CLAUDE.md §6 deploy-dormant; celeste.md grounding, ADR-0123).

**Job:** Celeste's **health-monitoring + churn-risk intervention** playbook — compute and
flag account health / churn-risk from measured signals (L2 internal), then, where the
signal warrants it, **intervene** with a consent-gated **save outreach** to the at-risk
client (L3 churn-risk intervention). She does not merely flag; she acts — within the
dial-proof ceilings (celeste.md guardrails 1–2).

**Trigger:** a periodic health sweep over active accounts (the cockpit cadence) **or** a
fresh churn-risk signal arriving on Celeste's wake inbox (a Felix service-pattern handoff,
an interaction sentiment drop, a renewal-at-risk). One run per at-risk account.

**What this is NOT:** no binding commitment — a save outreach can never promise a credit,
an SLA, a price, or a remediation; those **park for a human** (NO-COMMITS-EVER, dial-proof,
celeste.md guardrail 1). No security remediation (MSSP advisory-only, guardrail 2). No
expansion close — real expansion value mints an opportunity and hands it to **Chase**; a
security advisory routes to the **vCISO** playbook (celeste.md seams). The save outreach is
in the **client's interest, not Imperion's revenue** (guardrail 4).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | monitor-health | Read + compute health / churn-risk signals; flag at-risk | — |
| 02 | plan-intervention | Decide watch vs intervene; draft the save outreach; consent.check | — |
| 03 | intervene | The consent-gated save-outreach send (routine may auto; relationship-sensitive parks) | **Teams-loop** |

## Autonomy

Starts `draft` (ADR-0061). **L1 = a Teams-loop gradient** (a human co-shapes + approves).
At **L2**, the health/churn-risk compute + at-risk flag auto-execute (internal, reversible,
signal-labeled). At **L3**, a **routine churn-risk save outreach** may auto-send at the
earned rung (celeste.md ladder L3) — a low-risk relationship touch, consent-gated, no
commitment. **Relationship-sensitive interventions stay human-approved in every mode**, and
**every** binding commitment (credit / SLA / pricing / spend / security-remediation) parks
for a human at every rung — the NO-COMMITS-EVER and MSSP-advisory ceilings are dial-proof
(celeste.md). Strict client-confidential boundary: one client's signals never enter
another's context.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `intervention-rubric.md` (when a churn-risk signal
warrants intervention vs watch, the routine-vs-relationship-sensitive save playbook, the
consent + non-interest discipline) — it cites `../client-360/skills/health-signals.md` for
the churn indicators rather than restating them. Mark-editable; stages cite, never restate.
Rules of the format: `../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the
composed prose is `prose.md`.
