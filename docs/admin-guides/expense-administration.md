# Expense administration

The unified **Expense Admin** surface (`/expenses/admin`, ADR-0083, #548) is the
single all-users lifecycle table for employee expense reports — the expense twin of
[Time administration](timesheet-administration.md). One table, every report, every
employee, every state, with filters and sortable columns. It replaces the need for
separate approval queues.

## Access

Visible to **admin or finance** (`canAdministerExpenses`). Individual row actions are
gated further:

| Action | Capability | Roles |
| --- | --- | --- |
| Approve / Reject / Reopen | `expense:approve` | admin |
| Finance-approve / Confirm reimbursement | `expense:finance-approve` | finance, admin |

Everything on this surface is **comp-free** — no pay or mileage-rate data crosses it.
The mileage-dollar derivation and reimbursement math live in the backend (the sole
comp reader, ADR-0083).

## The lifecycle

```
open → submitted → approved → finance_approved → reimbursed
                 ↘ rejected ↗ (reopen → open)
```

1. **Submitted** — the employee has attested the month. An **admin** opens **Review**
   (`?review=`) to inspect the items and either **Approve**, **Reject** (with a note
   sent back to the employee), or **Reopen**. Approving fires an idempotent Autotask
   ExpenseReport tracking row for the backend writer (BE #108) — re-approval reuses the
   same row.
2. **Approved** — **finance** clicks **Finance-approve** inline. This authorizes the
   reimbursement; the app never pays.
3. **Finance-approved** — **finance** opens **Confirm reimbursement** (`?match=`). The
   backend recon (BE #111) suggests the matched QuickBooks Purchase; finance confirms
   it (or enters the payment id manually when the recon isn't wired — acceptable for
   UAT). Confirming sets the report **Reimbursed**.
4. **Rejected** — bounced back; the employee reopens it from their own `/expenses`
   surface to correct and re-attest.

## Filters & sorting

Filter by employee name, lifecycle state, and a month range (`from` / `to`). Sort by
month, employee, state, or total (click a column header to toggle direction). Filters
and sort are preserved across the in-context Review / Confirm panels.

## Scope notes

- In-place item correction by an admin is the deeper expense entry GUI (#488) — for now
  an admin who needs a change **Rejects** with a note. Adding/editing items is the
  employee entry GUI (#487).
- QuickBooks payment references are read-only (set by the backend recon); this surface
  only records finance's confirmation of the match.
