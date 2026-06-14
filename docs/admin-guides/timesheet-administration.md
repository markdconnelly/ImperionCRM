# Time Administration — admin & finance guide

The unified timesheet lifecycle surface (ADR-0082, #539). Surface: **Time Admin** in
the left nav (`/timesheets/admin`) — visible to **admin or finance**
(`canAdministerTimesheets`). It absorbs the former *Time Approvals* and *Payroll
Approval* queues into one filterable, sortable table so you follow every employee's
timesheet across its whole lifecycle in one place.

## The table

One row per timesheet, **all employees, all states**:

| Column | Meaning |
|---|---|
| Employee · Week | Who and which Mon–Sun week. |
| Attended | Logged attendance for the week. |
| Approved | Approved hours (blank until the week is admin-approved). |
| State | Open → Submitted → Admin approved → Finance approved → Paid. |

**Filter** by employee name, state, and week range (from/to). **Sort** by clicking the
Employee, Week, Attended, or State header (click again to flip direction). The header
line summarises the queue — how many are awaiting review and awaiting payment.

## Acting on a row (role-gated)

Each row shows the control valid for its state and your role:

- **Submitted** → **Review** (admin, `time:approve`) opens the day-by-day review panel
  to correct entries in place, then **Approve** (writes the weekly Autotask Time Ticket)
  or **Reopen** (sends it back to the employee to re-attest). Corrections are audited
  against the employee's attested original.
- **Admin approved** → **Payroll-approve** (finance, `time:payroll-approve`) authorizes
  payment. The app never pays.
- **Finance approved** → **Confirm payment** opens the QuickBooks match panel; confirm
  the matched payment id (suggested by the backend, or entered manually) to set **Paid**,
  or **Unapprove** to revert.
- **Paid** → shows the matched QuickBooks payment id (read-only).

The detailed correctness gate and payroll/Paid mechanics are unchanged — see
[Time approvals](timesheet-approvals.md) and [Payroll approval](payroll-approval.md)
for the per-step detail; both now open inside this surface.

## Security & privacy

No compensation data appears here — pay rate and expected pay live in a separate
payroll-role-gated store and never cross this surface (ADR-0082 §Security). Admins see
the correctness actions; finance sees the payroll actions; the unified table itself is
comp-free.
