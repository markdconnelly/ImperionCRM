# Stage 01 — sample-scope

**Job:** select the ticket(s) in scope and load each one's delivery record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Trigger | the closing ticket event, or the sweep's batch selector | the event / sampling rule | what to audit |
| Closed tickets | silver `ticket` · `okf:ticket` | the in-scope ticket(s): resolution, status, SLA clock, timeline | the delivery record to score |
| Owning account | silver `account` · `okf:account` | the account each ticket belongs to | roll quality up by client |

## Process

1. `[script]` Resolve scope: a single ticket id from the close event, or the
   sampling-sweep batch (recently-closed tickets per the sampling rule). No live
   in-flight tickets — closed/sampled only.
2. `[script]` For each in-scope ticket, load the delivery record from `ticket`:
   resolution text, open/close timestamps, SLA target + actual, reopen count,
   and the linked `account`. Ticket with no resolution text on a closed status →
   audit fail (nothing to score).
3. `[script]` Attach the owning account (id + name) to each ticket for roll-up.

## Outputs

`scope.md` — for each in-scope ticket: id, account (id/name by reference), close
timestamp, SLA target/actual, reopen count, resolution-present flag. A bare list of
ids is not a scope record.

## Audit

- [ ] At least one in-scope ticket, each with an id and an account id
- [ ] Each ticket states SLA target/actual (or `unknown`, with a reason) and a
      resolution-present flag
- [ ] No live/open ticket in scope (closed or sampled only)
