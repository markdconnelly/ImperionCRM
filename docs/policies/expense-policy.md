# Employee Expense Policy

> **Source of record:** This document is the canonical Employee Expense Policy. It is
> published to **IT Glue** for employee access; this repository copy is the authoritative
> master. Update here first, then sync to IT Glue.

**Applies to:** All employees
**Currency:** USD only (multi-currency is out of scope)
**System:** Imperion Business Manager — monthly expense module (ADR-0083)

---

## 1. Purpose & scope

This policy governs reimbursement of business expenses personally incurred by employees.
Contractors (1099) do **not** use this flow — they bill expenses through their own
invoices. All amounts are in USD.

## 2. Monthly cycle & deadline

- Expenses are reported **monthly**.
- **Attest your prior-month expenses by the 5th of the following month.**
- Items submitted after the 5th **roll into the next month's report** — a closed month is
  not reopened.
- Expenses **older than 60 days** are not reimbursable.

## 3. Approval — every month, every report

There is **no pre-spend approval gate.** Every report is reviewed at close:
**admin-approve → finance-approve.** Submitting an expense is **not** a guarantee of
reimbursement until it clears both approvals.

## 4. Eligible categories

- Mileage
- Client / business meals
- Travel — airfare, lodging, ground transportation
- Parking & tolls
- Professional dues / certifications
- Business supplies
- Software / SaaS (business use)
- Conference / training fees

## 5. Never reimbursable

- Personal meals / entertainment
- Alcohol outside a client-meal context
- Traffic / parking fines
- Commuting miles
- Home-office furniture
- Personal subscriptions
- Anything without a business purpose
- Anything already billed directly to a client

## 6. Mileage

- Reimbursed at the **prevailing IRS standard business mileage rate.**
- **Business miles only** — your commute (home ↔ primary office) is not eligible.
- **No receipt required** (reimbursement is rate × miles).
- Record the **date, business purpose, and from/to** for each trip.

## 7. Receipts

- A receipt is **required for any single expense of $25 or more.** Under $25, a receipt is
  encouraged but a description suffices.
- **Mileage never requires a receipt.**
- The **receipt of record is the Autotask attachment.** The uploaded copy is transient and
  is purged after 90 days, so the Autotask copy is authoritative.

## 8. Billable to a client

Reimbursable and billable are **independent** — an expense may be reimbursed to you and/or
re-billed to a client.

- **Flag the client and the billable indicator when you submit.**
- The **approving admin makes the final billable determination** (the admin fires the
  idempotent Autotask ExpenseReport, which drives the client invoice).

## 9. Reimbursement timing

Approved reimbursements are paid via the **normal QuickBooks Online bill-payment run
following finance approval, targeting within ~10 business days of month-close finance
approval.** Payment goes to the **direct-deposit details on file** — reimbursements are
**not** paid through payroll (they are kept off the wage line).

## 10. Attestation

At attest, you certify that **every line is a real, business-purpose expense you personally
incurred, that has not been reimbursed elsewhere, and that is accurately categorized and
billed.** Knowingly false or inflated claims are grounds for **clawback and disciplinary
action up to and including termination.**

---

*Maintained under epic #482 (Employee Expense Tracking & Reimbursement, ADR-0083). Closes #493.*
