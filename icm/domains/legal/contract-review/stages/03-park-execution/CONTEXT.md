# Stage 03 — park-execution

**Job:** package the review for a human and **park execution** — route every genuine
legal call and every binding action to a human. This is the checkpoint; the run
never signs, binds, or sends for signature.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Review | `review.md` (stage 02 output) | all | flags, redlines, summary to hand off |
| Intake | `intake.md` (stage 01 output) | counterparty + deal refs | attach the handoff to the right record |

> No new OKF grounding here — there are no `okf:` markers; this stage packages prior
> stages' outputs and parks.

## Process

1. `[script]` Assemble the handoff: the plain-language summary, the redline set, and
   the licensed-counsel-required list, attached to the counterparty/deal by id.
2. `[script]` Route every licensed-counsel-required item to a human (licensed
   counsel / authorized signer) — none is resolved in this workflow.
3. `[script]` Park execution: signing, countersigning, and send-for-signature are
   human-only on the ADR-0058 path. This workflow has no execution path.

## Outputs

`handoff.md` — the packaged review (summary + redlines + counsel-required items),
attached to the `account`/`opportunity` by id, with execution explicitly parked.
**This stage parks** — it presents the review + the handoff to a human
(CONSTITUTION §5.4) and ends. No send, no signature, no binding, in any mode.

## Audit

- [ ] Handoff packages the summary, redlines, and counsel-required list (attached by id)
- [ ] Every licensed-counsel-required item routed to a human (none auto-resolved)
- [ ] Execution parked — no sign / countersign / send-for-signature occurs
