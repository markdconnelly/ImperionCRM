# Workflow: change-risk-oversight (CTO / Service Delivery, executive)

**Job:** on a schedule, synthesize the change calendar's risk picture — emergency
and normal changes in flight, freeze-window overlaps, missing or unapproved
rollback plans, "standard" changes that are not on the catalog — into a change-risk
brief for Luke, leading with the dangerous change this week — and where a defect is
grounded, delegate the remediation to Marshall. Dexter never approves, schedules,
or pushes a change.

**Trigger:** scheduled (start of the working week / before the change window). One
run per cycle.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | gather | Pull the change calendar + freeze windows + rollback plans + the standard-change catalog + Change run-ledger / handoff signals | — |
| 02 | synthesize | Rank changes by risk, detect freeze overlaps and rollback gaps, isolate the flags | — |
| 03 | brief | Produce Luke's change-risk brief + the flag list; park | **Yes** |
| 04 | delegate-followups | Emit a proposed delegate to Marshall, or handoff to Nova; re-gate inside the sub-agent | **Yes** |

## Autonomy

Executive ceiling is **L2 delegate-only** (CONSTITUTION §9): the executive tier
grants no actuation tool, and change approval is **always-gated at the sub-agent
tier** — a freeze-window overlap is a hard always_gate block inside Marshall's own
gauntlet (ADR-0079, ADR-0128). This workflow runs at the exec ceiling — it reads,
synthesizes, parks the brief for Luke, and may emit a **proposed** `delegate()` to
Marshall (Change/Release) for a grounded defect, or a `handoff()` to Nova when
cross-division. Dexter holds no approval lever and never schedules or pushes a
change. Delegate and handoff route work — they do not actuate.

## Runtime skills

None (Tier 3 empty). The job is read + synthesize + brief + route; voice and
guardrails come from the composed Dexter persona. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
workflow prose is `prose.md`.
