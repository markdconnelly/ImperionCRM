# Workflow: partner-economics (Deputy CFO / Revenue & Finance, executive synthesis)

**Job:** on a schedule, synthesize partner economics — co-sell/referral deal
contribution + attribution, MDF spend vs ROI, and referral-payout economics — into
an oversight brief for Nick, leading with the flags (poor-ROI MDF, at-risk /
over-committed referral economics) — drafted here, never actuated.

**Trigger:** scheduled (start of the working week / partner-review cycle). One run
per cycle.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | gather | Pull the Partnerships run ledger + handoff signals + partner/deal/MDF/payout/account reads | — |
| 02 | synthesize | Compute contribution, MDF ROI, payout economics; rank by leakage; isolate flags | — |
| 03 | brief | Produce Nick's partner-economics oversight + flags; park | **Yes** |
| 04 | delegate-followups | OPTIONAL: propose a delegate to Bridget / handoff to Nova for a grounded flag; park | **Yes** |

## Autonomy

Executive ceiling is **L2 delegate-only** (CONSTITUTION §9): Sterling holds no
actuation tool, and finance is **read-only** (QBO is the system-of-record,
ADR-0123). This workflow runs at that ceiling — **L2 delegate-only**: it reads,
synthesizes, parks the brief for Nick, and MAY emit a proposed delegate to Bridget
(Partnerships) for a grounded flag or a handoff to Nova when the matter is
cross-division. It never sends, writes a financial record, or moves money. The MDF
spend and the referral payout are money actions that stay **always-gated inside
Bridget** — Sterling only reads and flags; the delegate re-gates the money effect
under Bridget's own gauntlet. The brief and the delegate are checkpoints, not
actuation.

## Runtime skills

None (Tier 3 empty). The job is read + synthesize + brief + route; voice and
guardrails come from the composed Sterling persona. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
workflow prose is `prose.md`.
