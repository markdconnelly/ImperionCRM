# Stage 03 — brief

**Job:** produce Mark's risk brief plus the quarantine flags, then park.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Synthesis | stage 02 `synthesis.md` | all | the drift-risk-ranked roll-up |

## Process

1. `[sonnet]` Write the risk brief: a short read leading with the highest-risk
   drift, then the rest of the roll-up.
2. `[sonnet]` Render the quarantine-flag list as the brief's action surface — each
   item the drift, the recommended hold, and the decision Mark must make.
3. `[script]` Park the brief for Mark. No send, no delegate, no write, no correction.

## Outputs

`brief.md` — Mark's risk brief + the quarantine-flag list, by reference. The run
ends here at the checkpoint; nothing is actuated.

## Audit

- [ ] Brief leads with the highest-risk drift
- [ ] Quarantine-flag list present; each item states the drift, the hold, and the decision
- [ ] No client PII, no secrets in the brief (audit by reference)
- [ ] No send, delegate, write, or correction occurred — the run parked

## Checkpoint

The brief parks for **Mark** (risk reports to Mark). `auto` may self-approve ONLY
publishing the scheduled sweep when every section is grounded and cited by
reference; any quarantine flag, gap, or recall miss parks for Mark (CONSTITUTION
§8). No actuation exists at this tier — the assurance line observes, flags, and
recommends; it never actuates the fix (the Vera doctrine).
