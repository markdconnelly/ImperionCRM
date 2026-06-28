# BO-07 — Expense & Reimbursement

> Distinct Business Operations policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [Business Operations Program](BO-00-business-operations-program.md). Governs
> reimbursement of business expenses personally incurred by employees — read the **same way by a
> human employee and by the Finance agent**. Migrates and supersedes the legacy
> `docs/policies/expense-policy.md` (issue #493) into the policy-canon template. The legacy copy
> remains the IT Glue–published employee-facing text until re-pointed; this is the authoritative
> master (ADR-0083).

| Field | Value |
| --- | --- |
| **Policy ID** | `BO-07` |
| **Title** | Expense & Reimbursement |
| **Category** | Business Operations |
| **Tier** | distinct |
| **Human owner** | Deputy CFO (Nick) |
| **Governing for (agents)** | Audrey (Finance) |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [BO-00](BO-00-business-operations-program.md) + [BO-06 Financial Management & Controls](BO-06-financial-management-and-controls.md) |

**Framework Alignment:** GAAP (expense recognition, substantiation) · segregation-of-duties
(two-stage approval, distinct from submitter) · AICPA SOC 2 (CC1) · NIST AI RMF (Manage).

---

## 1. Purpose
This policy governs reimbursement of business expenses an employee personally incurs. It sets the
cycle and deadline, what is and is not reimbursable, the receipt and substantiation rules, the
two-stage approval, and the attestation an employee makes — so reimbursements are accurate,
business-purposed, billed correctly, and paid off the wage line. A new hire reads it and knows how
to submit; the Finance agent reads it and knows what it may and may not do.

## 2. Scope
**Who:** all **employees** (W-2). **Contractors (1099) do not use this flow** — they bill expenses
through their own invoices. **Currency:** USD only (multi-currency is out of scope). **What:** the
Imperion OS monthly expense module (ADR-0083), the Operating Procedures for expense submission →
attestation → admin-approve → finance-approve → reimbursement (Stream 09), and the Autotask /
QBO touchpoints. Binds humans and the Finance agent identically except where §5 narrows the
agent's authority. Money movement here is governed by [BO-06](BO-06-financial-management-and-controls.md).

## 3. Definitions
- **Attestation:** the employee's certification at submit that every line is real, business-purposed,
  personally incurred, not reimbursed elsewhere, and accurately categorized and billed.
- **Receipt of record:** the **Autotask attachment** — authoritative. The copy uploaded into the
  module is transient and purged after 90 days.
- **Billable vs reimbursable:** independent attributes — an expense may be reimbursed to the
  employee and/or re-billed to a client.

## 4. Policy Statements
1. **Monthly cycle and deadline.** Expenses are reported **monthly**. An employee **attests
   prior-month expenses by the 5th of the following month.** Items submitted after the 5th **roll
   into the next month's report** — a closed month is not reopened. **Expenses older than 60 days
   are not reimbursable.**
2. **Approval — every month, every report.** There is **no pre-spend approval gate**; every report
   is reviewed at close: **admin-approve → finance-approve.** Submission is not a guarantee of
   reimbursement until it clears both. The approver is never the submitter (SoD, BO-06 §4.3).
3. **Eligible categories:** mileage · client/business meals · travel (airfare, lodging, ground
   transportation) · parking & tolls · professional dues / certifications · business supplies ·
   software / SaaS (business use) · conference / training fees.
4. **Never reimbursable:** personal meals / entertainment · alcohol outside a client-meal context ·
   traffic / parking fines · commuting miles · home-office furniture · personal subscriptions ·
   anything without a business purpose · anything already billed directly to a client.
5. **Mileage.** Reimbursed at the **prevailing IRS standard business mileage rate** — business
   miles only (home ↔ primary-office commute is not eligible). **No receipt required** (rate ×
   miles); record the **date, business purpose, and from/to** for each trip.
6. **Receipts.** A receipt is **required for any single expense of $25 or more**; under $25 a
   receipt is encouraged but a description suffices. **Mileage never requires a receipt.** The
   **Autotask attachment is the receipt of record** (§3).
7. **Billable to a client.** Reimbursable and billable are independent. The submitter **flags the
   client and the billable indicator** at submit; the **approving admin makes the final billable
   determination** (firing the idempotent Autotask ExpenseReport, which drives the client invoice).
8. **Reimbursement timing & method.** Approved reimbursements are paid via the **normal QBO
   bill-payment run following finance approval**, targeting **within ~10 business days of
   month-close finance approval**, to the **direct-deposit details on file**. Reimbursements are
   **not paid through payroll** — they are kept off the wage line.
9. **Attestation & integrity.** At attest the employee certifies every line per §3. **Knowingly
   false or inflated claims are grounds for clawback and disciplinary action up to and including
   termination.**

## 5. Application to Autonomous Agents
**The dual-audience core.** For expense actions this policy governs:

- **Autonomy ceiling.** **Audrey (Finance) tops at L2** — it may read submitted reports, check them
  against this policy (category eligibility, $25 receipt rule, 60-day age, mileage substantiation),
  flag exceptions, draft the admin/finance approval package, and **advise**. It performs no
  external act and writes nothing to QBO or Autotask.
- **`always_gate` actions (dial-proof floor).** **Approving a report** (admin-approve,
  finance-approve), **the billable determination / Autotask ExpenseReport fire**, and **the QBO
  reimbursement payment** are `always_gate` at every dial level — each is a human decision
  (money movement, BO-06 §5). The agent never approves an expense and never pays one.
- **Human-in-loop & easy-button.** Audrey drives the close: it validates each report, surfaces the
  exceptions and the recommended billable flags, and hands the admin/finance approver a **one-click**
  approve easy-button with the package assembled; the human commits and the backend actuates.
- **Escalation & refusal.** Audrey escalates suspected false/inflated lines, policy-ineligible
  items, and missing receipts rather than silently rejecting — it **advises, never gates**. It does
  not disclose one employee's expense detail to another (PII / confidentiality, top-umbrella §5.3).
- **Evidence.** Each agent action writes the tracer (`agent_run`/`agent_message`): the lines read,
  the policy checks applied, the exceptions raised, the easy-button presented, and the human's
  decision — tying the action to an accountable approver.

## 6. Roles & Responsibilities
| Actor | Responsibility |
| --- | --- |
| Employee (human) | Submit, substantiate, flag client/billable, attest by the 5th. |
| Approving admin (human) | Admin-approve; make the final billable determination; fire the Autotask ExpenseReport. |
| Finance (human) | Finance-approve; run the QBO reimbursement bill-pay to direct deposit. |
| Deputy CFO (Nick) | Own this policy, the categories/limits, and the cadence; arbiter of disputed claims. |
| Audrey (Finance agent) | Validate, flag, draft, advise (L2); prepare easy-buttons; never approves or pays. |
| Audit (Grace/Vera) | Verify SoD, receipt substantiation, and clawback follow-through. |

## 7. Enforcement & Audit
The approval and payment gates enforce structurally (the agent has no approve/pay path; money
movement crosses the gauntlet to a human). Substantiation, the 60-day rule, the $25 receipt
threshold, and attestation integrity are sampled in the Audit & Compliance sweep and the eval
goldens. The [coverage-matrix](../coverage-matrix.md) proves binding. False attestation triggers
clawback and discipline up to termination (§4.9); agent breaches lower the dial or trip the
kill-switch.

## 8. Related
**Procedures governed:** Stream 09 expense submission → attestation → approve → reimburse.
**Related policies:** [BO-06 Financial Management & Controls](BO-06-financial-management-and-controls.md) ·
[BO-08 Time, Attendance & Payroll](BO-08-time-attendance-and-payroll.md) ·
[BO-05 Billing, AR & Collections](BO-05-billing-ar-and-collections.md).
**ADRs:** ADR-0083 (expense tracking, epic #482, closes #493) · ADR-0128/0109/0058 ·
ADR-NNNN (policy-canon architecture). **Legacy source migrated:** `docs/policies/expense-policy.md`.
