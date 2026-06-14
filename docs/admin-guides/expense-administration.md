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

---

# Expense categories (mapping console)

The **Expense Categories** surface (`/expenses/categories`, ADR-0083, #489) is the admin
console that maps the synced QuickBooks chart of accounts onto the clean, website-facing
expense categories employees pick from. It is one-time/maintenance setup, the expense twin
of [Employee mapping](../../src/app/(app)/timesheets/mappings).

## Access

Admin-only (`canManageExpenseCategories`). The save action enforces the
`expense:category-map` capability server-side (admin only — fail-closed). The surface is
**comp-free**: it never reads or writes the mileage rate or any pay data.

## QuickBooks is the system of record — the app never writes it

QuickBooks Online owns the category list. The local-pipeline chart-of-accounts pull
(LP #168) syncs it read-only into the `qbo_expense_account` bronze table; the app **never
creates, edits, or writes QuickBooks**. Until that pull runs, the synced-accounts list is
empty and the console says so — only the system Mileage category is usable. This is the
expected deploy-ahead state.

If a category you need is **absent in QuickBooks**, the console does not offer a create
path. Instead: create the account in QuickBooks Online manually (finance), re-run the
chart-of-accounts sync, then return here and map a category to it.

## Mapping a category

Each non-system category renders as a row with:

| Field | What it does |
| --- | --- |
| Display name | The clean name employees see (independent of the QuickBooks account name). |
| QuickBooks account | The **hard link** (`expense_category.qbo_account_id` → `qbo_expense_account`). Blank = unmapped. |
| Hard cap ($) | Per-item amount over this is a **hard** policy violation (blocks attest). Blank = none. |
| Soft threshold ($) | Per-item amount over this is a **soft** nudge. Blank = none. |
| Autotask category id | The `ExpenseItem.ExpenseCategory` id the backend writer stamps. |
| Billable by default | Pre-checks the billable leg in the employee entry GUI. |
| Visible to employees | Hides the category from the entry GUI without deleting it. |
| Active | Goes live. A non-system category **cannot be active while unmapped** — the console (and the DB `CHECK`) force it inactive until a QuickBooks account is linked. |

Only categories that are **mapped + visible + active** appear to employees in the entry
GUI. Clearing the QuickBooks account on a row drops it back to inactive automatically.

## Mileage — the system category

Mileage is the rate-driven, receipt-exempt **system** category. It is mapping-exempt (it
reimburses at the effective mileage rate, not against a QuickBooks account) and always
active. The console shows it as a read-only marker — its QuickBooks link is never touched
here.

## Scope notes

- The synced QuickBooks accounts are read-only — the console offers them as link targets
  and shows which category (if any) each is already mapped to; it never edits them.
- The mileage rate is comp data and lives behind a separate payroll-gated surface (#490);
  it is never read or shown here.
