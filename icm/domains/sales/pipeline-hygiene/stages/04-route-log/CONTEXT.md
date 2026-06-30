# Stage 04 — route-log

**Job:** route each customer-facing follow-up to `pursue-opportunity` (02-A3) as a
parked proposal, deliver the hygiene digest, and log the sweep — idempotently —
closing the run.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Flag-or-stamp | stage 03 `flag-or-stamp.md` | all | the digest, applied stamps, route candidates |
| Triage | stage 02 `triage.md` | route candidates | the follow-ups to route, with priority + type |
| Timeline | `interaction` timeline · `okf:interaction` | the swept opportunities | where the sweep + routed items are logged |

## Process

1. `[script]` For each route candidate, queue a **parked** `pursue-opportunity`
   (02-A3) proposal keyed to its opportunity id — the follow-up re-inherits that
   workflow's always_gate; nothing customer-facing is sent from here. Never
   compose or dispatch the touch.
2. `[script]` Log the sweep to the `interaction` timeline (digest reference,
   applied stamps, routed item ids, run id), **idempotency-keyed** (sweep run +
   opportunity) so a replay is a no-op + audit note (A9b). Executor owns the
   write; never duplicate an entry.
3. `[haiku]` Deliver the hygiene digest to the owning AE queue / Sterling roll-up
   per the digest's recipients; capture the delivery result.

## Outputs

`route-log.md` — the parked `pursue-opportunity` proposals (opportunity id +
queue entry), the timeline log entry id, the digest delivery result, and the
terminal state. One terminal state.

## Audit

- [ ] Every route candidate queued as a PARKED pursue-opportunity (02-A3) proposal; none sent here
- [ ] Sweep logged to the timeline; replay produced no duplicate (idempotent, A9b)
- [ ] Hygiene digest delivered to its recipients; delivery result captured
- [ ] Run closed with exactly one terminal state
