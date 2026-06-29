# Stage 01 — read-tickets

**Job:** select the review-window ticket(s) and load each one's SLA record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Trigger | the scheduled review event + its review-window selector | the period / aging rule | what window to review |
| Window tickets | silver `ticket` · `okf:ticket` | tickets closed in the period + still-open tickets aging against SLA: SLA target, actual/elapsed clock, status, timeline | the SLA record to assess |
| Owning account | silver `account` · `okf:account` | the account each ticket belongs to | roll SLA performance up by client |

## Process

1. `[script]` Resolve the review window: tickets **closed** within the period
   plus still-**open** tickets whose SLA clock is **aging** (elapsed approaching or
   past target) per the review rule. Live tickets are in scope only for their SLA
   clock, never to act on.
2. `[script]` For each in-window ticket, load the SLA record from `ticket`: SLA
   target (the committed clock), actual resolution time if closed or elapsed time
   if open, status, and the linked `account`. Ticket with no SLA target on the
   record → mark SLA target `unknown` with a reason (it cannot be assessed against
   a clock), not an audit fail.
3. `[script]` Attach the owning account (id + name) to each ticket for roll-up.
4. `[script]` If the review window contains **no** tickets, record an explicit
   **empty-window** result and park — there is nothing to assess. Never invent a
   ticket or a breach to fill the report.

## Outputs

`window.md` — for each in-window ticket: id, account (id/name by reference),
status (closed/open), SLA target, actual-or-elapsed clock, aging flag. If the
window is empty, an explicit "no tickets in review window" record. A bare list of
ids is not a window record.

## Audit

- [ ] The window is stated (period + aging rule); the result is either ≥1
      in-window ticket each with an id and an account id, or an explicit
      empty-window record
- [ ] Each ticket states SLA target/actual-or-elapsed (or `unknown`, with a reason)
- [ ] Live tickets appear only by their SLA clock — none flagged for any action
