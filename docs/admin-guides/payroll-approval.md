# Payroll Approval — CFO guide

The payroll sign-off gate for employee timesheets (ADR-0082, #466). It now lives inside
the unified **[Time Administration](timesheet-administration.md)** surface
(`/timesheets/admin`, #539) — the standalone `/timesheets/payroll` route redirects there.
This guide describes the **payroll/Paid mechanics**; **finance or admin only**
(`time:payroll-approve`; hidden from other roles). This is the step *after* the admin
correctness approval ([Time approvals](timesheet-approvals.md)).

## The queue

Every timesheet an admin has **Approved** appears here, plus the later payroll
states so you can see the whole tail:

- **Approved** — cleared correctness, awaiting your payroll sign-off.
- **Payroll-approved** — you authorized payment; awaiting the QuickBooks match.
- **Paid** — matched to its QuickBooks payment (terminal).

Each row shows the employee, week, and **approved attendance hours**. No pay
rate, expected pay, or other compensation data appears on this surface — the
comp math runs in the backend alone (ADR-0082 §Security).

## Payroll-approving a week

On an **Approved** row, click **Payroll-approve**. The week moves to
**Payroll-approved**. This *authorizes* payment — **the app never pays**; payment
is made in your accounting system as usual.

If you payroll-approved by mistake (before payment), open the row (**Confirm
payment**) and click **Unapprove** to send it back to Approved.

## Marking a week Paid

Payment is reconciled against the authoritative **QuickBooks Online** payment for
the employee + period + amount (v1 employees are 1099 — gross = net, exact match).
The **backend Payroll Reconciliation** (BE #105) computes the match and suggests
it here.

On a **Payroll-approved** row, click **Confirm payment**:

- If the backend matched a QuickBooks payment, its id is pre-filled and the match
  detail is shown — review it and click **Confirm paid**.
- If the QuickBooks integration isn't wired in this environment (or no automatic
  match was found), enter the QuickBooks payment id manually and **Confirm paid**.
  Manual entry is acceptable for user testing (see the time/expense test plan).

Confirming records the payment id and moves the week to **Paid**.

## Notes

- QuickBooks reads are **read-only and authoritative for the payment fact only** —
  the app never initiates a payment (ADR-0082).
- The full QuickBooks match (expected hours × Pay Rate vs the QuickBooks payment)
  is a backend process; until it and the QuickBooks app registration are wired
  (both Mark-gated), this surface degrades to manual confirmation.
- No compensation data appears here (ADR-0082 §Security).
