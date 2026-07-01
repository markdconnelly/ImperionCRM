# Workflow: legal-contract-oversight (Chief of Staff / Internal Ops, executive)

**Job:** on a schedule, synthesize the legal/contract posture — expiries and
renewals coming due, Laurel's review queue, obligation and risk flags — into a
legal brief for Derek, leading with what lapses or binds soonest; where a
follow-up is grounded, delegate the review to Laurel. Rachel never executes,
signs, or binds — binding the company is always a human's call.

**Trigger:** scheduled (start of the working week). One run per cycle.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | gather | Pull the contract room + Laurel's run-ledger / handoff signals + counterparties in scope | — |
| 02 | synthesize | Rank by time-to-lapse and exposure, isolate the obligation/risk flags | — |
| 03 | brief | Produce Derek's legal/contract brief + the flag list; park | **Yes** |
| 04 | delegate-followups | OPTIONAL — propose a delegate to Laurel / handoff to Nova; park | **Yes** |

## Autonomy

Executive ceiling is **L2 delegate-only** (CONSTITUTION §9): Rachel holds no
actuation tool, and the legal domain holds no execution/signature tool either —
binding the company is always a human's call (Laurel's room). This workflow runs
at the ceiling — it reads, synthesizes, parks the brief for Derek, and MAY emit a
**proposed** `delegate()` to Laurel on a grounded expiring/at-risk agreement or a
`handoff()` to Nova when a flag spans divisions. Contract execution, signature,
and any commitment that binds the company route to a human (CONSTITUTION §5.4);
Rachel never actuates, and every review re-gates inside Laurel's own gauntlet.

## Runtime skills

None (Tier 3 empty). The job is read + synthesize + brief + route; voice and
guardrails come from the composed Rachel persona. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
workflow prose is `prose.md`.
