# ADR-0082: Employee time tracking — website-authoritative timesheets, Autotask documentation, QuickBooks payment reconciliation

> **Amended by [ADR-0085](ADR-0085-qbo-payment-fact-purchase-simple-start.md) (2026-06-14):**
> the QuickBooks payment fact for Reconciliation #2 is the **`Purchase`** entity (bronze
> `qbo_purchases`, migration 0092), not `BillPayment` — Imperion's QBO is **Simple Start**
> (no Accounts Payable). Matching logic and the `qb_vendor_id` payee link are unchanged.

| Field | Value |
|---|---|
| **Repo** | frontend (schema + GUI + read-side reconciliation render); backend (Autotask Time Ticket write + QuickBooks read + reconciliation process); pipeline (bronze→silver merge); local-pipeline (scheduled Autotask TimeEntry + QuickBooks bulk pull) |
| **Status** | Accepted |
| **Date** | 2026-06-13 |
| **Cross-references** | ADR-0042 (four-repo contract), ADR-0039 (per-source bronze), ADR-0023/0012 (Autotask ticket mirror), ADR-0030/0016 (roles & identity), ADR-0062 (BI hub), backend ADR-0044 (executor idempotency), ADR-0038 (poll cadence) |

## Problem

Imperion has no employee time tracking. Employees (today all 1099 contractors) work
client and project tickets in Autotask and log per-ticket time there natively, but
there is no record of an employee's **gross attended time**, no weekly **attestation**,
no reconciliation between "I worked these hours" and "here is where the hours went,"
and no link from approved time to the **manual payment** that follows. The business
needs a weekly timesheet that an employee attests to, that an admin approves, that the
CFO approves for payroll, that documents into the system of record, and that is
verified paid against the books — performing at the level of dedicated time-tracking
products.

## Context

Two time signals exist and must be aligned:

1. **Gross attendance** — "clocked 3h" — has **no native home in Autotask**.
2. **Per-ticket allocation** — Autotask `TimeEntry` rows logged against tickets/project
   tasks as work is done — usually *less* total than attendance, scattered across
   tickets, in the same period.

Autotask natively has `Timesheet`/`TimeEntry`/`Resource`, but making Autotask the
authoritative *table* would fork the source of truth across four repos and fight the
bronze→silver discipline (ADR-0039). The existing `ticket` table is already an inbound
Autotask mirror (ADR-0023). The identity spine `app_user` (ADR-0016) carries no
Autotask Resource or QuickBooks vendor mapping. A `finance` role already exists
(ADR-0030). Payment is **manual** (the CFO pays contractors outside any system) and
lands in **QuickBooks**, which Imperion may read **read-only only**.

## Options considered

- **(1) Autotask as authoritative store.** Write timesheets/time entries into Autotask's
  native Timesheet/TimeEntry and read them back. Rejected: forks the SoR, no home for
  gross attendance, couples the model to Autotask's API shape.
- **(2) Imperion single pane — write everything to Autotask.** Employees enter all time
  (attendance + per-ticket) in Imperion; Imperion POSTs TimeEntries. Rejected for v1:
  double-entry against techs' existing Autotask habit, double-count risk, and it makes
  Imperion responsible for billable per-ticket data it does not own.
- **(3) Website-authoritative, Autotask-documented (chosen).** Attendance is entered and
  attested on the website (authoritative source); Autotask per-ticket time is read in as
  corroboration; the two normalize into one silver table; a weekly **summary** ticket
  documents the result in Autotask; QuickBooks read-only verifies payment.

## Decision

**Data model (per ADR-0039).** Two bronze sources — `website_*` (attendance blocks +
notes, entered on the site) and `autotask_*` (native `TimeEntry` rows) — normalize into
**one silver `time_record` table** discriminated by `source` (`website`/`autotask`) and
`kind` (`attendance`/`allocation`). **Website attendance is the authoritative source;**
Autotask allocation corroborates. A **Time Entry** is a day + start + end (duration
**calculated**, never typed) + notes + a category (`billable`→Ancillary Ticket /
`internal` / `admin`). Employees may have several per day.

**Timesheet & lifecycle.** The **Timesheet** is the weekly (**Monday–Sunday**),
per-employee container. Lifecycle **Open → Submitted → Approved → Payroll-Approved →
Paid**:
- **Submitted** — the employee **attests** (affirms true time). Attestation **hard-locks
  the employee out**; only admins edit thereafter. **Hard deviations must clear first.**
- **Approved** — an **admin** accepts (after any corrections, audited against the attested
  original) → triggers the **Time Ticket** write to Autotask.
- **Payroll-Approved** — the **CFO / admin** (`canApprovePayroll`) authorizes payment.
  Imperion does not pay.
- **Paid** — set when **Payroll Reconciliation** matches the timesheet to its authoritative
  QuickBooks payment.

