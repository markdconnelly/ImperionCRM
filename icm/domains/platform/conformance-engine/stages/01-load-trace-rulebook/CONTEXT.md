# Stage 01 — load-trace-rulebook

**Job:** load the run's process trace and the owning domain's Defined-Way ruleset, and
resolve which agent + client the run is about.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Process trace | governance substrate `agent_run` / `audit_log` (IKF n/a, read via pg.read) | the completed run being audited | the subject of the audit |
| Defined-Way ruleset | the owning domain's encoded SOP + guardrails ruleset (A2–A8, #1460–#1466) | the rules for that domain | what "conform" means here |
| Identity spine | silver `entity_xref` · `okf:entity_xref` | the agent + client the run references | resolve who/what the finding is about |

## Process

1. `[script]` Read the completed run's process trace (agent slug, workflow, stage sequence,
   actions taken, checkpoints hit). An absent or unreadable trace → audit fail (no subject).
2. `[script]` Load the owning domain's Defined-Way ruleset. An undefined ruleset for the
   domain → noted gap (not assessable), not a silent pass.
3. `[script]` Resolve the agent + client via `entity_xref`; note which domain's Defined Way
   applies.

## Outputs

`trace.md` — the run identity (agent, workflow, client by reference), the loaded ruleset id,
and a one-line statement of what is being audited. No sensitive values reproduced.

## Audit

- [ ] Process trace read (run identity stated by reference, not blank)
- [ ] Defined-Way ruleset loaded or its absence noted as a gap
- [ ] Agent + client resolved via `entity_xref` (by reference)
