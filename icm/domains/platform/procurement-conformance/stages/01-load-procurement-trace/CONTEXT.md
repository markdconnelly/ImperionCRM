# Stage 01 — load-procurement-trace

**Job:** load the Vance run's process trace and the procurement Defined-Way ruleset, and
resolve which client / vendor the run is about.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Process trace | governance substrate `agent_run` / `audit_log` (IKF n/a, read via pg.read) | the completed Vance run being audited | the subject of the audit |
| Procurement Defined-Way ruleset | `./skills/procurement-defined-way.md` | Vance's SOP + guardrails as rules | what "conform" means for procurement |
| Identity spine | silver `entity_xref` · `okf:entity_xref` | the client + vendor the run references | resolve who the finding is about |

## Process

1. `[script]` Read the completed Vance run's process trace (workflow, stage sequence, actions
   taken, checkpoints hit, order/approval events). An absent or unreadable trace → audit fail
   (no subject).
2. `[script]` Load the procurement Defined-Way ruleset. A missing ruleset → noted gap (not
   assessable), not a silent pass.
3. `[script]` Resolve the client + vendor via `entity_xref`; note that Vance's Defined Way
   applies.

## Outputs

`trace.md` — the run identity (Vance workflow, client/vendor by reference), the loaded ruleset
id, and a one-line statement of what is being audited. No sensitive values reproduced.

## Audit

- [ ] Vance process trace read (run identity stated by reference, not blank)
- [ ] Procurement Defined-Way ruleset loaded or its absence noted as a gap
- [ ] Client + vendor resolved via `entity_xref` (by reference)
