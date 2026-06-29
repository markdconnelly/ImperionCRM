# Stage 03 — verdict-propose

**Job:** emit the readiness verdict and propose the next step, then park it for a
human — the checkpoint. Approval, scheduling, and execution are never the
workflow's to make.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Gates record | stage 02 `gates.md` | all | the per-gate outcomes + reconciled disposition |
| Change | silver `change_request` · `okf:change_request` | the change to attach the verdict note to | where the readiness note lands |

## Process

1. `[sonnet]` Assemble the **readiness verdict** — one of `ready` |
   `blocked-by-freeze` | `missing-rollback` | `needs-approval` — and the **proposed
   next step** it implies (e.g. `ready` → "park for human approval";
   `missing-rollback` → "raise + get an approved rollback plan first";
   `blocked-by-freeze` → "reschedule outside the active freeze window";
   `needs-approval` → "route to the human approval queue").
2. `[haiku]` Write the verdict + proposed next step as an INTERNAL readiness
   work-note on the change (`ticket.note`) — operational, never client-facing. This
   is the one write `auto` may self-approve (up to L2); it actuates nothing.
3. `[script]` PARK for a human. The approval, the scheduling, and the execution
   always park, at every rung — dial-proof; a `blocked-by-freeze` verdict is a hard
   block. The workflow never approves, schedules, or executes; it proposes and
   stops.

## Outputs

`readiness.md` — the verdict, the per-gate basis, and the proposed next step, in
its parked state with the exact decision a human must make. The run ENDS here;
nothing is approved, scheduled, sent, or executed.

## Audit

- [ ] Exactly one verdict present (`ready` | `blocked-by-freeze` | `missing-rollback` | `needs-approval`) with its proposed next step
- [ ] Only the INTERNAL readiness work-note was written (`ticket.note`) — no approval, schedule, send, or execution
- [ ] Record PARKED for a human — no self-approval of the change at any rung; a freeze block is never proceeded past

## Checkpoint

A human reads the verdict + proposed next step and decides the change's fate
(approve / schedule / require a rollback / reschedule) — none of which this
workflow performs. `auto` mode (up to Marshall's L2 ceiling) may self-approve ONLY
writing the internal readiness work-note (step 2); the change approval, the
scheduling, and the execution always park, and a `blocked-by-freeze` verdict is a
hard `always_gate` block at every rung. Anything unstated parks by default.
