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

# Monthly Close (unified time + expense)

The **Monthly Close** surface (`/monthly-close`, ADR-0083 #491, amends ADR-0082) is the
single monthly finance task that rolls up **both** legs — time and expense — for every
employee, one row per employee per month. It reads the comp-free `monthly_close` view (a
`FULL OUTER JOIN` of the time and expense facts, migration 0090): a month with only time
or only expense still appears. The detailed per-report lifecycle still lives on
[Time administration](timesheet-administration.md) and [Expense administration](#expense-administration)
— Monthly Close is the cross-leg roll-up and the finance action hub on top of them.

## Access

Finance gate — **finance ∨ admin** (`canApprovePayroll`), the same gate as the payroll
and expense finance-approval surfaces. Anyone else gets an access notice. The surface is
**comp-free**: it shows approved time **minutes** (as hours) and reimbursable **dollar
totals** only — never a pay or mileage rate. Expected pay (hours × rate) is computed in
the backend, the sole reader of the comp store.

## The two legs are independent

| Leg | What it pays | Cadence | QuickBooks fact | Acted on |
|---|---|---|---|---|
| **Time** | the wage | weekly timesheet, rolled up by month | `Purchase` (vendor payment) → **Paid** | per weekly sheet in **Time Admin** (deep-linked) |
| **Expense** | out-of-pocket reimbursement | one monthly report | `Purchase` (reimbursement) → **Reimbursed** | inline here (the report is 1:1 with the row) |

Reimbursement is a **separate AP bill**, distinct from the payroll wage — the two legs
settle independently, each against its own QuickBooks payment.

## Per-leg status

Each leg shows a derived status badge:

- **Owed** (amber) — an obligation is authorized (finance-approved) but not yet confirmed
  paid. This is finance's queue.
- **Pending** — work exists upstream but isn't finance-approved yet.
- **Exception** (red) — the backend reconciliation found a QuickBooks discrepancy that
  **blocks** the auto-flip to Paid / Reimbursed. Finance must resolve it.
- **Settled** (green) — confirmed paid / reimbursed (matched read-back of the QuickBooks
  payment). The expense leg shows the matched `Purchase` id.
- **—** — nothing on this leg this month.

## Finance actions

- **Finance-approve expense** — inline, sets an Approved monthly report to Finance
  approved (authorizes reimbursement; the app never pays).
- **Confirm reimbursement** — opens the in-context panel to record the QuickBooks
  `Purchase` match and set the report Reimbursed. When the backend reconciliation has
  suggested a match it is pre-filled; otherwise finance enters the payment id manually
  (acceptable for UAT).
- **Time leg** — the **status** badge deep-links into Time Admin filtered to that
  employee, where finance payroll-approves and confirms the QuickBooks payment per weekly
  sheet (Monthly Close does not duplicate the per-week machinery).

## Read-back validation

A leg flips to Paid / Reimbursed only when the backend reconciliation **matches** the
QuickBooks payment(s). A mismatch surfaces as an **exception** that blocks the auto-flip
until resolved. The backend match is **dormant until QuickBooks credentials are
configured** — until then legs stay Owed/Pending and the table shows a "pending" notice
rather than failing (deploy-ahead).

## Filters & sorting

Filter by employee name, a coarse status bucket (All / Open obligations / Exceptions /
Settled), and a month range (`from` / `to`). Sort by month, employee, time, or
reimbursable total (click a column header to toggle direction).

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

---

# Mileage rate (payroll-gated comp admin)

The **Mileage Rate** surface (`/expenses/mileage-rate`, ADR-0083, #490) sets the
effective-dated, **system-wide** mileage reimbursement rate (`mileage_rate`). It is the
expense analog of the **Pay Rate** comp store and is gated **identically**.

## Access — comp-gated, exactly like Pay Rate

Visible to **finance or admin** only (`canManageMileageRate`). The override action enforces
the `expense:mileage-rate` capability server-side (finance∨admin — fail-closed). The rate is
**comp data**: it is **never** visible to employee, agent, or client roles. The employee
entry GUI never reads the rate — employees see only their miles and MileIQ's own suggested
dollar figure. The per-employee mileage **amount is derived by the backend** (the sole comp
reader): for each drive it multiplies the miles by the rate **in force on the drive date**.

## Setting a rate

The rate is **effective-dated**, so amounts always recompute against the rate that applied
on a drive's date:

- The **Rate in force today** card shows the rate a drive dated today reconciles against
  (the latest effective date on or before today).
- The **MileIQ suggested rate** card shows MileIQ's own suggestion when the integration is
  connected (a `mileiq_suggested` row written by the pipeline). Until MileIQ creds land
  (#495) it degrades to "not yet available" — set the rate manually instead.
- **Set a system override** appends a new effective-dated row (source `system_override`).
  Setting the same effective date again overwrites it. History is preserved so back-period
  reconciliation uses the correct historical rate.

## Scope notes

- The app never derives a per-employee dollar amount on this surface — it only stores the
  system rate. The dollar math is the backend's (ADR-0083).
- This surface is the **only** place the mileage rate is read or written in the front end;
  no broadly-granted read model or view exposes it.

---

# Employee mapping — MileIQ identity (extends #468)

The **Employee Mapping** surface (`/timesheets/mappings`, ADR-0082/0083, #468/#490) — admin
one-time setup — now carries a **MileIQ user id** column alongside the Autotask Resource and
QuickBooks vendor ids. Email is the consistent join key across all four systems
(app_user ↔ Autotask Resource ↔ QuickBooks vendor ↔ **MileIQ user**); the MileIQ id lets the
MileIQ drive pull / silver merge attribute a drive to the right employee.

The column is a **mapping** column, not comp — it lives on `employee_profile` beside the
other ids and is the only MileIQ field the pipelines may read; the mileage **rate** stays on
the separate payroll-gated surface above. Automatic email-based resolution from MileIQ (like
Autotask / QuickBooks) is a backend enhancement; until it lands the admin enters the id here.
