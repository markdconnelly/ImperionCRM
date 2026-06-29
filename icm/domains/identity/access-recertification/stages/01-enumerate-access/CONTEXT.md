# Stage 01 — enumerate-access

**Job:** read the current access picture for the review scope and resolve each
identity to one internal entity.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Review scope | the triggering row (recert cadence / on-demand review request) | full payload | the review window + scope |
| Identity spine | silver `entity_xref` · `okf:entity_xref` | the in-scope source ids | resolve each to one internal entity |
| Owning account | silver `account` · `okf:account` | the customer/org each identity belongs to | scope + ownership |
| Asset access | silver `device` · `okf:device` | assets tied to the in-scope entities | the access surface under review |

## Process

1. `[script]` Extract the review scope (window, scope filter, source) from the
   payload. No scope → audit fail.
2. `[script]` For each in-scope source id, resolve via `entity_xref` to one
   internal entity and tie it to its owning `account`. An id that does not resolve
   is recorded as an orphaned-candidate (never silently dropped).
3. `[script]` Enumerate the `device` access tied to each resolved entity — the
   current access surface under review. Reference scope only.

## Outputs

`access-inventory.md` — the current access picture: each resolved internal entity
id, its owning `account` id, the `device` access in scope, and any unresolved
orphaned-candidate ids. Feeds stage 02.

## Audit

- [ ] Every in-scope id is resolved to one internal entity OR recorded as an orphaned-candidate
- [ ] The access surface (per-entity `device` access) is enumerated for the scope
- [ ] No client PII or secret material in the record (audit-by-reference; ids/locations only)
