# Stage 03 — route

**Job:** close noise, OR propose the reversible remediation, OR hand the signal to
its owner — the checkpoint.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Classification record | stage 02 `classification.md` | all | what to route |
| Correlation record | stage 01 `context.md` | all | the evidence to carry |
| Open tickets | silver `ticket` · `okf:ticket` | the correlated ticket(s) | where the handoff lands |

## Process

1. `[script]` `noise` → write the finding and close the run (no further action).
2. `[sonnet]` `incident` with `runbook-reversible` → draft the reversible
   remediation proposal (the runbook step + the undo) and **park** it; never
   execute in the v1 tracer. `incident` with `none` → draft the handoff to Felix
   with the correlated evidence and **park**.
3. `[sonnet]` `security` → draft the handoff to Cyrus with the correlated evidence
   and **park**. Never propose remediation for a security event.
4. `[script]` Any destructive/identity-touching candidate → force-park regardless
   of class or dial (dial-proof, CONSTITUTION §5.4).

## Outputs

`routing.md` — the disposition (closed-noise / parked-remediation /
parked-handoff-Felix / parked-handoff-Cyrus), the evidence carried, and the exact
next action a human approves. The run ENDS here; nothing is sent or executed.

## Audit

- [ ] Disposition matches the class (`security` ⇒ Cyrus, never remediation)
- [ ] Any remediation is reversible + names its undo, and is PARKED
- [ ] No send and no execution occurred — the run ended at the checkpoint
- [ ] Destructive/identity candidates were force-parked
