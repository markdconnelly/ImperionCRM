# Stage 01 — gather-change

**Job:** resolve the change and the three governance inputs the gates need — its
rollback plan, the freeze calendar in range, and any matching standard-change
template.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Change | silver `change_request` · `okf:change_request` | the change under review (type, status, schedule window, affected scope) | the subject of the readiness check |
| Rollback plan | silver `rollback_plan` · `okf:rollback_plan` | the plan attached to this change (UNIQUE per change), incl. its `approval_status` | the approved-rollback gate |
| Freeze calendar | silver `change_freeze` · `okf:change_freeze` | active windows (global, or scoped to the change's account) overlapping the schedule window | the freeze-overlap gate |
| Standard-change templates | silver `standard_change_catalog` · `okf:standard_change_catalog` | templates (global or account-scoped) matchable to the change | the auto-approve-eligibility note |

## Process

1. `[script]` Read the `change_request`: `change_type`, `status`,
   `schedule_start` / `schedule_end`, and affected scope. Never write here.
2. `[script]` Fetch the change's `rollback_plan` (one per change) and capture its
   `approval_status`; record "no rollback plan" if absent.
3. `[script]` Fetch `change_freeze` windows that could overlap the schedule
   window — global windows plus any scoped to the change's `account_id`.
4. `[haiku]` Identify whether the change matches a `standard_change_catalog`
   template (by template selection / definition fit), and capture that template's
   `risk_level` and `auto_approve` flag if matched.

## Outputs

`gathered.md` — the change (type, status, schedule window, scope), its rollback
plan + `approval_status` (or "none"), the in-range freeze windows, and the matched
template + `auto_approve` (or "no match").

## Audit

- [ ] Change resolved (type, status, schedule window present or stated absent)
- [ ] Rollback plan + approval_status captured, OR "no rollback plan" stated
- [ ] In-range freeze windows listed (or stated none)
- [ ] Template match stated (matched + auto_approve flag, or "no match")
