# Workflow: margin-renewal-oversight (Deputy CFO / Revenue & Finance, executive synthesis)

**Job:** on a schedule, synthesize **margin** (billable time + expenses vs invoiced
revenue) and the **renewal book** (open renewal opportunities + license true-ups, with
Celeste's client-health and Chase's pricing signals) into an oversight brief for Nick —
leading with **unprofitable work** and **at-risk renewals**, each with its exposure
stated. Grounded flags are delegated to the owning sub-agent; finance is read-only and
Sterling never actuates.

**Trigger:** scheduled (start of the working week / billing cycle). One run per cycle.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | gather | Pull the run ledger + handoff signals + margin/renewal reads + accounts in scope | — |
| 02 | synthesize | Compute margin by account/engagement, rank by leakage; assess the renewal book by exposure; isolate the flags | — |
| 03 | brief | Produce Nick's margin & renewal oversight + the flag list; park | **Yes** |
| 04 | delegate-followups | OPTIONAL: emit a proposed delegate to Celeste/Chase, or handoff to Nova; re-gates inside the sub-agent | **Yes** |

## Autonomy

Executive ceiling is **L2 delegate-only** (CONSTITUTION §9): Sterling holds no
actuation tool, and finance is **read-only** (QBO is the system-of-record, ADR-0123).
This workflow reads, synthesizes, briefs, and — only for a grounded, cited flag — emits
a **proposed `delegate()`** to Celeste (a renewal save) or Chase (a reprice), or a
`handoff()` to Nova when the follow-up is cross-division. The world-changing effect of
any delegated follow-up — a commitment, a price change, money moving — **re-gates inside
the sub-agent's own gauntlet**; Sterling never holds that lever. Every gap parks for
Nick. Sterling delegates or parks; he never sends, writes a financial record, or moves
money.

## Runtime skills

None (Tier 3 empty). The job is read + synthesize + brief + delegate/park; voice and
guardrails come from the composed Sterling persona. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
workflow prose is `prose.md`.
