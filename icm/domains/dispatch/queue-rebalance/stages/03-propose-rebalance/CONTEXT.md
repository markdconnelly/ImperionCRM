# Stage 03 — propose-rebalance

**Job:** propose the rebalanced assignment set and park every reassignment — the
checkpoint.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Imbalance findings | stage 02 `imbalance-findings.md` | all | the findings to resolve |
| Queue snapshot | stage 01 `queue-snapshot.md` | all | the current load + open queue to rebalance against |
| Ticket | silver `ticket` · `okf:ticket` | the tickets named in the findings | where each proposed reassignment lands |
| Account site | silver `account` · `okf:account` | the account's site per affected ticket | proximity rationale for a proposed move |

## Process

1. `[sonnet]` For each finding, draft a proposed reassignment — which ticket
   moves to which technician — grounded on skill, then location proximity, then
   current load. State one line on why this move helps; a move you cannot ground
   is not proposed.
2. `[sonnet]` Assemble the rebalanced set and the internal rebalance-analysis
   work-note (the findings + the proposed moves, a draft only).
3. `[script]` PARK every reassignment proposal for a human — dial-proof at every
   rung. Autotask remains the scheduling system of record; this workflow does not
   write an assignment to it, move a ticket, or notify anyone.

## Outputs

`rebalance-proposal.md` — the proposed rebalanced set (each move + rationale), the
internal rebalance-analysis note, and the exact reassignments a human must
approve. The run ENDS here; nothing is moved, committed, or sent.

## Audit

- [ ] Each proposed move grounded (skill / proximity / load) or omitted
- [ ] Every reassignment is a PROPOSAL and PARKED — no self-actuated move at any rung
- [ ] No assignment write, no notify, no send — the run ended at the checkpoint

## Checkpoint

The human approves (or edits) the rebalanced assignment set; `auto` may
self-approve ONLY writing the internal rebalance-analysis work-note. Every
reassignment — and any notify — always parks for a human, at every level,
dial-proof (CONSTITUTION §5.4). Any send exits only through ADR-0058.
