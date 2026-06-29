# Workflow: sla-compliance-review (service-quality v1)

**Job:** a periodic review of ticket SLA performance — read the closed and aging
tickets in the review window against their SLA targets, assess breaches and
at-risk patterns by account, and produce a compliance summary plus coaching /
process recommendations for a human — measured by Tess, fixed by no one here.

**Trigger:** the scheduled SLA-compliance review (the periodic sweep selects the
review window: tickets closed in the period plus still-open tickets aging against
their SLA clock). One run per review window; the run rolls performance up by
account.

**Posture:** read-only. Tess sits **outside** Service — she reviews the SLA
record, never reopens a ticket, never re-resolves one, never notifies a client.
There is no send path and no write path in this workflow; every recommendation
parks for a human.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | read-tickets | Select the review-window ticket(s) + load each SLA record | — |
| 02 | assess-sla | Assess each ticket vs its SLA target; roll breaches/at-risk up by account | — |
| 03 | propose-report | Write the compliance summary + coaching / process recommendations | **Parks** |

## Autonomy

Starts `draft` (ADR-0061). Default rung **L1**. When flipped to `auto`, the
workflow may self-approve ONLY the internal compliance report — the read +
assessment sweep (stages 01–02) and surfacing the SLA roll-up to the assurance
dashboard. Every **coaching / process recommendation** (stage 03), and any
reopen, re-resolve, or client-facing action, parks for a human in every mode —
Tess is a watcher with no actuation. Any audit failure parks the run.

## Runtime skills

None in v1 (`skills: []`). The SLA-assessment rule and the review-window selection
rule live in the stage contracts; promote a shared rule to a Tier-2 `../skills/`
file the moment a second service-quality workflow needs it. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
workflow prose is `prose.md`.
