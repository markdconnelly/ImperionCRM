# Stage 04 — log

**Job:** log the qualification decision and write the handoff record —
idempotently — closing the run.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Route record | stage 03 `stamp-route.md` | all | the stamp result, approver, and route taken |
| Grounding | stage 01 `ground.md` | expansion opp id, account | the deal + account the handoff is about |
| Timeline | `interaction` timeline · `okf:interaction` | this account | where the decision is logged |

## Process

1. `[script]` Log the qualification decision to the `interaction` timeline
   (decision, carrying signals, approver, run id), **idempotency-keyed** (expansion
   opp + decision) so a replay is a no-op + audit note (A9b). Executor owns the
   write; never duplicate an entry.
2. `[script]` Write the handoff record: for a qualified expansion, the
   `pursue-opportunity` (02-A3) proposal hand-off; for a disqualified one, the
   park-back-to-Client-Success record with the rationale. Idempotent — a replay
   re-points the existing record, never a second one.
3. `[script]` Close the run with exactly one terminal state
   (routed-to-pursuit | parked-to-Client-Success).

## Outputs

`expansion-log.md` — interaction entry id, handoff record id, and the one terminal
state (routed-to-pursuit | parked-to-Client-Success).

## Audit

- [ ] Timeline entry id present; replay produced no duplicate (idempotent, A9b)
- [ ] Handoff record written exactly once (re-pointed on replay, never duplicated)
- [ ] Run closed with exactly one terminal state
