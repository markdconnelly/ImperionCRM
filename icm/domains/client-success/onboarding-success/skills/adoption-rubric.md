# Adoption / first-value rubric (Mark-editable — the milestone plan + what "value" means)

> DEFAULTS authored by the agent 2026-06-29 (issue #1694). The rubric for
> `onboarding-success`: the **first-30/60/90-day adoption milestone model**, the
> **first-value** definition, and the **signal-vs-inference** discipline for an adoption
> read. Mark: edit freely; stages cite this, nothing restates it. The general churn
> **indicators** are NOT re-derived here — they live in
> [`../../client-360/skills/health-signals.md`](../../client-360/skills/health-signals.md)
> (the signal-vs-inference rubric + the churn-indicator table); this skill is the
> *adoption / first-value* layer for the onboarding window. 💤 dormant until #991 +
> #1369/#1370.

## First principle: signal vs inference (cite, don't re-derive)

Read adoption per `health-signals.md`: separate **measured signal** (a fact from a source
row — a login, a first ticket logged, an engagement event, a QBR scheduled) from **your
inference** (your reading of those signals — "adopting well", "going quiet"). **Every
adoption verdict and every early-warning flag carries the signals that produced it**
(celeste.md guardrail 3). You never invent adoption or value to make the window look
healthy; **a gap is escalated as a gap, never smoothed with optimism** (celeste.md §5).

## The first-30/60/90-day milestone model

The onboarding window is the **highest-churn** stretch of the lifecycle, so first-value
is tracked against dated milestones, not a single "are they happy" read.

| Window | Milestone (adoption) | First-value question |
|---|---|---|
| **First 30** | activated + first real use — the client *started* using what was delivered (first logins, first ticket through the new process, first engagement) | did they get **in the door**? |
| **First 60** | habitual use — recurring engagement, not a one-time login; the core delivered capability is part of their week | is it **part of how they work** now? |
| **First 90** | realized value — the client can point to an outcome the relationship produced; ready for the first QBR | did they get **what they bought**? |

The milestone plan is **seeded from what Pierce delivered** (the `delivery-complete`
handoff names the scope) — track adoption of *that* scope, not a generic checklist. Each
milestone has **success criteria** stated as measured signals so the stage-02 read is a
comparison, not a guess.

## First-value: the definition

**First-value = the client realizing a concrete outcome from what was delivered**, read
from measured signals — not "we finished provisioning" (that is Pierce's
`onboarding_step`, the *provisioning* side of the seam, celeste.md §7). Provisioning
delivered the capability; **first-value is whether the client used it and got an outcome.**
A client can be fully provisioned and still at risk if adoption is flat — that flat
adoption is exactly the early-warning this motion exists to catch.

## Early-warning: when adoption is a churn-risk signal

| Read | Measured signal | Disposition |
|---|---|---|
| **On track** | milestones met on cadence, engagement steady | continue the motion; seed 08-B, recommend 08-C at the 90-day mark |
| **Early-warning** | low/no adoption vs the 30/60 milestone · silence (engagement drop) · early friction (a cluster of onboarding-period tickets) | flag as a **churn-risk signal → route to [08-D health-intervention](../health-intervention/CONTEXT.md)** (its rubric owns the intervene-vs-watch + save-outreach decision; this motion does not run the save) |
| **Acute** | a major early incident, escalation, or stated dissatisfaction | route to 08-D and surface to the cockpit; treat any resulting touch as relationship-sensitive |

This motion **reads and routes**; it does **not** run the save outreach — 08-D owns the
intervention decision and the consent-gated send. Surface the at-risk picture to the
cockpit either way so a human has the whole context.

## NO-COMMITS-EVER (dial-proof — the hard line of a check-in)

A first-value check-in **can never promise** an SLA, a credit, a price concession, a
refund, a remediation, or a roadmap item. Those are **binding commitments** — they park
for a human at every rung, no exceptions (celeste.md guardrail 1, extends ADR-0109/0121).
A higher dial widens *autonomy of routine touches*, never *authority to commit*. If the
right check-in *requires* a commitment, the outreach **stops** and the commitment goes to
the human queue.

## Consent + non-interest + in-seam discipline

- **Consent gates every send.** Assert a current consent basis (`consent.check`) before
  any check-in; basis `none` → no send, it parks (ADR-0058). Honor non-interest / opt-out.
- **In the client's interest, not Imperion's revenue** (guardrail 4). A first-value
  check-in is a *relationship* action, never a disguised upsell. Real expansion value →
  **flag a separate opportunity to Chase**; flag any **non-interest upsell** explicitly.
- **Stay in seam.** Provisioning is Pierce's; a security concern → vCISO advisory (no
  remediation, guardrail 2); an expansion close → Chase; an early-warning churn-risk → 08-D.
  This motion owns adoption + first-value, and **seeds** the Account Success Plan (08-B).
