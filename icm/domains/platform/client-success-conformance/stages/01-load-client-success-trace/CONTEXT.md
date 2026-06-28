# Stage 01 — load-client-success-trace

**Job:** load the Celeste run's process trace and the client-success Defined-Way ruleset, and
resolve which client / account the run is about.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Process trace | governance substrate `agent_run` / `audit_log` (IKF n/a, read via pg.read) | the completed Celeste run being audited | the subject of the audit |
| Client-success Defined-Way ruleset | `./skills/client-success-defined-way.md` | Celeste's SOP + guardrails as rules | what "conform" means for client-success |
| Identity spine | silver `entity_xref` · `okf:entity_xref` | the client + account the run references | resolve who the finding is about |

## Process

1. `[script]` Read the completed Celeste run's process trace (workflow, stage sequence,
   actions taken, checkpoints hit, any handoff-consume / client-touch / commitment events). An
   absent or unreadable trace → audit fail (no subject).
2. `[script]` Load the client-success Defined-Way ruleset. A missing ruleset → noted gap (not
   assessable), not a silent pass.
3. `[script]` Resolve the client + account via `entity_xref`; note that Celeste's Defined Way
   applies.

## Outputs

`trace.md` — the run identity (Celeste workflow, client/account by reference), the loaded
ruleset id, and a one-line statement of what is being audited. No sensitive values reproduced.

## Audit

- [ ] Celeste process trace read (run identity stated by reference, not blank)
- [ ] Client-success Defined-Way ruleset loaded or its absence noted as a gap
- [ ] Client + account resolved via `entity_xref` (by reference)