**Reconciliation #1 — time (derived read model over `time_record`).** Per employee, per
day: attested attendance (envelope) vs same-period Autotask allocation, verdict
**Balanced / Under-logged / Over-logged**, with six **Deviations** — over-logged (Hard),
overlap (Hard), temporal orphan, under-logged gap, attended-nothing-logged,
logged-never-attended (Soft). Soft = attestable with a note; Hard = blocks attestation.
Tolerance configurable (default ~30 min/day). Surfaced **pre-attest** (the
memory-jogger reconstruction screen, seeded from the employee's Ancillary Tickets) and
on the admin approval view.

**Autotask write — documentation only.** **One idempotent Time Ticket per employee per
week** on Imperion's **own house company** (companyID a config value), in a dedicated
**Timesheets queue**, body = reconciled summary + **links** to the Ancillary Tickets. It
**does not re-create** the native TimeEntries, so summing Autotask never double-counts.
Re-approval updates the same ticket via its stored `external_ref` (backend ADR-0044
idempotency pattern).

**Reconciliation #2 — payroll.** **Expected pay** (approved hours under the employee's
effective **Pay Rate**) is lined up against the **authoritative QuickBooks payment**
(read-only). The match — employee + pay period + amount within tolerance — sets **Paid**.
QuickBooks is the system of record for the payment fact; Imperion only verifies a payment
it already holds.

**Employees & comp data.** An **Employee** is an `app_user` extended with an **Employee
Classification** (**1099** | **W2**), an **effective-dated Pay Rate**, and external
mappings to an **Autotask Resource** and a **QuickBooks vendor/employee** — joined by the
employee's **email**, consistent across all three systems (resolved id stored). **v1 is
all 1099**: paid the hourly Pay Rate directly, no withholding (gross = net), settled as a
QuickBooks **vendor/AP payment** — so amount reconciliation is exact. **W2** is modeled
but dormant (withholding → gross≠net, QuickBooks payroll record, overtime) until the
first W2 hire. Comp fields (classification, Pay Rate) live in a **separate
`employee_profile` + `pay_rate` store**, DB-grant-restricted to payroll roles —
**never** on the Entra-synced `app_user` row, never visible to the employee themselves,
agents, or any client-facing surface.

**Roles.** `canApprovePayroll` = `finance` ∨ `admin`. Pay Rate / labor-cost visibility =
`finance` ∨ `admin` only. **`admin` is the top tier — no `super_admin` role is added**
(decided 2026-06-13).

**Repo split (ADR-0042).** Frontend owns schema (migrations here) + the entry/attest/
approve/reconcile GUI + read-side render. Backend owns the Autotask Time Ticket write,
the QuickBooks read, and the reconciliation process. Pipeline owns the bronze→silver
`time_record` merge. Local-pipeline owns the scheduled Autotask `TimeEntry` and
QuickBooks bulk pull.

## Consequences

### Security impact

Compensation data (Pay Rate, classification, labor cost) is the highest-sensitivity data
this feature introduces. It is isolated in a payroll-role-gated store, never replicated
to the Entra-synced identity row, never exposed to the employee/agents/clients, and never
written to issues/PRs/logs (counts/aggregates only). QuickBooks is **read-only** — no
write path to the books exists. Autotask writes are confined to Imperion's own house
company (no client-account exposure). Attestation and admin corrections are fully audited
(attested original preserved). Never commit secrets — QuickBooks and Autotask credentials
are custodied in Key Vault per the unified security standard.

### Cost impact

New scheduled QuickBooks + Autotask TimeEntry pulls (cadence per ADR-0038). No new AI
spend. One extra Autotask ticket per employee per week (negligible).

### Operational impact

Requires: Imperion's Autotask house companyID + a Timesheets queue id (config);
**QuickBooks Online** read-only API connection (REST API — vendor/bill-payment data is
readable, so 1099 amount reconciliation is **exact**); per-employee Resource/vendor
mapping (auto-resolved by email, admin-confirmed once). Migrations proposed here are
**not prod-applied** until Mark runs them.

### Future considerations

- **W2 activation:** withholding (gross≠net), QuickBooks payroll source, overtime
  (FLSA 1.5×/40h), and `pto`/`holiday` categories — all modeled, dormant.
- **Live punch-clock** entry (v1 is manual start/end).
- **Gap-fill push** of website blocks as Autotask TimeEntries (v1 is read-only of
  allocation).
- **Block-level temporal matching** beyond sum-vs-sum within a day.
- **Efficiency analytics** (utilization = billable ÷ attended; labor cost = hours × rate;
  realization) in the BI hub (ADR-0062), gated to finance/admin.
- **W2 + QuickBooks payroll source** — v1 reconciles 1099 vendor/AP payments; W2 will
  read the QuickBooks Online payroll records instead.

**Resolved 2026-06-13 (Mark):** pulled into **v1** scope (despite the 2026-06-11 cutoff);
**`admin` is top tier** (no `super_admin`); **QuickBooks Online** (exact amount match).

**Amended 2026-06-13 (ADR-0083):** time **payment** aggregates **monthly** — weekly
timesheet capture/attest/approve is unchanged, but Payroll Approval and the Paid
reconciliation now happen in the **unified Monthly Close** (time + expenses) introduced by
ADR-0083, a single monthly finance task per employee. The weekly Timesheet remains the
attestation/approval unit; the monthly close is the payment unit.
