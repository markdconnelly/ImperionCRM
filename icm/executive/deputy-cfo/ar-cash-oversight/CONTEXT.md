# Workflow: ar-cash-oversight (Deputy CFO / Revenue & Finance, executive)

**Job:** on a schedule, synthesize AR aging + cash position into a collections /
cash brief for Nick, leading with the aged and at-risk receivables and the cash
exposure — and where overdue AR is grounded, delegate the dunning to Audrey.
Sterling never sends a reminder and never moves money.

**Trigger:** scheduled (start of the working day / week). One run per cycle.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | gather | Pull the AR / cash reads + Finance run-ledger / handoff signals + the accounts in scope | — |
| 02 | synthesize | Bucket AR by aging, compute cash exposure, rank by overdue/at-risk, isolate the flags | — |
| 03 | brief | Produce Nick's AR/cash brief + the flag list; park | **Yes** |
| 04 | delegate-followups | Emit a proposed delegate to Audrey / handoff to Nova; re-gate inside the sub-agent | **Yes** |

## Autonomy

Executive ceiling is **L2 delegate-only** (CONSTITUTION §9): the executive tier
grants no actuation tool, and finance is **read-only** (QBO is the system-of-record,
ADR-0123). This workflow runs at that ceiling — it reads, synthesizes, parks the
brief for Nick, and may emit a **proposed** `delegate()` to Audrey for grounded
overdue dunning or a `handoff()` to Nova when cross-division. Sterling never sends a
reminder, writes a financial record, or moves money; the customer-facing send and any
money movement re-gate inside Audrey's own gauntlet (always-gated). Delegate and
handoff route work — they do not actuate.

## Runtime skills

None (Tier 3 empty). The job is read + synthesize + brief + route; voice and
guardrails come from the composed Sterling persona. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
workflow prose is `prose.md`.
