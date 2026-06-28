# Workflow: opportunity-create (sales v1)

**Job:** when a routed lead qualifies MQL→SQL, create and document the
`opportunity` record — Chase's **L2 auto-internal** capability (ADR-0128 D1):
an internal, reversible CRM write with no customer-facing side effect.

**Trigger:** a lead Chase has qualified to SQL — handed over from `lead-response`
(stage 01 fit-score) or summoned by Jarvis post-score (Belle → `lead_score`
threshold → Chase). One run per qualifying lead.

**What this is NOT:** no customer-facing touch, no pricing, no quote, no
send-for-signature. Those are always-gated and live in other workflows
(`renewal-reprice`, the proposal motion). This workflow only writes the internal
pipeline record so the deal is tracked.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | qualify-confirm | Confirm the lead clears the MQL→SQL bar; show the logic | — |
| 02 | create-document | Write + document the `opportunity` record (`opportunity.write`) | **L2 self-approve** |
| 03 | summary-handoff | Internal summary + parked next-step proposal (no send) | — |

## Autonomy

Starts `draft` (ADR-0061). The flip to `auto` is admin-only and reversible
(`autopilot_policies`). At **L2**, stage 02 may self-approve the
`opportunity.write` ONLY when stage 01's qualification audit is green and the lead
clears the MQL→SQL bar — the write is internal and reversible. Pricing, quotes,
any customer-facing action, and any audit failure park for a human in every mode
(anything not named here parks by default). The customer-facing commitment ceiling
is dial-proof (ADR-0128 — Chase never sends for signature unattended).

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `qualification-rubric.md` (the MQL→SQL bar).
Mark-editable business content; stages cite, never restate. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
workflow prose is `prose.md`.
