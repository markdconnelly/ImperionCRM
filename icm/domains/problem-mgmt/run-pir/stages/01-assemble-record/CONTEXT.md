# Stage 01 — assemble-record

**Job:** assemble the resolved problem and its linked evidence into one PIR base.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Resolved problem | silver `problem` · `okf:problem` | the triggering resolved problem (full record) | the PIR subject + recorded `root_cause` |
| Emitted known_error | silver `known_error` · `okf:known_error` | the `known_error` the problem emitted (workaround + permanent_fix) | what the durable output currently says |
| Contributing incident | silver `ticket` · `okf:ticket` | the problem's `ticket_id` incident + its history | the incident timeline base |
| Affected account | silver `account` · `okf:account` | the problem's `account_id` (NULL if estate-wide) | client/blast-radius context |

## Process

1. `[script]` Resolve the resolved `problem` and confirm `status = resolved`. Not
   resolved → not a PIR subject; end the run with a note.
2. `[script]` Resolve the linked `known_error` (via `problem_id`), the primary
   incident `ticket` (via `ticket_id`), and the affected `account` (via `account_id`,
   NULL for an estate-wide problem). Never write here.
3. `[haiku]` Assemble the record: the problem's `root_cause` + `resolved_at`, the
   known_error's `workaround`/`permanent_fix`, and the incident's resolution history.
   Note any missing link (no known_error, no incident) for the review to weigh.

## Outputs

`pir-base.md` — the resolved problem, its recorded root cause + resolution date, the
linked known_error (workaround + permanent_fix), the contributing incident, and the
affected account. A non-resolved problem ends the run.

## Audit

- [ ] Problem confirmed `resolved` (else run ended as not-a-PIR-subject)
- [ ] Linked known_error + contributing incident resolved (or stated missing)
- [ ] Affected account resolved (or stated estate-wide / NULL)
