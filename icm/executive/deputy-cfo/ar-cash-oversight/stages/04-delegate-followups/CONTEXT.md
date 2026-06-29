# Stage 04 — delegate-followups

**Job:** optionally emit a proposed `delegate()` to Audrey for grounded overdue
dunning and/or a `handoff()` to Nova when cross-division, then park — Sterling never
sends and never moves money.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Brief | stage 03 `brief.md` | the flagged overdue / at-risk items | what may warrant a follow-up |

## Process

1. `[sonnet]` For each flagged overdue item that is grounded and cited, draft a
   **proposed** `delegate()` to **Audrey** (Finance): the account id, the overdue
   invoice ids, and the aged/at-risk amount — the dunning ask, nothing customer-facing
   composed here.
2. `[sonnet]` Where the exposure is cross-division (e.g. a renewal or delivery
   dependency outside Finance), draft a `handoff()` to **Nova** instead, naming the
   division and the reason.
3. `[script]` Attach each delegate/handoff to the brief as a proposal and park. No
   send, no write, no money moved — the customer-facing reminder and any cash movement
   re-gate inside Audrey's own gauntlet (always-gated).

## Outputs

`followups.md` — the proposed `delegate()` calls to Audrey and/or `handoff()` calls
to Nova, each citing the account/invoice ids and the exposure. The run ends here at
the checkpoint; the receivable action happens inside the sub-agent, not here.

## Audit

- [ ] Every delegate names the account id, the overdue invoice ids, and the at-risk amount, all grounded and cited
- [ ] No customer-facing reminder text is composed here — only the dunning ask is routed
- [ ] Cross-division items are handed off to Nova, not delegated to Finance
- [ ] Read-only — no financial record written, no money moved
- [ ] No send/write/actuation occurred — Sterling delegated or parked

## Checkpoint

The follow-ups park for **Nick**, and any delegate is a **proposal** to Audrey. `auto`
may self-approve ONLY emitting the `delegate()` to Audrey for flagged overdue dunning
that is grounded and cited, and the `handoff()` to Nova when cross-division; the
customer-facing send and any money movement re-gate inside Audrey's gauntlet
(always-gated, CONSTITUTION §9). Sterling never sends a reminder and never moves money
— finance read-only, QBO is SoR (ADR-0123); any ungrounded or non-finance item parks
for Nick.
