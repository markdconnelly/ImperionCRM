# Stage 04 — propose

**Job:** write the internal PIR record; PROPOSE the permanent_fix + follow-ups — the
checkpoint.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Corrective actions | stage 03 `corrective-actions.md` | all | the actions to propose + their blast radius |
| Root-cause review | stage 02 `root-cause-review.md` | all | the confirmed/challenged cause + timeline |
| PIR base | stage 01 `pir-base.md` | all | the problem, known_error, incident, account for the record |

## Process

1. `[sonnet]` Compose the PIR record: timeline, confirmed/challenged root cause,
   contributing factors, and the corrective/preventive actions — the structured
   post-incident review.
2. `[sonnet]` Frame the proposals: the `known_error` refinement (the `permanent_fix`
   the resolved problem should carry) and any follow-up tickets, each as a PROPOSAL.
   No `problem`/`known_error` write is performed — the record is read-only here.
3. `[script]` Write ONLY the internal PIR finding + work-note (`ticket.note`). Route
   every proposal to **Marshall (Change & Release)** — `reversible-no-prod` and
   `production-or-irreversible` alike park, since refining the durable
   record/permanent_fix is itself a change that needs a human — dial-proof.

## Outputs

`pir-record.md` — the structured PIR, the internal work-note written via `ticket.note`,
the PROPOSED `known_error` `permanent_fix` + follow-up tickets, and the routing
disposition (parked-to-Marshall). The run ENDS here; nothing is written to the
`problem`/`known_error` record, nothing is sent or executed.

## Audit

- [ ] PIR record composed (timeline + root-cause verdict + factors + actions)
- [ ] Only the internal PIR finding/work-note written (no `problem`/`known_error` write)
- [ ] known_error `permanent_fix` + follow-up tickets PROPOSED and parked to Change & Release
- [ ] No send and no execution occurred — the run ended at the checkpoint

## Checkpoint

The human approves the PIR record and every proposal. In `auto` at the v1 **L1** rung,
self-approval is limited to writing the internal PIR finding + work-note when the root
cause is confirmed by the evidence; every `known_error` refinement (`permanent_fix`)
and every follow-up ticket parks and routes to Marshall (Change & Release) — there is
no `problem:write` on the autonomous path, dial-proof (CONSTITUTION §5.4).
