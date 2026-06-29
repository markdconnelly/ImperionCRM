# Stage 03 — propose

**Job:** close the benign items with a finding, and raise a PARKED proposal for each
at-risk item — the checkpoint.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Assessment record | stage 02 `assessment.md` | all | what to propose |
| Fleet snapshot | stage 01 `snapshot.md` | the scored items | the evidence to carry |
| Open tickets | silver `ticket` · `okf:ticket` | the covering ticket(s) for already-tracked items | where a work-note lands |

## Process

1. `[script]` `healthy` and `already-tracked` items → write the internal sweep
   finding (or an internal work-note on the covering ticket via `ticket.note`) and
   close them — no new ticket.
2. `[sonnet]` Each `at-risk` item → draft a PARKED proposal: a new ticket (or a
   work-note on its existing ticket) naming the item by entity reference, the risk,
   the grounding evidence, and the recommended next step from stage 02. Park it;
   never raise, send, or actuate in the v1 sweep.
3. `[script]` Any proposal that implies a destructive or identity-touching action
   (wipe, rebuild, credential/permission change, lock-out) → force-park regardless
   of score or dial (dial-proof, CONSTITUTION §5.4).

## Outputs

`proposals.md` — per item the disposition (closed-healthy / internal-note-tracked /
parked-ticket-proposal), the evidence carried, and the exact next action a human
approves. The run ENDS here; nothing is raised, sent, or executed.

## Audit

- [ ] Every at-risk item has a parked proposal naming its risk + next step
- [ ] Benign/already-tracked items closed with a finding, no new ticket
- [ ] Items referenced by entity id only — no client PII, no secrets
- [ ] No ticket was raised, no send and no execution occurred — the run ended at the checkpoint
- [ ] Destructive/identity-touching proposals were force-parked

## Checkpoint

The human approves which parked proposals become real tickets/work-notes. In `auto`
mode at the v1 sweep rung (**L1**) the worker may self-approve ONLY the internal
finding/work-note for a benign or already-tracked item that passed every audit;
every ticket proposal, and every external-facing effect, parks for a human in every
mode (`agent.yaml` `auto_may_self_approve`). Destructive and identity-touching
actions and security events are dial-proof and never auto-execute at any rung.
