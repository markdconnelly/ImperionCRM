# Payroll approval — CFO / finance guide

> **Audience:** finance / CFO. **Surface:** the **payroll gate inside**
> [Time administration](timesheet-administration.md) (`/timesheets/admin`); the
> standalone `/timesheets/payroll` route redirects there. **Access:** **finance ∨
> admin** — `canApprovePayroll` / the **`time:payroll-approve`** capability (hidden
> from other roles). Decision record: **ADR-0082**. Issue: **#466**.
>
> [← Admin guides](README.md) · [Time administration](timesheet-administration.md) ·
> [Time approvals](timesheet-approvals.md)

## What this is

This is the **payroll sign-off gate** — the finance step *after* the admin
[correctness approval](timesheet-approvals.md). It authorizes payment for a week that
has cleared correctness and then records the QuickBooks payment that settled it. It
is the second of the two [Time administration](timesheet-administration.md) gates.

> **The application never pays.** Payroll approval *authorizes* a manual payment and
> *records* the matched QuickBooks payment; QuickBooks reads are **read-only and
> authoritative for the payment fact only** (ADR-0082).

## The queue

Every timesheet an admin has **Approved** appears here, plus the later payroll states
so you can see the whole tail:

- **Approved** — cleared correctness, awaiting your payroll sign-off.
- **Payroll-approved** — you authorized payment; awaiting the QuickBooks match.
- **Paid** — matched to its QuickBooks payment (terminal).

Each row shows the employee, week, and **approved attendance hours**. **No pay rate,
expected pay, or other compensation data appears on this surface** — the comp math
runs in the backend alone (ADR-0082 §Security).

## Payroll-approving a week

On an **Approved** row, **Payroll-approve** authorizes payment and moves the week to
**Payroll-approved**. To back out, **Unapprove** sends it back to Approved.

## Marking a week Paid

Payment is reconciled against the authoritative **QuickBooks Online** payment for the
employee + period + amount (v1 employees are 1099 — gross = net, exact match). The
**backend Payroll Reconciliation** (BE #105) computes the match and suggests it here.

On a **Payroll-approved** row, click **Confirm payment**:

- If the backend matched a QuickBooks payment, its id is pre-filled and the match
  detail is shown — review it and click **Confirm paid**.
- If the QuickBooks integration isn't wired in this environment (or no automatic
  match was found), enter the QuickBooks payment id manually and **Confirm paid**.
  Manual entry is acceptable for user testing (see the time/expense test plan).

Confirming records the payment id and moves the week to **Paid**.

```mermaid
flowchart LR
    APP["Approved<br/>(correctness cleared)"] -->|Payroll-approve| PA["Payroll-approved"]
    PA -->|Confirm payment<br/>(QuickBooks match)| PAID["Paid"]
    PA -.->|Unapprove| APP
```

## Notes

- **QuickBooks reads are read-only** and authoritative for the **payment fact only** —
  the app never initiates a payment (ADR-0082).
- The full QuickBooks match (expected hours × Pay Rate vs the QuickBooks payment) is
  a **backend** process. Until it and the QuickBooks app registration are wired (both
  Mark-gated), this surface degrades to **manual confirmation**.
- **No compensation data appears here** (ADR-0082 §Security) — see the
  [unified security standard](../security/unified-security-standard.md).
