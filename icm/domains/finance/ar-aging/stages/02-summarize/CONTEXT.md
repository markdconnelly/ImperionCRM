# Stage 02 — summarize

**Job:** produce the AR aging + cash-position summary for the CFO / board.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Bucketed AR | `ar.md` (stage 01 output) | full | the aged open AR to summarize |
| Aging rubric | `./skills/aging-rubric.md` | all | cash-position summary structure + NOT-dunning boundary |

## Process

1. `[sonnet]` Assemble the AR aging + cash-position summary per `aging-rubric.md`: total
   open AR, the aging distribution across buckets, the cash-position read (current vs aged,
   the 90+ tail, and trend **only when a prior snapshot exists**), and notable concentrations
   by account name. **Label measured figure vs derived** and stamp the **as-of date** on
   every figure. Do not estimate into a data gap — carry the noted gaps forward as gaps.
2. `[script]` Finalize the summary as an internal CFO / board artifact. **EXPLICITLY NOT
   DUNNING:** no payment reminder is drafted, queued, or sent (that is the future collections
   agent, #667); nothing is posted, pushed to QBO, or moved (QBO is the system of record,
   ADR-0123). The output informs a human; it never acts on a client.

## Outputs

`summary.md` — the AR aging + cash-position summary for the CFO / board (total open AR,
aging distribution, cash-position read, notable concentrations, as-of date, measured-vs-
derived labels, any escalated data gap). Terminal stage; ends parked for the CFO / board.

## Audit

- [ ] Every figure carries its source + as-of date (measured vs derived labeled)
- [ ] Cash-position read present; trend only asserted when a prior snapshot exists
- [ ] Data gaps carried forward as gaps, not estimated
- [ ] NOT dunning: no payment reminder drafted/queued/sent; no posting, money move, or QBO push

## Checkpoint

The CFO/board summary loop: a human reads the AR aging + cash-position summary; any payment
reminder is the future collections agent's job (#667, ADR-0058) and any money movement is
QBO (ADR-0123). **`auto` (L2) may self-approve raising the internal AR aging + cash-position
summary ONLY** — there is no send, payment reminder, posting, or money move in Audrey's
catalog at any rung (read-only ceiling, audrey.md).
