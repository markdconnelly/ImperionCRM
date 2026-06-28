# Stage 02 — scope-access

**Job:** assemble the access change set — a deprovision set for a leaver, or a
least-privilege grant set for a joiner/mover.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Resolution record | stage 01 `resolution.md` | full | the subject + resolved identity |
| Role → access rubric | knowledge search (least-privilege role mapping) over gold | the role in scope | minimal grant set |
| Asset access | silver `device` · `okf:device` | assets tied to the entity | reclaim/scope on leaver |

## Process

1. `[script]` Carry the event class and resolved entity/account ids forward.
2. `[sonnet]` Leaver → assemble the deprovision set: access to disable, sessions to
   revoke, and `device` access to reclaim, scoped to the entity. Reversible +
   asset-scoped only.
3. `[sonnet]` Joiner/mover → map the role to the minimal least-privilege grant set
   via `knowledge.search`; "to be safe" widening is rejected. Cite the rubric.

## Outputs

`access-scope.md` — for a leaver, the scoped reversible deprovision set; for a
joiner/mover, the minimal least-privilege grant set with the rubric citation. Feeds
the stage-03 decision.

## Audit

- [ ] A deprovision set (leaver) OR a least-privilege grant set (joiner/mover) is present
- [ ] Every grant is justified against the role rubric (no unjustified widening)
- [ ] No client PII or secret material in the record (audit-by-reference)
