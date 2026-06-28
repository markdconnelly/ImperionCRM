# Stage 01 — load-finance-trace

**Job:** load the Audrey run's process trace and the finance Defined-Way ruleset, and
resolve which client / account the run is about.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Process trace | governance substrate `agent_run` / `audit_log` (IKF n/a, read via pg.read) | the completed Audrey run being audited | the subject of the audit |
| Finance Defined-Way ruleset | `./skills/finance-defined-way.md` | Audrey's SOP + guardrails as rules | what "conform" means for finance |
| Identity spine | silver `entity_xref` · `okf:entity_xref` | the client + account the run references | resolve who the finding is about |

## Process

1. `[script]` Read the completed Audrey run's process trace (workflow, stage sequence,
   actions taken, checkpoints hit, any push/handoff events). An absent or unreadable trace →
   audit fail (no subject).
2. `[script]` Load the finance Defined-Way ruleset. A missing ruleset → noted gap (not
   assessable), not a silent pass.
3. `[script]` Resolve the client + account via `entity_xref`; note that Audrey's Defined Way
   applies.

## Outputs

`trace.md` — the run identity (Audrey workflow, client/account by reference), the loaded
ruleset id, and a one-line statement of what is being audited. No sensitive values reproduced.

## Audit

- [ ] Audrey process trace read (run identity stated by reference, not blank)
- [ ] Finance Defined-Way ruleset loaded or its absence noted as a gap
- [ ] Client + account resolved via `entity_xref` (by reference)
