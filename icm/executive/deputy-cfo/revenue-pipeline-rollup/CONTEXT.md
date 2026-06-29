# Workflow: revenue-pipeline-rollup (Deputy CFO / Revenue & Finance, executive)

**Job:** on a schedule, synthesize the revenue + forward-pipeline picture —
Chase's bookings/open opportunities and Belle's demand signals — into a
forecast / pipeline-health brief for Nick, leading with slippage and at-risk
commits (not a vanity bookings number); where a flag is grounded, delegate the
follow-up to Chase or hand off to Nova — never actuated here.

**Trigger:** scheduled (start of the working day / week). One run per cycle.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | gather | Pull the division run-ledger + handoff bus + pipeline rooms + accounts in scope | — |
| 02 | synthesize | Roll up the forecast, rank by slippage & at-risk commits, isolate flags | — |
| 03 | brief | Produce Nick's pipeline rollup + the flag list; park | **Yes** |
| 04 | delegate-followups | OPTIONAL — propose a delegate to Chase / handoff to Nova; park | **Yes** |

## Autonomy

Executive ceiling is **L2 delegate-only** (CONSTITUTION §9): Sterling holds no
actuation tool, and finance is **read-only** (QBO is the system-of-record,
ADR-0123). This workflow runs at the full ceiling — **L2 delegate-only**: it
reads, synthesizes, parks the rollup for Nick, and MAY emit a proposed
`delegate()` to Chase on a grounded stalled opportunity or a `handoff()` to Nova
when a flag spans divisions. The world-changing effect — any outreach or
commitment — RE-GATES inside Chase's own gauntlet; Sterling never sends, writes a
financial record, or moves money. The rollup and the delegate are checkpoints,
not actions.

## Runtime skills

None (Tier 3 empty). The job is read + synthesize + park + route; voice and
guardrails come from the composed Sterling persona. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
workflow prose is `prose.md`.
