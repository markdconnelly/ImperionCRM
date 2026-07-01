# Workflow: project-delivery-oversight (CTO / Service Delivery, executive)

**Job:** on a schedule, synthesize project-delivery health — at-risk and slipping
projects, stalled provisioning, and the collision between project work and the
reactive backlog on the same people and accounts — into a delivery brief for Luke,
leading with what will miss — and where a slip or collision is grounded, delegate
the recovery to Pierce or the scheduling to Scout. Dexter never re-plans a project,
commits a date, or commits a technician.

**Trigger:** scheduled (weekly delivery-review cadence). One run per cycle.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | gather | Pull the project portfolio + the reactive-load reads + Projects/Dispatch run-ledger / handoff signals | — |
| 02 | synthesize | Rank projects by slip risk, detect project-vs-reactive collisions, isolate the flags | — |
| 03 | brief | Produce Luke's project-delivery brief + the flag list; park | **Yes** |
| 04 | delegate-followups | Emit a proposed delegate to Pierce / Scout, or handoff to Nova; re-gate inside the sub-agent | **Yes** |

## Autonomy

Executive ceiling is **L2 delegate-only** (CONSTITUTION §9): the executive tier
grants no actuation tool. This workflow runs at that ceiling — it reads,
synthesizes, parks the brief for Luke, and may emit a **proposed** `delegate()` to
Pierce (Projects — recovery plan, re-sequence) or Scout (Dispatch — resolve the
scheduling collision), or a `handoff()` to Nova when cross-division. Dexter never
edits a plan, commits a date to a client, or commits a technician; every real
effect re-gates inside the sub-agent's own gauntlet and dial (ADR-0128). Delegate
and handoff route work — they do not actuate.

## Runtime skills

None (Tier 3 empty). The job is read + synthesize + brief + route; voice and
guardrails come from the composed Dexter persona. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
workflow prose is `prose.md`.
