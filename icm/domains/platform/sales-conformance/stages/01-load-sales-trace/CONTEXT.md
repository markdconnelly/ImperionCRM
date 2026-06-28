# Stage 01 — load-sales-trace

**Job:** load the Chase run's process trace and the sales Defined-Way ruleset, and resolve
which client / lead the run is about.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Process trace | governance substrate `agent_run` / `audit_log` (IKF n/a, read via pg.read) | the completed Chase run being audited | the subject of the audit |
| Sales Defined-Way ruleset | `./skills/sales-defined-way.md` | Chase's SOP + guardrails as rules | what "conform" means for sales |
| Identity spine | silver `entity_xref` · `okf:entity_xref` | the client + lead the run references | resolve who the finding is about |

## Process

1. `[script]` Read the completed Chase run's process trace (workflow, stage sequence,
   actions taken, checkpoints hit, send events). An absent or unreadable trace → audit fail
   (no subject).
2. `[script]` Load the sales Defined-Way ruleset. A missing ruleset → noted gap (not
   assessable), not a silent pass.
3. `[script]` Resolve the client + lead via `entity_xref`; note that Chase's Defined Way
   applies.

## Outputs

`trace.md` — the run identity (Chase workflow, client/lead by reference), the loaded ruleset
id, and a one-line statement of what is being audited. No sensitive values reproduced.

## Audit

- [ ] Chase process trace read (run identity stated by reference, not blank)
- [ ] Sales Defined-Way ruleset loaded or its absence noted as a gap
- [ ] Client + lead resolved via `entity_xref` (by reference)
