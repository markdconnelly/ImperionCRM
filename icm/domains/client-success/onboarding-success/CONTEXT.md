# Workflow: onboarding-success (client-success) — Stream-08 procedure 08-R

> 💤 **DORMANT until its data substrate lands (ADR-0123 built-but-inert).** This
> playbook is authored **capability-complete** but stays **inert** in production until
> the substrate exists: the **#991 cross-agent handoff bus** (the Pierce
> `delivery-complete` handoff that wakes this motion) and the **interaction / comms
> collectors** (#1369 / #1370) that hydrate the engagement + adoption signals the
> first-value read depends on. Until then there is no `delivery-complete` handoff to
> receive and no measured adoption signal to compute on, so the workflow never wakes —
> it is built, registered, and reviewable, not running. Do not read its dormancy as
> "deferred/broken"; it lights up the moment its source signals hydrate (CLAUDE.md §6
> deploy-dormant; celeste.md grounding, ADR-0123). (Issue #1694.)

**Job:** Celeste's **onboarding-success / time-to-value adoption** motion — the
**CS-side adoption + first-value** motion for a newly-onboarded client: did they
**realize value**, **adopt** the tooling, and hit their **first-30/60/90-day**
milestones? It computes adoption + first-value from MEASURED signals (L2 internal),
then **drafts** a first-value check-in and the downstream seeds. Onboarding is the
**highest-churn window** of the lifecycle: a new client with no structured success
motion is the most likely to churn, so the motion is sustained, not a one-touch event.

**Trigger:** a Pierce **`delivery-complete` / go-live handoff** for a newly-onboarded
client (or the onboarding-window opening). This is the **same 08-A handoff family** as
[`client-360`](../client-360/CONTEXT.md) — but where 08-A intake is the **EVENT** (fold
one signal, park recommendations), **this is the sustained first-value MOTION** that
runs from go-live onward. **One run per onboarding lifecycle.**

**The Pierce ↔ Celeste seam (celeste.md §7).** **Pierce/Delivery owns
PROVISIONING/DELIVERY** — the `onboarding_step` project tasks (deploy/verify hooks).
**Celeste owns ADOPTION + relationship VALUE-REALIZATION from go-live onward.** This
motion is **distinct from Pierce's `onboarding_step`**: that is the provisioning
checklist; this is whether the client *used* what was provisioned and *got value*. The
motion **STARTS** at Pierce's `delivery-complete` handoff (Pierce hands `managed_active`)
and **SEEDS** the Account Success Plan ([08-B](../account-success-plan/CONTEXT.md), #1688)
as its durable downstream.

**What this is NOT:** no binding commitment — a first-value check-in can never promise
an SLA, a credit, a price, or a roadmap item; those **park for a human** (NO-COMMITS-EVER,
dial-proof, celeste.md guardrail 1). No security remediation (MSSP advisory-only,
guardrail 2). No expansion close — real expansion value mints an opportunity for **Chase**
(celeste.md seams). Not Pierce's provisioning checklist (that is `onboarding_step`); not
08-A's single-signal intake (this is the sustained motion); not a QBR deck (08-C). The
check-in is in the **client's interest, not Imperion's revenue** (guardrail 4).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | onboarding-intake | Receive the Pierce `delivery-complete` handoff; resolve the client; establish the 30/60/90 milestone plan + success criteria | — |
| 02 | adoption-track | Track adoption + first-value vs the plan from MEASURED signals; flag early-warning churn-risk → 08-D | — |
| 03 | first-value-checkin | DRAFT the first-value check-in (consent-gated) + recommend first QBR (08-C) + SEED the success plan (08-B) | **Teams-loop** |

## Autonomy

Starts `draft` (ADR-0061). **L1 = a Teams-loop gradient** (a human co-shapes + approves).
At **L2** (the manifest default), the handoff intake + milestone-plan establishment, the
adoption/first-value tracking, and the **draft** of the first-value check-in auto-execute
(internal, reversible, signal-labeled). The **client-facing check-in SEND parks for a
human** (ADR-0058). A **routine, templated welcome / first-value check-in** MAY ride the
same **L3** routine-share carve-out as 08-N when an operator raises the dial (celeste.md
ladder L3) — described in `prose.md`, but the **manifest rung stays L2**.
**Relationship-sensitive touches stay human-approved in every mode**, and **every**
binding commitment (SLA / credit / pricing / spend / security-remediation) parks for a
human at every rung — the NO-COMMITS-EVER and MSSP-advisory ceilings are dial-proof
(celeste.md guardrails 1–2). **Early-warning churn-risk routes to
[08-D health-intervention](../health-intervention/CONTEXT.md).** Strict
client-confidential boundary: one client's signals never enter another's context.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `adoption-rubric.md` (the first-value /
adoption-milestone framing — the 30/60/90 milestone model + first-value definition + the
signal-vs-inference discipline). Mark-editable; stages cite, never restate. Rules of the
format: `../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
prose is `prose.md`.
