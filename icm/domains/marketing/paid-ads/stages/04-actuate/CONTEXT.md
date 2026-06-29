# Stage 04 — actuate

**Job:** on the human's approval, deploy the boost / apply the budget change via the
Meta Marketing API, idempotently, and read back the live state before close.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Approved spend | stage 03 output | all | the human-committed action + exact $ |
| Ad-spend rules | `./skills/ad-spend-rules.md` | all | the idempotency-key + read-back rules |
| Ad record | `` `okf:ad` `` | this ad | the state to advance/change |

## Process

1. `[script]` Actuate via the Meta Marketing API (`social_dispatch`, ADR-0124):
   **idempotency-keyed (procedure + ad + period) so a replay is a no-op, never a
   double-spend** (A9b). A dormant/missing Meta token or ad-account scope → the action
   is **skipped and flagged**, never silently dropped.
2. `[script]` **Read back** the live ad id + budget + state from Meta before advancing
   (A9c); record it on the `ad` row. Confirm the committed amount matches the read-back.
3. `[script]` Advance the `ad` to its true state — **Deployed** (boost), **Paused**, or
   the new **budget** (change) — with the actuation result and the external Meta ad id.

## Outputs

`actuate-result.md` — the outcome (deployed | paused | re-budgeted | skipped-dormant |
failed), the external Meta ad id, the read-back live budget/state, and the resulting
`ad` status.

## Audit

- [ ] Actuation idempotency-keyed (a replay is a no-op — no double-spend)
- [ ] Live budget/state read back from Meta before close (no assume-success)
- [ ] Committed amount matches the read-back
- [ ] Dormant/failed actuation flagged, not presented as deployed
- [ ] `ad` status reflects the true live state
