---
adr: 0083
title: "Employee expense tracking — website-authoritative monthly expense reports, MileIQ mileage, Autotask documentation, QuickBooks reimbursement reconciliation"
status: accepted
date: 2026-06-13
repo: frontend
summary: "Data model (per ADR-0039)."
tags: [finance]
consolidated_into: ADR-0093
---
# ADR-0083: Employee expense tracking — website-authoritative monthly expense reports, MileIQ mileage, Autotask documentation, QuickBooks reimbursement reconciliation

> Consolidated into [ADR-0093](ADR-0093-employee-finance-consolidated.md). Retained for history.

> **Amended by [ADR-0085](ADR-0085-qbo-payment-fact-purchase-simple-start.md) (2026-06-14):**
> the QuickBooks reimbursement fact is the **`Purchase`** entity (bronze `qbo_purchases`,
> migration 0092), not `BillPayment` — Imperion's QBO is **Simple Start** (no Accounts
> Payable). The reimbursement → **Reimbursed** matching and the `qb_vendor_id` payee link
> are unchanged.

| Field | Value |
|---|---|
| **Repo** | frontend (schema + GUI + read-side reconciliation render); backend (Autotask ExpenseReport/attachment write + verify, MileIQ OAuth custody + QuickBooks read + reconciliation process); pipeline (bronze→silver merge); local-pipeline (scheduled MileIQ drive pull + QuickBooks bulk pull + receipt-blob lifecycle) |
| **Status** | Accepted |
| **Date** | 2026-06-13 |
| **Cross-references** | ADR-0082 (time tracking — sibling; this ADR reuses its comp store, identity spine, role gates, and amends its payment cadence), ADR-0042 (four-repo contract), ADR-0039 (per-source bronze), ADR-0044 backend (executor idempotency), ADR-0030/0016 (roles & identity), ADR-0038 (poll cadence), ADR-0062 (BI hub), ADR-0043 (settled AI stack — Claude vision for deferred OCR) |

## Problem

Imperion has no employee expense tracking. Employees (today all 1099 contractors)
incur reimbursable costs — out-of-pocket purchases (meals, parking, tools, travel,
software) and business mileage — with no record, no receipts captured, no approval,
no link from an approved expense to the **manual reimbursement** that follows, and no
way to pass a billable expense through to the client it was incurred for. The business
needs a monthly expense report an employee attests to, that an admin approves, that the
CFO approves for payment, that documents into the system of record, and that is verified
reimbursed against the books — performing at the level of a dedicated expense product
(Expensify/Concur tier).

## Context

Expenses rhyme with time tracking (ADR-0082) but break from it in two ways:

1. **Receipts.** Out-of-pocket expenses carry receipt evidence; time entries do not.
2. **Two money legs.** An expense can be **reimbursable to the employee** (they paid
   personally) *and* **billable to the client** (passed through on the client's
   invoice). These are independent — an item can be both. Time has only the one
   leg (pay the employee).

Two ingestion signals exist and must normalize together:

1. **Mileage** — captured automatically by **MileIQ** (GPS auto-detection, employee
   swipes business/personal). MileIQ exposes a read-only OAuth 2.1 External API
   (`drives:read:all`); access is request-gated and per-user (Authorization Code
   flow). MileIQ is authoritative for the **miles** fact but **not** the dollar value
   — the reimbursement *rate* is a company-comp decision.
2. **Out-of-pocket** — entered manually on the website with a receipt attached.

Autotask natively has `ExpenseReports`/`ExpenseItems` with native mileage fields
(`miles`/`origin`/`destination`/`odometer*`), an `isBillableToCompany` flag with
`companyID`/`projectID`/`ticketID` links, `ExpenseItemAttachments` for receipts, and a
lifecycle (`In Progress → Awaiting Approval → Approved for Payment → Rejected → Paid →
Transferred to QuickBooks`). As with time (ADR-0082), making Autotask the authoritative
*table* would fork the source of truth across four repos and fight the bronze→silver
discipline (ADR-0039). QuickBooks holds the categories (chart of accounts) and the
**manual** reimbursement payment, and Imperion may read it **read-only only** (app never
pays — ADR-0082). The identity spine `app_user`, the payroll-gated comp store
(`employee_profile`/`pay_rate`, ADR-0082 migration 0085), and the `finance` role gate
already exist and are reused here.

