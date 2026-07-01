# Workflow: problem-recurrence-oversight (CTO / Service Delivery, executive)

**Job:** on a schedule, synthesize the recurrence picture — incident clusters that
point at an un-opened problem, stale problem investigations, known errors still
generating tickets — into a recurrence brief for Luke, leading with what keeps
coming back — and where a cluster is grounded, delegate the root-cause
investigation to Sage or the alert-pattern review to Ozzie. Dexter never opens,
closes, or works a problem himself.

**Trigger:** scheduled (weekly problem-review cadence). One run per cycle.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | gather | Pull problems + known errors + the recurring-ticket reads + Problem/NOC run-ledger / handoff signals | — |
| 02 | synthesize | Cluster recurrence, age the investigations, rank by burn, isolate the flags | — |
| 03 | brief | Produce Luke's recurrence brief + the flag list; park | **Yes** |
| 04 | delegate-followups | Emit a proposed delegate to Sage / Ozzie, or handoff to Nova; re-gate inside the sub-agent | **Yes** |

## Autonomy

Executive ceiling is **L2 delegate-only** (CONSTITUTION §9): the executive tier
grants no actuation tool. This workflow runs at that ceiling — it reads,
synthesizes, parks the brief for Luke, and may emit a **proposed** `delegate()` to
Sage (Problem Mgmt / L3 — open/advance the investigation) or Ozzie (NOC — tune the
alert pattern behind the noise), or a `handoff()` to Nova when cross-division.
Dexter never creates a problem record, never runs a remediation, and never touches
a monitor; every real effect re-gates inside the sub-agent's own gauntlet and dial
(ADR-0128). Delegate and handoff route work — they do not actuate.

## Runtime skills

None (Tier 3 empty). The job is read + synthesize + brief + route; voice and
guardrails come from the composed Dexter persona. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
workflow prose is `prose.md`.
