# Stage 01 — load-delivery-trace

**Job:** load the Pierce run's process trace and the delivery Defined-Way ruleset, and
resolve which client / project the run is about.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Process trace | governance substrate `agent_run` / `audit_log` (IKF n/a, read via pg.read) | the completed Pierce run being audited | the subject of the audit |
| Delivery Defined-Way ruleset | `./skills/delivery-defined-way.md` | Pierce's SOP + guardrails as rules | what "conform" means for delivery |
| Identity spine | silver `entity_xref` · `okf:entity_xref` | the client + project the run references | resolve who the finding is about |

## Process

1. `[script]` Read the completed Pierce run's process trace (workflow, stage sequence,
   actions taken, checkpoints hit, provisioning events). An absent or unreadable trace →
   audit fail (no subject).
2. `[script]` Load the delivery Defined-Way ruleset. A missing ruleset → noted gap (not
   assessable), not a silent pass.
3. `[script]` Resolve the client + project via `entity_xref`; note that Pierce's Defined Way
   applies.

## Outputs

`trace.md` — the run identity (Pierce workflow, client/project by reference), the loaded
ruleset id, and a one-line statement of what is being audited. No sensitive values reproduced.

## Audit

- [ ] Pierce process trace read (run identity stated by reference, not blank)
- [ ] Delivery Defined-Way ruleset loaded or its absence noted as a gap
- [ ] Client + project resolved via `entity_xref` (by reference)
