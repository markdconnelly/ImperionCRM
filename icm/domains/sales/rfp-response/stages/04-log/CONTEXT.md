# Stage 04 — log

**Job:** the post-submission tail (Stream 02-C5). Runs ONLY after the human-authorized
submission (stage 03). On submit → log the outcome and attach the response to the
`opportunity` (idempotency-keyed); route a win → 02-A6, a loss → 02-C7. Internal mirror —
no customer-facing action originates here.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Submit decision | `submit-decision.md` (stage 03 output) | full | only a `submitted` result enters this stage |
| Opportunity | the tied `opportunity` · `okf:opportunity` | this deal | the record the response is attached to + restaged |

## Process

1. `[script]` Gate on stage 03: proceed ONLY if `submit-decision.md` is `submitted`. A
   `cancelled` / `parked` result is terminal at stage 03 — never advance a non-submitted bid.
2. `[script]` Log the submission outcome and **attach the response to the `opportunity`**,
   **idempotency-keyed** (opportunity + bid) so a replay is a no-op, never a double-attach
   (A9b). Restage the opportunity to reflect the open bid.
3. `[script]` On a recorded **win** → emit the **02-A6 close path** seam (closed-won
   handoff). On a recorded **loss** → emit the **02-C7 win-loss** seam (learning feed). A
   still-pending bid stays open with a logged next-touch; no outcome is invented.

## Outputs

`bid-log.md` — the submission outcome, the `opportunity` attachment reference (idempotency
key), the restage, and — on a decided outcome — the 02-A6 (win) or 02-C7 (loss) seam
reference. Terminal stage.

## Audit

- [ ] Entered ONLY on a stage-03 `submitted` result (no non-submitted bid advanced)
- [ ] The attach is idempotency-keyed — a replay is a no-op, not a double-attach (A9b)
- [ ] A decided outcome emitted its seam (win → 02-A6, loss → 02-C7); no dropped routing
- [ ] No outcome fabricated — a pending bid stays pending, logged