## Options considered

- **(1) Autotask as authoritative store.** Write expense reports/items into Autotask's
  native entities and read them back. Rejected: forks the SoR, no clean home for the
  website-attested/MileIQ-sourced model, couples to Autotask's API shape.
- **(2) Reimbursement folded into the payroll wage.** Add the approved reimbursable
  total to the employee's 1099 payroll payment. Rejected: reimbursements are
  non-taxable and book as AP, not wages; mixing them breaks the exact
  expected-vs-QuickBooks amount match that ADR-0082 relies on.
- **(3) Website-authoritative, Autotask-documented, separate AP reimbursement
  (chosen).** MileIQ + manual entry normalize into one silver table; a monthly report
  is attested on the website (authoritative); a per-employee-per-month Autotask
  ExpenseReport documents the result and carries billable items to the client invoice;
  QuickBooks read-only verifies a **separate** AP bill-payment reimbursement.

## Decision

**Data model (per ADR-0039).** Two bronze sources — `mileiq_drive` (auto-pulled
drives) and `website`/manual out-of-pocket entries — normalize into **one silver
`expense_item` table** discriminated by `source` and `kind` (`mileage` |
`out_of_pocket`). **The website-attested value is authoritative;** MileIQ is
authoritative for the **miles** fact only. An expense item carries: date, category,
amount (calculated for mileage = miles × effective rate), merchant/description, a
**reimbursable** flag, a **billable** flag with an optional `companyID`/project/ticket
link, and (for out-of-pocket) a receipt reference.

**Expense Report & lifecycle.** The **Expense Report** is the **monthly**,
per-employee container — required only when the employee incurred ≥1 expense that
month; no expenses, no report. Lifecycle **Open → Submitted → Approved →
Finance-Approved → Reimbursed** (+ **Rejected → reopen → re-attest**):
- **Submitted** — the employee **attests**, which **hard-locks the employee out**;
  only admins edit thereafter. **Every out-of-pocket item must have a receipt** and
  **hard policy violations must clear first**. (Mileage is receipt-exempt — MileIQ is
  the evidence.)
- **Approved** — an **admin** accepts (after any corrections, audited against the
  attested original) → triggers the **idempotent Autotask ExpenseReport** write.
- **Finance-Approved** — the **CFO / admin** (`canApprovePayroll`) authorizes payment.
  Imperion does not pay.
- **Reimbursed** — set when **Reimbursement Reconciliation** matches the report to its
  authoritative QuickBooks **bill-payment**.

**Policy/violation engine (derived read model, configurable).** Evaluated **per item,
pre-attest** and surfaced as a memory-jogger (mirrors ADR-0082's reconciliation
screen). **Hard (block attest):** missing receipt on an out-of-pocket item; amount over
a category hard-cap; future-dated or dated outside the report month. **Soft (attest with
a note):** suspected duplicate (merchant+amount+date); amount over a soft threshold;
billable item missing a `companyID`; uncategorized/"Other". Caps, thresholds, and the
category set are **admin-configurable in-app** (not hardcoded); each violation **links to
the canonical company expense policy in IT Glue** (authored separately — a business
deliverable).

> **Amendment 2026-06-18 (#895): the hard gate is enforced server-side at attest.**
> The hard-violation rules above are computed in `src/lib/expenses/policy.ts`
> (`itemHardViolationReason` / `hasHardViolation`) and the **`attestExpenseReportAction`
> server action refuses the Open → Submitted transition while any hard violation is
> present** — the authoritative enforcement, not just a memory-jogger. This mirrors
> **ADR-0082's shared attestation-gate pattern** (the timesheet attest refuses while
> `hasHardDeviation` is true). The employee surface (`/expenses`) disables Attest and
> flags the offending rows; the admin review (`expense-review.tsx`) recomputes the gate
> on the live post-correction items and flags residual violations before approval. Prior
> to this fix the gate was unwired (the helper existed but no caller invoked it), so a
> report could be attested with hard violations present.

