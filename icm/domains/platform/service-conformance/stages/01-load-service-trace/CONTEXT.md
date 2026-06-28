# Stage 01 — load-service-trace

**Job:** load the Felix run's process trace and the service Defined-Way ruleset, and resolve
which client / ticket the run is about.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Process trace | governance substrate `agent_run` / `audit_log` (IKF n/a, read via pg.read) | the completed Felix run being audited | the subject of the audit |
| Service Defined-Way ruleset | `./skills/service-defined-way.md` | Felix's SOP + guardrails as rules | what "conform" means for service |
| Identity spine | silver `entity_xref` · `okf:entity_xref` | the client + ticket the run references | resolve who the finding is about |

## Process

1. `[script]` Read the completed Felix run's process trace (workflow, stage sequence, actions
   taken, checkpoints hit, reply/time events). An absent or unreadable trace → audit fail (no
   subject).
2. `[script]` Load the service Defined-Way ruleset. A missing ruleset → noted gap (not
   assessable), not a silent pass.
3. `[script]` Resolve the client + ticket via `entity_xref`; note that Felix's Defined Way
   applies.

## Outputs

`trace.md` — the run identity (Felix workflow, client/ticket by reference), the loaded ruleset
id, and a one-line statement of what is being audited. No sensitive values reproduced.

## Audit

- [ ] Felix process trace read (run identity stated by reference, not blank)
- [ ] Service Defined-Way ruleset loaded or its absence noted as a gap
- [ ] Client + ticket resolved via `entity_xref` (by reference)
