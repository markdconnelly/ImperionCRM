# Stage 01 — resolve-event

**Job:** verify and classify the lifecycle event and resolve the person to one
internal entity.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Lifecycle event | the triggering row (HR joiner/mover/leaver event / review cadence) | full payload | the subject |
| Identity spine | silver `entity_xref` · `okf:entity_xref` | the person's source ids | resolve to one internal entity |
| Owning account | silver `account` · `okf:account` | the customer/org the person belongs to | scope + ownership |

## Process

1. `[script]` Extract the lifecycle fields (person id, event type, effective date,
   source) from the payload. No event type or person id → audit fail; unverified
   event → park.
2. `[script]` Resolve the person via `entity_xref` to one internal entity; resolve
   the owning `account`. Unresolved id → park (never act on an unresolved identity).
3. `[sonnet]` Classify the event: `joiner` | `mover` | `leaver`, one sentence of
   reasoning citing the event signal.

## Outputs

`resolution.md` — event type + reasoning, the resolved internal entity id, owning
`account` id, verification status. An unverified/unresolved event ends the run with
a park note.

## Audit

- [ ] Exactly one event class with one sentence of reasoning present
- [ ] The person resolves to one internal entity, or the run is parked
- [ ] No client PII or secret material in the record (audit-by-reference)
