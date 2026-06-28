# Stage 01 — load-marketing-trace

**Job:** load the Belle run's process trace and the marketing Defined-Way ruleset, and
resolve which client / campaign the run is about.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Process trace | governance substrate `agent_run` / `audit_log` (IKF n/a, read via pg.read) | the completed Belle run being audited | the subject of the audit |
| Marketing Defined-Way ruleset | `./skills/marketing-defined-way.md` | Belle's SOP + guardrails as rules | what "conform" means for marketing |
| Identity spine | silver `entity_xref` · `okf:entity_xref` | the client + campaign the run references | resolve who the finding is about |

## Process

1. `[script]` Read the completed Belle run's process trace (workflow, stage sequence,
   actions taken, checkpoints hit, send events). An absent or unreadable trace → audit fail
   (no subject).
2. `[script]` Load the marketing Defined-Way ruleset. A missing ruleset → noted gap (not
   assessable), not a silent pass.
3. `[script]` Resolve the client + campaign via `entity_xref`; note that Belle's Defined Way
   applies.

## Outputs

`trace.md` — the run identity (Belle workflow, client/campaign by reference), the loaded
ruleset id, and a one-line statement of what is being audited. No sensitive values reproduced.

## Audit

- [ ] Belle process trace read (run identity stated by reference, not blank)
- [ ] Marketing Defined-Way ruleset loaded or its absence noted as a gap
- [ ] Client + campaign resolved via `entity_xref` (by reference)
