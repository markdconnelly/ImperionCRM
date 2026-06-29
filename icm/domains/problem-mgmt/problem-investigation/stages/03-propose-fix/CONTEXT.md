# Stage 03 — propose-fix

**Job:** propose the permanent fix, open the problem record, hand off the doc — the
checkpoint.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Root-cause record | stage 02 `root-cause.md` | all | what the fix addresses |
| Cluster record | stage 01 `cluster.md` | all | affected CIs + account for the record |
| Open incidents | silver `ticket` · `okf:ticket` | the cluster's open tickets | where the problem record links |

## Process

1. `[sonnet]` Draft the permanent fix tied to the root cause, with its blast
   radius and (where applicable) its undo. Distinguish the permanent fix from any
   interim workaround.
2. `[sonnet]` Open the problem record: cause, affected CIs/account, proposed fix,
   linked incidents. Draft the documentation handoff to Alivia.
3. `[script]` Route by fix surface: `reversible-no-prod` → the L3-ceiling auto path
   (still PARKED at the v1 L1 tracer); `production-or-irreversible` → **park** and
   route to Marshall (Change & Release) — dial-proof.

## Outputs

`problem-record.md` — the proposed permanent fix, the opened problem record, the
Alivia doc handoff, and the routing disposition (parked-L3-candidate /
parked-to-Marshall). The run ENDS here; nothing is sent or executed.

## Audit

- [ ] Proposed permanent fix is tied to the root cause (not a workaround)
- [ ] Problem record opened with cause + affected CIs + linked incidents
- [ ] Production/irreversible fixes PARKED and routed to Change & Release
- [ ] No send and no execution occurred — the run ended at the checkpoint
