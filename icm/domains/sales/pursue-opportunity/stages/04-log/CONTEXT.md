# Stage 04 — log

**Job:** log the touch, re-stage the opportunity, and re-queue the next action —
idempotently — closing the run.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Send record | stage 03 `send-record.md` | all | what/when we sent, approver |
| Grounding | stage 01 `ground.md` | opportunity id, prior stage | the deal to re-stage |
| Opportunity | silver `opportunity` · `okf:opportunity` | this deal | current stage for the re-stage decision |
| Timeline | `interaction` timeline · `okf:interaction` | this opportunity | where the touch is logged |

## Process

1. `[script]` Log the sent touch to the `interaction` timeline (body, channel,
   approver, run id), **idempotency-keyed** (opportunity + touch) so a replay is a
   no-op + audit note (A9b). Executor owns the write; never duplicate an entry.
2. `[script]` Re-stage the opportunity: advance one stage if the touch met its
   advance condition, else hold the current stage — a deterministic state stamp.
3. `[script]` Re-queue the next action: schedule the next touch per the cadence in
   `./skills/pursuit-rules.md` (deterministic date math), or close the run as
   `held` with the logged next touch when no further action is due.

## Outputs

`pursuit-log.md` — interaction entry id, re-stage result (advanced/held + stage),
next-action queue entry or close reason. One terminal state.

## Audit

- [ ] Timeline entry id present; replay produced no duplicate (idempotent, A9b)
- [ ] Opportunity re-stage recorded (advanced or held — exactly one)
- [ ] Run closed with exactly one terminal state (advanced / held-with-next-touch)
