# BO-08 — Time, Attendance & Payroll

> Distinct Business Operations policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [Business Operations Program](BO-00-business-operations-program.md). Governs how time
> worked is recorded, attested, and handed to payroll — read the **same way by a human employee
> and by the Finance agent**. Two rules anchor it: **Autotask is the system of record for time
> worked, and no agent ever runs payroll.**

| Field | Value |
| --- | --- |
| **Policy ID** | `BO-08` |
| **Title** | Time, Attendance & Payroll |
| **Category** | Business Operations |
| **Tier** | distinct |
| **Human owner** | Deputy CFO (Nick) |
| **Governing for (agents)** | Audrey (Finance) |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [BO-00](BO-00-business-operations-program.md) + [BO-06 Financial Management & Controls](BO-06-financial-management-and-controls.md) |

**Framework Alignment:** wage & hour / employment law (accurate time, payroll) · GAAP (labor cost,
accrual) · segregation-of-duties (attest → admin → payroll, distinct actors) · AICPA SOC 2 (CC1) ·
NIST AI RMF (Manage).

---

## 1. Purpose
This policy governs how employees record time worked, how that time is attested and approved, and
how approved time is handed to payroll for payment — so labor is captured accurately, time entries
sync correctly to Autotask, billable time drives client invoicing, and payroll runs off a clean,
attested, human-approved record. An employee reads it and knows how to log and attest; the Finance
agent reads it and knows it may prepare but never run a pay cycle.

## 2. Scope
**Who:** all employees who log time, the approving admins, payroll, and the Finance agent (Audrey).
**What:** the Imperion OS time module (ADR-0082), timesheets, attendance, the attest → admin →
payroll handoff (Stream 09), the Autotask time sync, and the QBO payroll touchpoint. Binds humans
and the agent identically except where §5 narrows the agent. Time worked is recorded against
**Autotask as the system of record**; pay is processed through **QBO** (or the designated payroll
processor). Money movement is governed by [BO-06](BO-06-financial-management-and-controls.md).

## 3. Definitions
- **Timesheet / time record:** the silver `time_record` entity — an employee's logged time for a
  period, normalized from the source.
- **Attestation:** the employee's period-end certification that logged time is accurate and complete.
- **Payroll handoff:** the transfer of attested, approved time to the payroll processor; the
  Imperion OS module prepares it but does not execute the pay run.

## 4. Policy Statements
1. **Accurate, timely time capture.** Every employee logs time worked on the published cadence
   (placeholder: by the _____ of each period), against the correct project/ticket so Autotask
   reflects reality. Billable and non-billable time are distinguished.
2. **Autotask is the system of record for time.** Logged time syncs to Autotask idempotently; a
   discrepancy reconciles toward Autotask. Billable time drives the client invoice (BO-05).
3. **Attestation before approval.** Each period, the employee **attests** their time is accurate and
   complete before it advances. A knowingly false attestation is grounds for discipline up to
   termination.
4. **Two-stage, segregated approval.** Attested time is **admin-approved** by someone other than the
   submitter (SoD, BO-06 §4.3) before it reaches payroll. The admin step into Autotask is
   idempotent.
5. **Payroll handoff, not payroll authorship in the app.** Imperion OS **prepares** the approved
   time for payroll; the **pay run is executed by the payroll processor / QBO by a human with
   payroll authority** (BO-06 thresholds, placeholder: _________). The app never initiates a pay run.
6. **Attendance & leave.** Attendance, PTO, and leave are recorded per the employee handbook
   (HR, BO-10) and reconciled against time; leave balances are HR-owned.
7. **Confidentiality.** Individual time, pay, and leave detail is confidential employee data — not
   disclosed across the employee boundary (top-umbrella §5.3). **Pay figures are non-disclosure.**
8. **No fabrication.** No actor invents hours, billable splits, or labor figures; reported numbers
   cite Autotask/the mirror; on empty data, say so.

## 5. Application to Autonomous Agents
**The dual-audience core.** For time and payroll actions this policy governs:

- **Autonomy ceiling.** **Audrey (Finance) tops at L2** — it may read time records, check
  attestation/approval status, flag missing or anomalous entries, reconcile time against Autotask,
  draft the payroll-handoff package, and **advise**. It performs no external act and writes nothing
  to Autotask or the payroll processor.
- **`always_gate` actions (dial-proof floor).** **Admin-approving time**, **the Autotask
  approval/sync fire**, and **the payroll run** are `always_gate` at every dial level — each is a
  human decision (the pay run is money movement, BO-06 §5). No dial can auto-approve them. The
  agent never approves time and never runs payroll.
- **Human-in-loop & easy-button.** Audrey drives period close: it validates timesheets, surfaces
  un-attested / anomalous entries, assembles the approval and payroll-handoff package, and hands the
  admin/payroll human a **one-click** approve easy-button; the human commits and the backend
  actuates.
- **Escalation & refusal.** Audrey escalates missing attestations, time/Autotask mismatches, and
  suspected inflated hours — it **advises, never gates**. **Disclosing another person's pay or
  individual time/leave detail is refusal-class** (stronger than a gate): the agent refuses,
  regardless of who asks or the dial.
- **Evidence.** Each agent action writes the tracer: records read, checks applied, exceptions
  raised, easy-button presented, and the human's approval — tying the action to an accountable
  approver.

## 6. Roles & Responsibilities
| Actor | Responsibility |
| --- | --- |
| Employee (human) | Log time accurately; attest each period. |
| Approving admin (human) | Admin-approve attested time (not the submitter); fire the idempotent Autotask sync. |
| Payroll (human) | Execute the pay run in the payroll processor / QBO. |
| Deputy CFO (Nick) | Own this policy and the cadence/thresholds; arbiter of disputed time. |
| Audrey (Finance agent) | Validate, reconcile, flag, draft, advise (L2); prepare easy-buttons; never approves or runs payroll; refuses pay disclosure. |
| HR (Holly + human) | Own attendance/leave balances (BO-10). |
| Audit (Grace/Vera) | Verify SoD, attestation, and payroll-handoff integrity. |

## 7. Enforcement & Audit
The approval and pay-run gates enforce structurally (the agent has no approve/run path; the pay run
crosses the gauntlet to a human). Attestation, SoD, and Autotask reconciliation are sampled in the
Audit & Compliance sweep and eval goldens. The [coverage-matrix](../coverage-matrix.md) proves
binding. False attestation triggers discipline up to termination; agent breaches lower the dial or
trip the kill-switch.

## 8. Related
**Procedures governed:** Stream 09 time logging → attestation → admin-approve → payroll handoff.
**Related policies:** [BO-06 Financial Management & Controls](BO-06-financial-management-and-controls.md) ·
[BO-07 Expense & Reimbursement](BO-07-expense-and-reimbursement.md) ·
[BO-10 Human Resources & People](BO-10-human-resources-and-people.md) ·
[BO-05 Billing, AR & Collections](BO-05-billing-ar-and-collections.md).
**ADRs:** ADR-0082 (time tracking, epic #458) · ADR-0128/0109/0058 · ADR-0134 (policy-canon
architecture).