**Categories — hard-linked to QuickBooks.** The chart of accounts in QuickBooks is the
category SoR. `qbo_expense_account` is **read** and synced to bronze; an admin
**maps** each QuickBooks account to a clean, user-facing `expense_category` (hard FK to
the QuickBooks account) with caps, soft threshold, billable-default, Autotask
`expenseCategory` id, and a visibility toggle. When a needed category is absent in
QuickBooks, the app **detects and prompts**; finance **creates it in QuickBooks
manually**; the app **re-syncs** and it becomes mappable. **Mileage is a system
category** (rate-driven, receipt-exempt). QuickBooks is **never written** by the app.

**Mileage — MileIQ, rate owned by Imperion.** A scheduled per-connected-employee pull
lands business-classified drives in `mileiq_drive` bronze → silver
`expense_item(kind=mileage)`. The reimbursement **amount = miles × effective mileage
rate**, where the rate is **effective-dated and configurable**, stored in the
payroll-gated comp store beside `pay_rate`, **defaulting to MileIQ's suggested rate**
(captured per drive) and **overridable on a system basis**. Personal drives never enter.
MileIQ access is **per-user OAuth (read-only)**; the employee connects once (an
onboarding step); the backend custodies the refresh token in Key Vault. (The Teams
group API — one admin consent for the whole group — is modeled-dormant pending GA.)

**Receipts.** Captured by **web upload** (v1; native mobile + Claude-vision OCR
pre-fill are modeled-dormant, deferred per ADR-0043) to a **private Azure storage
account**. On approval the receipt is pushed to Autotask as an **ExpenseItemAttachment**
and **verified stored** (read-back). A **90-day blob lifecycle** then deletes the
storage-account copy — Autotask becomes the durable receipt SoR — **guarded** so a
receipt **not yet verified-in-Autotask is retained/flagged, never silently deleted**.

