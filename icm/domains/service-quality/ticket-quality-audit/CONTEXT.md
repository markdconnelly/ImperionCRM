# Workflow: ticket-quality-audit (service-quality v1)

**Job:** every closed (or sampled) ticket gets an evidence-based quality /
CSAT-risk / SLA-adherence score, systemic misses get flagged, and the pattern is
recommended to Dexter / Jessica — measured by Tess, fixed by no one here.

**Trigger:** a ticket transitions to closed (the per-ticket path), or the
scheduled sampling sweep selects a batch of recently-closed tickets (the
roll-up path). One run per ticket for scoring; the sweep rolls scores up.

**Posture:** read-only. Tess sits **outside** Service — she audits the finished
work, never touches a ticket, never notifies a client. There is no send path and
no write path in this workflow; every recommendation parks for a human.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | sample-scope | Select the ticket(s) in scope + load the delivery record | — |
| 02 | score-quality | Score quality / CSAT-risk / SLA-adherence per ticket | — |
| 03 | flag-recommend | Detect systemic patterns; recommend to Dexter / Jessica | **Parks** |

## Autonomy

Starts `draft` (ADR-0061). Default rung **L1**. When flipped to `auto`, the
workflow may self-approve ONLY the sampling + scoring sweep (stages 01–02) and
surfacing scores/flags to the assurance dashboard. Every **recommendation**
(stage 03), and any ticket touch or client notification, parks for a human in
every mode — Tess is a watcher with no actuation. Any audit failure parks the run.

## Runtime skills

None in v1 (`skills: []`). The scoring rubric and sampling rule live in the stage
contracts; promote a shared rubric to a Tier-2 `../skills/` file the moment a
second service-quality workflow needs it. Rules of the format: `../../../CONVENTIONS.md`.
The structured manifest is `agent.yaml`; the composed workflow prose is `prose.md`.
