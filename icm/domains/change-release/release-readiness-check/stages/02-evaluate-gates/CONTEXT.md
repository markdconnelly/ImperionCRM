# Stage 02 — evaluate-gates

**Job:** test each governance gate against the gathered inputs — approved
rollback, freeze overlap, template match — and record the outcome of each.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Gathered record | stage 01 `gathered.md` | all | the change + rollback + freeze windows + template the gates evaluate |
| Change | silver `change_request` · `okf:change_request` | the change's schedule window + type | the freeze-overlap test + which gates apply |
| Rollback plan | silver `rollback_plan` · `okf:rollback_plan` | the plan's `approval_status` | the approved-rollback gate |
| Freeze calendar | silver `change_freeze` · `okf:change_freeze` | the in-range active windows | the freeze-overlap hard block |
| Standard-change templates | silver `standard_change_catalog` · `okf:standard_change_catalog` | the matched template's `auto_approve` | auto-approve-eligibility note |

## Process

1. `[script]` **Freeze gate (hard block).** Test whether the change's schedule
   window overlaps any active `change_freeze` window (a temporal overlap, account
   or global scope). Overlap → `blocked-by-freeze`; this is an `always_gate` block
   — no later gate can clear it.
2. `[script]` **Rollback gate.** Pass only if a `rollback_plan` exists for the
   change with `approval_status = approved`. Otherwise the change is
   `missing-rollback`.
3. `[script]` **Template / auto-approve note.** For a `change_type = standard`
   change matched to an `auto_approve` template, note it is auto-approve-eligible;
   a `normal` / `emergency` change is never auto-approve-eligible regardless of
   match — it remains `needs-approval`.
4. `[sonnet]` Reconcile the gate outcomes into a single readiness disposition with
   one line of grounded reasoning per gate (freeze first — it dominates). Do not
   let a clean rollback or a template match override a freeze overlap.

## Outputs

`gates.md` — per-gate outcome (freeze overlap yes/no, rollback approved yes/no,
template/auto-approve note) and the reconciled disposition (`ready` |
`blocked-by-freeze` | `missing-rollback` | `needs-approval`) with grounded
reasoning.

## Audit

- [ ] Freeze overlap evaluated; an overlap forces `blocked-by-freeze` (hard block, never overridden)
- [ ] Rollback gate evaluated against `approval_status = approved`
- [ ] Template / auto-approve note present (normal/emergency never auto-approve-eligible)
- [ ] Exactly one reconciled disposition, grounded per gate