> **Write path wired (#200/#899, 2026-06-19).** The custody boundary follows ADR-0042: the
> **backend owns the bytes**, the **front end owns the row**. The web app holds NO storage
> credential — its drag/drop upload control (on a receipt-less out-of-pocket line in the
> expense list) streams the file to the caller-gated backend endpoint
> `POST /api/expense/receipts/upload` (headers `content-type`, `x-filename`,
> `x-actor-user-id`; PDF + images ≤ 25 MiB, AV-scanned + sha256'd → private `receipts`
> blob, BE #200), then inserts the `receipt_attachment` row from the returned
> `{blobPath, contentHash, byteSize, contentType}` and links `expense_item.receipt_id`
> (self-scoped `expense:write`, lock + ownership + Open re-check). v1 is upload-only — no
> OCR. Attaching a receipt clears the `missing_receipt` HARD gate so the item becomes
> attestable. When the backend is unconfigured/refuses the file, the surface degrades to a
> notice (ADR-0018 graceful degradation), never a 500.

**Autotask write — documentation + billing pass-through.** **One idempotent
ExpenseReport per employee per month** (re-approval updates the same report via its
stored `external_ref`, backend ADR-0044). **Billable** items carry
`isBillableToCompany=true` + `companyID` (+ project/ticket), so Autotask's billing
engine handles the **client invoice** — Imperion does not invoice clients directly.
**Pass at cost in v1** (no Imperion-side markup; deferred to v2).

**Reimbursement Reconciliation.** **Expected** = the approved **reimbursable** total;
lined up against the **authoritative QuickBooks bill-payment** (read-only). The match —
employee + period + amount within tolerance — sets **Reimbursed**. A mismatch/partial is
an **exception**, surfaced in the monthly close, blocking auto-Reimbursed until a human
resolves. Reimbursements book as **separate AP bills** (non-taxable), distinct from the
payroll wage.

**Unified Monthly Close (amends ADR-0082).** Approval + payment is a **single monthly
task** covering **both time and expenses**. The **Monthly Close** surface lists, per
employee per month: aggregated time total (weekly timesheets rolled up) + reimbursable
expense total, both QuickBooks match statuses, and open obligations (approved-but-not-
yet-confirmed-paid). This amends ADR-0082 so that time **payment** aggregates monthly
(weekly capture → monthly pay); the weekly timesheet capture/attest/approve cadence is
unchanged.

**Employees, comp & billable legs.** An **Employee** reuses the ADR-0082 extension of
`app_user`, with one added external mapping: a **MileIQ user id** (joined by email,
consistent with the Autotask Resource + QuickBooks vendor mappings). The mileage rate
joins the existing payroll-gated comp store. **Reimbursable and billable are independent
legs**: a billable out-of-pocket item is **both** reimbursed to the employee **and**
billed to the client.

**Roles.** `expense:write` (self-scoped, all roles — employeeId from session, not the
form; lock re-checked server-side). `expense:approve` (admin). Finance authorization
reuses `canApprovePayroll` = `finance` ∨ `admin`. Expense amounts + receipts: employee
sees **own only**; `finance`/`admin` see all. The mileage rate follows the same
payroll-role gating as `pay_rate`. **`admin` is the top tier — no `super_admin`.**

**Repo split (ADR-0042).** Frontend owns schema (migrations here) + the entry/attest/
approve/map/close GUI + read-side render. Backend owns the Autotask ExpenseReport +
attachment write/verify, the MileIQ OAuth custody + callback, the QuickBooks read
(categories + bill-payment match), and the reconciliation process. Pipeline owns the
bronze→silver `expense_item` merge. Local-pipeline owns the scheduled MileIQ drive pull,
the QuickBooks bulk pull, and the receipt-blob 90-day lifecycle enforcement.

## Consequences

### Security impact

Receipts and expense amounts are PII; the mileage rate is compensation data. Receipts
live in a private storage account, access-gated to owner + `finance`/`admin`, pushed to
Autotask then lifecycle-deleted (guarded on verified-stored), never logged. The mileage
rate is isolated in the payroll-role-gated comp store, never on the Entra-synced
identity row, never exposed to the employee/agents/clients. QuickBooks is **read-only**
everywhere — no write path to the books, the chart of accounts, or payments exists; the
app only ever verifies a reimbursement QuickBooks already holds. Autotask writes are
confined to the employee's own ExpenseReport (billable items reference real client
companies — `companyID` is the only client linkage, no client PII copied). MileIQ access
is read-only OAuth; tokens are custodied in Key Vault. Attestation and admin corrections
are fully audited (attested original preserved). Never commit secrets — MileIQ,
QuickBooks, and Autotask credentials are custodied in Key Vault per the unified security
standard. Comp/amount data is never written to issues/PRs/logs (counts/aggregates only).

### Cost impact

New scheduled MileIQ + QuickBooks pulls (cadence per ADR-0038). One private storage
account for transient receipt blobs (90-day retention). No new AI spend in v1 (OCR
deferred). One Autotask ExpenseReport per employee per month (negligible).

### Operational impact

Requires: a **MileIQ External API** credential (request-gated — apply); each employee
**connects MileIQ once** (OAuth onboarding); the **QuickBooks Online** read scope
extended to chart-of-accounts + bill-payments (reuse the ADR-0082 app); a **private
Azure storage account** + 90-day lifecycle rule; the **company expense policy authored
in IT Glue**; per-employee MileIQ-user mapping (auto-resolved by email, admin-confirmed).
Migrations proposed here are **not prod-applied** until Mark runs them.

### Future considerations

- **Receipt OCR** (Claude-vision SmartScan pre-fill — settled stack, ADR-0043), and
  native mobile capture.
- **MileIQ Teams group API** (one admin consent for the whole group) once it leaves beta.
- **QuickBooks write** (auto-create the draft AP bill) — would cut manual work but
  requires a new ADR (v1 keeps QuickBooks strictly read-only).
- **Markup on billable expenses** (v1 passes at cost).
- **Company-card and per-diem** expense kinds (v1 is out-of-pocket + mileage).
- **W2 activation** — reimbursements are classification-agnostic, but the future
  HR/payroll integration (ADR-0082 future) is the data source for W2.
- **Expense analytics** (spend by category/employee/client, reimbursement cycle time)
  in the BI hub (ADR-0062), gated to finance/admin.

**Resolved 2026-06-13 (Mark):** v1 = mileage + out-of-pocket, premium-app parity;
monthly report + **unified monthly close** (amends ADR-0082 to monthly payment
aggregation); **QuickBooks read-only everywhere** (app never writes/pays/creates
categories); receipts upload-only v1 (OCR deferred); MileIQ per-user OAuth, rate
overridable on a system basis; categories hard-linked to QuickBooks.
