# Workflow: escalation-sla-oversight (CTO / Service Delivery, executive)

**Job:** on a schedule, synthesize the escalation picture — backlog aging, SLA
breach risk, and stuck escalation-worthy tickets — into an escalation/SLA brief for
Luke, leading with what is about to breach — and where a stuck or at-risk item is
grounded, delegate the triage to Felix, the L3 escalation to Sage, or the onsite
scheduling to Scout. Dexter never touches a ticket and never dispatches.

**Trigger:** scheduled (start of the working day / shift). One run per cycle.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | gather | Pull the ticket backlog / SLA reads + Service run-ledger / handoff signals + the accounts in scope | — |
| 02 | synthesize | Bucket by SLA risk, age the backlog, rank by breach proximity, isolate the flags | — |
| 03 | brief | Produce Luke's escalation/SLA brief + the flag list; park | **Yes** |
| 04 | delegate-followups | Emit a proposed delegate to Felix / Sage / Scout, or handoff to Nova; re-gate inside the sub-agent | **Yes** |

## Autonomy

Executive ceiling is **L2 delegate-only** (CONSTITUTION §9): the executive tier
grants no actuation tool. This workflow runs at that ceiling — it reads,
synthesizes, parks the brief for Luke, and may emit a **proposed** `delegate()` to
Felix (triage), Sage (L3 root cause), or Scout (onsite scheduling), or a `handoff()`
to Nova when cross-division. Dexter never edits a ticket, never notifies a client,
never commits a technician; every real effect re-gates inside the sub-agent's own
gauntlet and dial (ADR-0128). Delegate and handoff route work — they do not actuate.

## Runtime skills

None (Tier 3 empty). The job is read + synthesize + brief + route; voice and
guardrails come from the composed Dexter persona. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
workflow prose is `prose.md`.
