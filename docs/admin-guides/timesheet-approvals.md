# Time Approvals — admin guide

The admin correctness gate for employee timesheets (ADR-0082). Surface:
**Time Approvals** in the left nav (`/timesheets/approvals`) — **admin-only**
(`time:approve`; hidden from non-admins).

## The queue

Every timesheet an employee has **attested** (Submitted) appears here, oldest
first, with the employee, week, attended hours, entry count, and attest date.
Click **Review** to open it.

## Reviewing a week

The review panel shows the attested entries day by day (read-only) alongside the
**Reconciliation** — attended vs same-day Autotask allocation, with the daily
verdict (Balanced / Under-logged / Over-logged). A residual **Hard deviation**
warning appears if one slipped through.

Two actions:

- **Approve & document** — moves the week to **Approved** and **requests** the
  single weekly **Time Ticket** write to Autotask (Imperion's house company,
  Timesheets queue). The request is idempotent (one ticket per employee per week);
  the actual Autotask write is performed by the backend Time Ticket writer, so
  re-approval updates the same ticket rather than duplicating it. Approval does
  **not** pay — payroll approval is a separate, finance-gated step.
- **Reopen** — sends the week back to the employee (→ Open): the attest/approve
  stamps clear and the employee must re-enter and re-attest. The attested original
  is preserved for audit, and any Time Ticket row is kept so a later re-approval
  re-writes the same ticket.

## Correcting time

In this version, a week that needs changes is **Reopened** for the employee to
fix. Direct admin in-place correction — editing entries against the attested
original with an audited diff — is tracked as a follow-up (issue #477).

## Notes

- The Autotask Time Ticket write and QuickBooks payment reconciliation live in the
  backend; this surface only documents the approval intent.
- No compensation data appears here (ADR-0082 §Security).
