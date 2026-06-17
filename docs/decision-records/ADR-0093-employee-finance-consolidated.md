---
adr: 0093
title: "Employee finance — consolidated dossier"
status: accepted
date: 2026-06-16
repo: frontend
summary: "Consolidated dossier of the employee time + expense finance decisions: website-authoritative weekly timesheets and monthly expense reports normalized into silver `time_record`/`expense_item`, Autotask documentation writes, the unified Monthly Close, and the authoritative QuickBooks payment fact re-targeted from `BillPayment` to `Purchase` on Simple Start. Carries every member decision and amendment clause verbatim with a zero-loss traceability table; member ADRs are retained."
tags: [finance]
consolidates: [ADR-0082, ADR-0083, ADR-0085]
---
# ADR-0093: Employee finance — consolidated dossier

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-16 |
| **Consolidates** | ADR-0082 · ADR-0083 · ADR-0085 (all retained on disk; each keeps its real status — all three remain `Accepted` — and gains `consolidated_into: ADR-0093`) |
| **Cross-references** | ADR-0090 (consolidation method, dossier + traceability + retained originals) · ADR-0084 (claim ADR numbers at merge) · ADR-0042 (four-repo division of labor — frontend owns the schema, siblings consume) · ADR-0039 (per-source bronze the silver entities merge from) · ADR-0030 / ADR-0016 (the `finance` role + identity spine the comp store extends) · ADR-0038 (poll cadence for the scheduled QuickBooks/MileIQ/Autotask pulls) · ADR-0062 (BI hub — deferred finance analytics) · ADR-0043 (settled AI stack — deferred Claude-vision receipt OCR) · backend ADR-0044 (executor idempotency the Autotask Time Ticket / ExpenseReport writes follow) · backend ADR-0048 / backend #116 (QBO read client + reconciliation) · local-pipeline ADR-0014 / local-pipeline #174 (the on-prem `Purchase` bronze collector) |

## Purpose & scope

This is a consolidation dossier produced under [ADR-0090](./ADR-0090-adr-ingestion-overhaul.md). It folds the **Employee-finance cluster** — every decision record that defines how Imperion captures employee labor and spend, documents it in the system of record, and verifies the manual payment that follows against the books — into one ingestible record, so that "the current decision about employee time + expense finance" can be reconstructed from a single file rather than a chain of amendments and a reconciliation-source supersession.

**Zero loss is the binding constraint (ADR-0090).** A decision is "lost" only if it appears in *no* active record. This dossier therefore:

- **Synthesizes** the current employee-finance decision (the section immediately below);
- **Carries every member decision and every amendment/supersession clause VERBATIM** (the per-member sections that follow — quoted directly from each source ADR's *Decision* / governing clauses);
- **Proves zero loss with a traceability table** mapping each source ADR's decision(s) to its dossier section;
- **Retains every member file on disk** with `consolidated_into: ADR-0093` and an inbound pointer — so history and inbound links survive (ADR-0090).

**Member statuses are preserved verbatim (ADR-0090).** All three members are `Accepted` and stay `Accepted`. The supersession in this cluster is **internal and partial**: ADR-0085 does **not** supersede a whole member ADR — it supersedes a single *reconciliation-source detail* inside ADR-0082 and ADR-0083 (the authoritative QuickBooks payment fact moves from the **`BillPayment`** entity to the **`Purchase`** entity, because Imperion's QBO is **Simple Start** with no Accounts Payable). Both amended members therefore keep `status: accepted` and carry an inbound "Amended by ADR-0085" blockquote in their bodies (preserved verbatim); ADR-0085 keeps its `Amends ADR-0082/ADR-0083` and `Supersedes migration 0091→0092` metadata verbatim. Consolidation adds the `consolidated_into` pointer but flips no decision's status.

**Boundaries preserved (system CLAUDE.md §1, single-owner rule).** This repo owns the schema; the siblings consume it. Cross-repo references remain **references, never absorptions**: the backend's Autotask writes + QuickBooks read + reconciliation processes (backend ADR-0044/0048, #116), the on-prem scheduled MileIQ/QuickBooks pulls + receipt-blob lifecycle + the `Purchase` bronze collector (local-pipeline ADR-0014, #174), and the cloud pipeline's bronze→silver merge are **cited by repo-qualified id only**, not copied here.

---

## Synthesis — the current employee-finance decision

Imperion captures employee labor and spend on the **website (authoritative)**, normalizes both into **silver** per ADR-0039, **documents** each into Autotask (the system of record) as idempotent summary writes, and **verifies the manual payment** read-only against QuickBooks. In current form:

1. **Time is website-authoritative, Autotask-documented (ADR-0082).** Attendance is entered and attested on the website (the authoritative source); Autotask per-ticket `TimeEntry` rows are read in as corroboration. Both normalize into **one silver `time_record` table** discriminated by `source` (`website`/`autotask`) and `kind` (`attendance`/`allocation`); duration is always *calculated*. The **Timesheet** is the weekly (**Mon–Sun**) per-employee container, lifecycle **Open → Submitted → Approved → Payroll-Approved → Paid**: attestation hard-locks the employee out, an admin approval triggers **one idempotent Time Ticket per employee per week** on Imperion's own house company (links to the Ancillary Tickets, never re-creating the native TimeEntries so summing never double-counts), and **Reconciliation #1** (time, six deviations, soft/hard) plus **Reconciliation #2** (payroll, expected vs the authoritative QuickBooks payment) gate the workflow.

2. **Expense is website-authoritative, Autotask-documented, with a separate AP reimbursement (ADR-0083).** **MileIQ** auto-pulled mileage (authoritative for the *miles* fact; the rate is a company-comp decision) and manual out-of-pocket entries with receipts normalize into **one silver `expense_item` table** discriminated by `source` and `kind` (`mileage`/`out_of_pocket`), each item carrying independent **reimbursable** and **billable** legs. The **Expense Report** is the **monthly** per-employee container, lifecycle **Open → Submitted → Approved → Finance-Approved → Reimbursed** (+ Rejected→reopen→re-attest), with a configurable **policy/violation engine** (hard violations block attest), **categories hard-linked to the QuickBooks chart of accounts** (QuickBooks never written), receipts uploaded to a private storage account then pushed to Autotask and **90-day-lifecycle-deleted** (guarded on verified-stored), **one idempotent Autotask ExpenseReport per employee per month** carrying billable items to the client invoice, and **Reimbursement Reconciliation** matching the report to its authoritative QuickBooks payment.

3. **Approval + payment is a unified Monthly Close (ADR-0083 amends ADR-0082).** A **single monthly task per employee** covers both time and expenses: aggregated time total (weekly timesheets rolled up) + reimbursable expense total, both QuickBooks match statuses, and open obligations. Time **payment** therefore aggregates **monthly** (weekly capture → monthly pay); the weekly Timesheet remains the attestation/approval unit, the monthly close is the payment unit.

4. **The authoritative QuickBooks payment fact is `Purchase`, not `BillPayment` (ADR-0085 supersedes the ADR-0082/0083 reconciliation source).** On verifying access (2026-06-14) Imperion's QBO company is on **Simple Start**, which has **no Accounts Payable** — the `Bill`/`BillPayment` entities the original reconciliations modeled **cannot exist** in these books. The decision: **keep Simple Start; re-target the authoritative payment fact to the `Purchase` entity** (Check/Expense/CreditCard), which Simple Start fully exposes. Bronze: migration 0092 drops the empty `qbo_bill_payments` and creates **`qbo_purchases`** (lossless envelope, `external_id = Purchase.Id`). The **payee link is reused unchanged** (`Purchase.EntityRef.value` = the existing `employee_profile.qb_vendor_id`); **reconciliation logic is unchanged** — only the source entity/table swaps, isolated at the mapping boundary (`mapPurchases`). The matching window, both reconciliations (#2 payroll → **Paid**, expense → **Reimbursed**), and the read-only "app never pays" guarantee are all preserved.

5. **Comp data is isolated and least-privilege.** Compensation (Pay Rate, employee classification, the mileage rate) lives in a separate payroll-role-gated `employee_profile` + `pay_rate` store — **never** on the Entra-synced `app_user` row, never visible to the employee/agents/clients. **v1 is all 1099** (gross = net, exact amount reconciliation); **W2 is modeled but dormant**. `canApprovePayroll` = `finance` ∩ `admin`; **`admin` is the top tier — no `super_admin`**. QuickBooks is **read-only everywhere**; Autotask writes are confined to Imperion's own house company (time) and the employee's own ExpenseReport (expense); MileIQ/QuickBooks/Autotask credentials live in Key Vault.

6. **Repo split (ADR-0042).** Frontend owns the schema (migrations here) + the entry/attest/approve/map/close GUI + read-side reconciliation render. Backend owns the Autotask Time Ticket + ExpenseReport/attachment writes, the MileIQ OAuth custody, the QuickBooks read (categories + the `Purchase` payment fact), and the reconciliation processes (backend #116). The cloud pipeline owns the bronze→silver `time_record`/`expense_item` merge. Local-pipeline owns the scheduled Autotask TimeEntry + MileIQ drive + QuickBooks `Purchase` bulk pulls and the 90-day receipt-blob lifecycle (#174).

### Reconciliation-source evolution (preserved verbatim)

The members that touch the QuickBooks payment fact form an explicit before/after the dossier captures:

- **ADR-0082 and ADR-0083 model** the authoritative QuickBooks payment fact as the **`BillPayment`** entity (Accounts Payable: enter a Bill, then pay it). Migration 0091 created the `qbo_bill_payments` bronze; the backend reconciliation and the LP collector were built against it, all deploy-ahead behind the Mark QBO-app-registration gate.
- **ADR-0085 supersedes that reconciliation source:** Imperion's QBO is **Simple Start** (no AP), so `Bill`/`BillPayment` are unavailable and the modeled fact cannot exist. **Migration 0092 drops the empty `qbo_bill_payments` and creates `qbo_purchases`** (`Purchase` = Check/Expense/CreditCard). The payee link (`Purchase.EntityRef.value` = `employee_profile.qb_vendor_id`) and the reconciliation matching logic are **unchanged** — only the source entity/table swaps. The amended members keep `status: accepted` and each carries an inbound "Amended by ADR-0085" blockquote (preserved verbatim below). The silver/recon column `qb_bill_payment_ref` (migrations 0089/0090, unapplied) now holds a `Purchase` id; the **cosmetic column rename is deferred** (tracked in #526).

### Amendment & supersession web (preserved verbatim)

- **ADR-0083 amends ADR-0082** — time **payment** aggregates **monthly** via the **unified Monthly Close** (time + expenses, a single monthly finance task per employee). The weekly timesheet capture/attest/approve cadence is **unchanged**; the weekly Timesheet stays the attestation/approval unit, the monthly close becomes the payment unit. (Preserved verbatim as ADR-0082's "Amended 2026-06-13 (ADR-0083)" closing clause and ADR-0083's "Unified Monthly Close (amends ADR-0082)" decision clause.)
- **ADR-0085 amends ADR-0082 §Reconciliation #2 (payroll → Paid) and ADR-0083 §reimbursement (→ Reimbursed)** and **supersedes migration 0091 (`qbo_bill_payments`) → migration 0092 (`qbo_purchases`)** — the authoritative QuickBooks payment fact is the `Purchase` entity on Simple Start, not `BillPayment`. Matching logic and the `qb_vendor_id` payee link are unchanged. (Preserved verbatim as the inbound blockquotes in ADR-0082/0083 and ADR-0085's metadata + Decision.)
- **ADR-0083 reuses (not absorbs) ADR-0082's** comp store (`employee_profile`/`pay_rate`, migration 0085), identity spine (`app_user`), and role gates (`canApprovePayroll`) — a within-cluster reuse, preserved as a reference.

All three members are **Accepted** and preserved unchanged. Consolidation alters no decision's status.

---

## Traceability table (zero-loss proof)

Every cluster member (the 3 named in #759), each source decision, and the dossier section that carries it verbatim. The retained member file is the second proof of non-loss.

| Source ADR | Status | Decision(s) carried | Dossier section |
|---|---|---|---|
| **ADR-0082** | Accepted (amended by ADR-0083 cadence + ADR-0085 recon source) | Website-authoritative attendance + Autotask allocation → one silver `time_record` (`source`×`kind`, duration calculated); weekly Mon–Sun Timesheet lifecycle Open→Submitted→Approved→Payroll-Approved→Paid (attest hard-locks); idempotent weekly Time Ticket on the house company (links, no double-count); Reconciliation #1 (time, 6 deviations) + #2 (payroll vs authoritative QuickBooks payment); 1099/W2 comp model in payroll-gated store; `canApprovePayroll`=finance∩admin, admin top tier; repo split | Synthesis §1, §3, §5 · Reconciliation-source evolution · Amendment web · [M1 — ADR-0082](#m1--adr-0082-employee-time-tracking--website-authoritative-timesheets-autotask-documentation-quickbooks-payment-reconciliation) |
| **ADR-0083** | Accepted (amends ADR-0082; amended by ADR-0085 recon source) | MileIQ mileage (authoritative for miles; rate is comp) + manual out-of-pocket w/ receipts → one silver `expense_item` (`source`×`kind`, independent reimbursable & billable legs); monthly Expense Report lifecycle Open→Submitted→Approved→Finance-Approved→Reimbursed; policy/violation engine; categories hard-linked to QuickBooks chart of accounts (never written); receipts→Autotask then 90-day blob delete (guarded); idempotent monthly ExpenseReport + billable pass-through to client invoice; Reimbursement Reconciliation; **unified Monthly Close (amends ADR-0082 to monthly payment)** | Synthesis §2, §3, §5 · Reconciliation-source evolution · Amendment web · [M2 — ADR-0083](#m2--adr-0083-employee-expense-tracking--website-authoritative-monthly-expense-reports-mileiq-mileage-autotask-documentation-quickbooks-reimbursement-reconciliation) |
| **ADR-0085** | Accepted (amends ADR-0082/0083; supersedes migration 0091→0092) | Keep Simple Start; re-target the authoritative QuickBooks payment fact from **`BillPayment`** to the **`Purchase`** entity (Check/Expense/CreditCard); migration 0092 drops empty `qbo_bill_payments`, creates `qbo_purchases` (lossless envelope, `external_id=Purchase.Id`); payee link `Purchase.EntityRef.value`=`employee_profile.qb_vendor_id` unchanged; reconciliation logic unchanged (only source entity swaps, isolated at `mapPurchases`); CFO expense-account mapping is config not schema; `qb_bill_payment_ref` rename deferred (#526) | Synthesis §4 · Reconciliation-source evolution · Amendment web · [M3 — ADR-0085](#m3--adr-0085-quickbooks-payment-fact--purchase-on-simple-start-supersedes-the-billpayment-reconciliation-source) |

**Member count: 3.** Cross-repo references preserved as references (not absorbed): backend ADR-0044 (executor idempotency), backend ADR-0048 / backend #116 (QBO read client + reconciliation), local-pipeline ADR-0014 / local-pipeline #174 (on-prem `Purchase` bronze collector + scheduled pulls + receipt-blob lifecycle), and the cloud pipeline's bronze→silver merge. In-repo references preserved (not absorbed): ADR-0039 (per-source bronze), ADR-0030/0016 (roles & identity), ADR-0038 (poll cadence), ADR-0062 (BI hub), ADR-0043 (settled AI stack — deferred OCR).

---

# Member decisions (verbatim)

Each section below reproduces the governing decision text of one member ADR **verbatim** from its source file. The full source ADR (Problem / Context / Options / Consequences / Future considerations) is retained on disk under its original filename; only its decision and binding clauses are quoted here, which is what the zero-loss guarantee requires.

## M1 — ADR-0082 (Employee time tracking — website-authoritative timesheets, Autotask documentation, QuickBooks payment reconciliation)

> Source: [`ADR-0082-employee-time-tracking-and-payroll-reconciliation.md`](./ADR-0082-employee-time-tracking-and-payroll-reconciliation.md) · Status: **Accepted** (2026-06-13)

**Inbound amendment header (preserved verbatim):**

> **Amended by [ADR-0085](ADR-0085-qbo-payment-fact-purchase-simple-start.md) (2026-06-14):**
> the QuickBooks payment fact for Reconciliation #2 is the **`Purchase`** entity (bronze
> `qbo_purchases`, migration 0092), not `BillPayment` — Imperion's QBO is **Simple Start**
> (no Accounts Payable). Matching logic and the `qb_vendor_id` payee link are unchanged.

**Decision (verbatim):**

> **Data model (per ADR-0039).** Two bronze sources — `website_*` (attendance blocks +
> notes, entered on the site) and `autotask_*` (native `TimeEntry` rows) — normalize into
> **one silver `time_record` table** discriminated by `source` (`website`/`autotask`) and
> `kind` (`attendance`/`allocation`). **Website attendance is the authoritative source;**
> Autotask allocation corroborates. A **Time Entry** is a day + start + end (duration
> **calculated**, never typed) + notes + a category (`billable`→Ancillary Ticket /
> `internal` / `admin`). Employees may have several per day.
>
> **Timesheet & lifecycle.** The **Timesheet** is the weekly (**Monday–Sunday**),
> per-employee container. Lifecycle **Open → Submitted → Approved → Payroll-Approved →
> Paid**:
> - **Submitted** — the employee **attests** (affirms true time). Attestation **hard-locks
>   the employee out**; only admins edit thereafter. **Hard deviations must clear first.**
> - **Approved** — an **admin** accepts (after any corrections, audited against the attested
>   original) → triggers the **Time Ticket** write to Autotask.
> - **Payroll-Approved** — the **CFO / admin** (`canApprovePayroll`) authorizes payment.
>   Imperion does not pay.
> - **Paid** — set when **Payroll Reconciliation** matches the timesheet to its authoritative
>   QuickBooks payment.
>
> **Reconciliation #1 — time (derived read model over `time_record`).** Per employee, per
> day: attested attendance (envelope) vs same-period Autotask allocation, verdict
> **Balanced / Under-logged / Over-logged**, with six **Deviations** — over-logged (Hard),
> overlap (Hard), temporal orphan, under-logged gap, attended-nothing-logged,
> logged-never-attended (Soft). Soft = attestable with a note; Hard = blocks attestation.
> Tolerance configurable (default ~30 min/day). Surfaced **pre-attest** (the
> memory-jogger reconstruction screen, seeded from the employee's Ancillary Tickets) and
> on the admin approval view.
>
> **Autotask write — documentation only.** **One idempotent Time Ticket per employee per
> week** on Imperion's **own house company** (companyID a config value), in a dedicated
> **Timesheets queue**, body = reconciled summary + **links** to the Ancillary Tickets. It
> **does not re-create** the native TimeEntries, so summing Autotask never double-counts.
> Re-approval updates the same ticket via its stored `external_ref` (backend ADR-0044
> idempotency pattern).
>
> **Reconciliation #2 — payroll.** **Expected pay** (approved hours under the employee's
> effective **Pay Rate**) is lined up against the **authoritative QuickBooks payment**
> (read-only). The match — employee + pay period + amount within tolerance — sets **Paid**.
> QuickBooks is the system of record for the payment fact; Imperion only verifies a payment
> it already holds.
>
> **Employees & comp data.** An **Employee** is an `app_user` extended with an **Employee
> Classification** (**1099** | **W2**), an **effective-dated Pay Rate**, and external
> mappings to an **Autotask Resource** and a **QuickBooks vendor/employee** — joined by the
> employee's **email**, consistent across all three systems (resolved id stored). **v1 is
> all 1099**: paid the hourly Pay Rate directly, no withholding (gross = net), settled as a
> QuickBooks **vendor/AP payment** — so amount reconciliation is exact. **W2** is modeled
> but dormant (withholding → gross≠ net, QuickBooks payroll record, overtime) until the
> first W2 hire. Comp fields (classification, Pay Rate) live in a **separate
> `employee_profile` + `pay_rate` store**, DB-grant-restricted to payroll roles —
> **never** on the Entra-synced `app_user` row, never visible to the employee themselves,
> agents, or any client-facing surface.
>
> **Roles.** `canApprovePayroll` = `finance` ∪ `admin`. Pay Rate / labor-cost visibility =
> `finance` ∪ `admin` only. **`admin` is the top tier — no `super_admin` role is added**
> (decided 2026-06-13).
>
> **Repo split (ADR-0042).** Frontend owns schema (migrations here) + the entry/attest/
> approve/reconcile GUI + read-side render. Backend owns the Autotask Time Ticket write,
> the QuickBooks read, and the reconciliation process. Pipeline owns the bronze→silver
> `time_record` merge. Local-pipeline owns the scheduled Autotask `TimeEntry` and
> QuickBooks bulk pull.

**Resolutions & amendment clauses (preserved verbatim):**

> **Resolved 2026-06-13 (Mark):** pulled into **v1** scope (despite the 2026-06-11 cutoff);
> **`admin` is top tier** (no `super_admin`); **QuickBooks Online** (exact amount match).

> **Amended 2026-06-13 (ADR-0083):** time **payment** aggregates **monthly** — weekly
> timesheet capture/attest/approve is unchanged, but Payroll Approval and the Paid
> reconciliation now happen in the **unified Monthly Close** (time + expenses) introduced by
> ADR-0083, a single monthly finance task per employee. The weekly Timesheet remains the
> attestation/approval unit; the monthly close is the payment unit.

## M2 — ADR-0083 (Employee expense tracking — website-authoritative monthly expense reports, MileIQ mileage, Autotask documentation, QuickBooks reimbursement reconciliation)

> Source: [`ADR-0083-employee-expense-tracking-and-reimbursement.md`](./ADR-0083-employee-expense-tracking-and-reimbursement.md) · Status: **Accepted** (2026-06-13)

**Inbound amendment header (preserved verbatim):**

> **Amended by [ADR-0085](ADR-0085-qbo-payment-fact-purchase-simple-start.md) (2026-06-14):**
> the QuickBooks reimbursement fact is the **`Purchase`** entity (bronze `qbo_purchases`,
> migration 0092), not `BillPayment` — Imperion's QBO is **Simple Start** (no Accounts
> Payable). The reimbursement → **Reimbursed** matching and the `qb_vendor_id` payee link
> are unchanged.

**Decision (verbatim):**

> **Data model (per ADR-0039).** Two bronze sources — `mileiq_drive` (auto-pulled
> drives) and `website`/manual out-of-pocket entries — normalize into **one silver
> `expense_item` table** discriminated by `source` and `kind` (`mileage` |
> `out_of_pocket`). **The website-attested value is authoritative;** MileIQ is
> authoritative for the **miles** fact only. An expense item carries: date, category,
> amount (calculated for mileage = miles × effective rate), merchant/description, a
> **reimbursable** flag, a **billable** flag with an optional `companyID`/project/ticket
> link, and (for out-of-pocket) a receipt reference.
>
> **Expense Report & lifecycle.** The **Expense Report** is the **monthly**,
> per-employee container — required only when the employee incurred ≥1 expense that
> month; no expenses, no report. Lifecycle **Open → Submitted → Approved →
> Finance-Approved → Reimbursed** (+ **Rejected → reopen → re-attest**):
> - **Submitted** — the employee **attests**, which **hard-locks the employee out**;
>   only admins edit thereafter. **Every out-of-pocket item must have a receipt** and
>   **hard policy violations must clear first**. (Mileage is receipt-exempt — MileIQ is
>   the evidence.)
> - **Approved** — an **admin** accepts (after any corrections, audited against the
>   attested original) → triggers the **idempotent Autotask ExpenseReport** write.
> - **Finance-Approved** — the **CFO / admin** (`canApprovePayroll`) authorizes payment.
>   Imperion does not pay.
> - **Reimbursed** — set when **Reimbursement Reconciliation** matches the report to its
>   authoritative QuickBooks **bill-payment**.
>
> **Policy/violation engine (derived read model, configurable).** Evaluated **per item,
> pre-attest** and surfaced as a memory-jogger (mirrors ADR-0082's reconciliation
> screen). **Hard (block attest):** missing receipt on an out-of-pocket item; amount over
> a category hard-cap; future-dated or dated outside the report month. **Soft (attest with
> a note):** suspected duplicate (merchant+amount+date); amount over a soft threshold;
> billable item missing a `companyID`; uncategorized/"Other". Caps, thresholds, and the
> category set are **admin-configurable in-app** (not hardcoded); each violation **links to
> the canonical company expense policy in IT Glue** (authored separately — a business
> deliverable).
>
> **Categories — hard-linked to QuickBooks.** The chart of accounts in QuickBooks is the
> category SoR. `qbo_expense_account` is **read** and synced to bronze; an admin
> **maps** each QuickBooks account to a clean, user-facing `expense_category` (hard FK to
> the QuickBooks account) with caps, soft threshold, billable-default, Autotask
> `expenseCategory` id, and a visibility toggle. When a needed category is absent in
> QuickBooks, the app **detects and prompts**; finance **creates it in QuickBooks
> manually**; the app **re-syncs** and it becomes mappable. **Mileage is a system
> category** (rate-driven, receipt-exempt). QuickBooks is **never written** by the app.
>
> **Mileage — MileIQ, rate owned by Imperion.** A scheduled per-connected-employee pull
> lands business-classified drives in `mileiq_drive` bronze → silver
> `expense_item(kind=mileage)`. The reimbursement **amount = miles × effective mileage
> rate**, where the rate is **effective-dated and configurable**, stored in the
> payroll-gated comp store beside `pay_rate`, **defaulting to MileIQ's suggested rate**
> (captured per drive) and **overridable on a system basis**. Personal drives never enter.
> MileIQ access is **per-user OAuth (read-only)**; the employee connects once (an
> onboarding step); the backend custodies the refresh token in Key Vault. (The Teams
> group API — one admin consent for the whole group — is modeled-dormant pending GA.)
>
> **Receipts.** Captured by **web upload** (v1; native mobile + Claude-vision OCR
> pre-fill are modeled-dormant, deferred per ADR-0043) to a **private Azure storage
> account**. On approval the receipt is pushed to Autotask as an **ExpenseItemAttachment**
> and **verified stored** (read-back). A **90-day blob lifecycle** then deletes the
> storage-account copy — Autotask becomes the durable receipt SoR — **guarded** so a
> receipt **not yet verified-in-Autotask is retained/flagged, never silently deleted**.
>
> **Autotask write — documentation + billing pass-through.** **One idempotent
> ExpenseReport per employee per month** (re-approval updates the same report via its
> stored `external_ref`, backend ADR-0044). **Billable** items carry
> `isBillableToCompany=true` + `companyID` (+ project/ticket), so Autotask's billing
> engine handles the **client invoice** — Imperion does not invoice clients directly.
> **Pass at cost in v1** (no Imperion-side markup; deferred to v2).
>
> **Reimbursement Reconciliation.** **Expected** = the approved **reimbursable** total;
> lined up against the **authoritative QuickBooks bill-payment** (read-only). The match —
> employee + period + amount within tolerance — sets **Reimbursed**. A mismatch/partial is
> an **exception**, surfaced in the monthly close, blocking auto-Reimbursed until a human
> resolves. Reimbursements book as **separate AP bills** (non-taxable), distinct from the
> payroll wage.
>
> **Unified Monthly Close (amends ADR-0082).** Approval + payment is a **single monthly
> task** covering **both time and expenses**. The **Monthly Close** surface lists, per
> employee per month: aggregated time total (weekly timesheets rolled up) + reimbursable
> expense total, both QuickBooks match statuses, and open obligations (approved-but-not-
> yet-confirmed-paid). This amends ADR-0082 so that time **payment** aggregates monthly
> (weekly capture → monthly pay); the weekly timesheet capture/attest/approve cadence is
> unchanged.
>
> **Employees, comp & billable legs.** An **Employee** reuses the ADR-0082 extension of
> `app_user`, with one added external mapping: a **MileIQ user id** (joined by email,
> consistent with the Autotask Resource + QuickBooks vendor mappings). The mileage rate
> joins the existing payroll-gated comp store. **Reimbursable and billable are independent
> legs**: a billable out-of-pocket item is **both** reimbursed to the employee **and**
> billed to the client.
>
> **Roles.** `expense:write` (self-scoped, all roles — employeeId from session, not the
> form; lock re-checked server-side). `expense:approve` (admin). Finance authorization
> reuses `canApprovePayroll` = `finance` ∪ `admin`. Expense amounts + receipts: employee
> sees **own only**; `finance`/`admin` see all. The mileage rate follows the same
> payroll-role gating as `pay_rate`. **`admin` is the top tier — no `super_admin`.**
>
> **Repo split (ADR-0042).** Frontend owns schema (migrations here) + the entry/attest/
> approve/map/close GUI + read-side render. Backend owns the Autotask ExpenseReport +
> attachment write/verify, the MileIQ OAuth custody + callback, the QuickBooks read
> (categories + bill-payment match), and the reconciliation process. Pipeline owns the
> bronze→silver `expense_item` merge. Local-pipeline owns the scheduled MileIQ drive pull,
> the QuickBooks bulk pull, and the receipt-blob 90-day lifecycle enforcement.

**Resolution clause (preserved verbatim):**

> **Resolved 2026-06-13 (Mark):** v1 = mileage + out-of-pocket, premium-app parity;
> monthly report + **unified monthly close** (amends ADR-0082 to monthly payment
> aggregation); **QuickBooks read-only everywhere** (app never writes/pays/creates
> categories); receipts upload-only v1 (OCR deferred); MileIQ per-user OAuth, rate
> overridable on a system basis; categories hard-linked to QuickBooks.

## M3 — ADR-0085 (QuickBooks payment fact = `Purchase` on Simple Start — supersedes the `BillPayment` reconciliation source)

> Source: [`ADR-0085-qbo-payment-fact-purchase-simple-start.md`](./ADR-0085-qbo-payment-fact-purchase-simple-start.md) · Status: **Accepted** (2026-06-14) · Amends (verbatim): "ADR-0082 §Reconciliation #2 (payroll → Paid); ADR-0083 §reimbursement (→ Reimbursed)." · Supersedes (verbatim): "migration 0091 (`qbo_bill_payments`) → migration 0092 (`qbo_purchases`)." · Issue: #526 (epic #458 / #482).

**Decision (verbatim):**

> **Keep Simple Start; re-target the authoritative payment fact from `BillPayment` to the
> `Purchase` entity** (Check/Expense/CreditCard), which Simple Start fully exposes via the API.
> In Simple Start, 1099 contractor payments and out-of-pocket reimbursements are recorded as
> Checks/Expenses — i.e. `Purchase` objects whose **`EntityRef`** is the payee (Vendor), with
> line(s) posting to an expense account.
>
> - **Bronze:** migration 0092 drops the empty `qbo_bill_payments` and creates **`qbo_purchases`**
>   (LP lossless envelope; `external_id = Purchase.Id`; columns: `txn_date, total_amount,
>   payment_type, account_ref, account_name, entity_id, entity_type, entity_name, doc_number,
>   currency, created_time, last_updated_time` + envelope + lossless `raw_payload`).
> - **Payee link reused unchanged:** `Purchase.EntityRef.value` = the existing
>   `employee_profile.qb_vendor_id` (migration 0085). No comp-store or mapping change.
> - **Reconciliation logic unchanged:** match expected pay/reimbursement → a `Purchase` to the
>   mapped payee for the amount within the period window. Only the source entity/table swaps;
>   domain types stay stable, isolated at the mapping boundary (`mapPurchases`).
> - **CFO account mapping is config, not schema:** the CFO designates which expense account(s)
>   represent contractor-pay (time) and reimbursable-expense — these are
>   `Line[].AccountBasedExpenseLineDetail.AccountRef`, preserved losslessly in `raw_payload`;
>   recon/silver filters on them. Modeling does not block on the list.
>
> W2 remains modeled-dormant. Read-only — the app never pays — is unchanged.

**Consequences (preserved verbatim):**

> - Migration 0091 is **superseded before it was ever wired** (its table was empty — clean drop).
> - Sibling re-targets: backend #116 (`src/shared/qbo.ts` + recon#2 + ADR-0048 + read-client doc),
>   local-pipeline #174 (`Purchase` collector + ADR-0014 + integration doc).
> - Field names/casing remain **modeled, unverified** until the Intuit sandbox/app registration
>   lands; `raw_payload` lossless keeps drift recoverable without a migration.
> - The silver/recon column `qb_bill_payment_ref` (migrations 0089/0090, unapplied) now holds a
>   `Purchase` id — semantically still "a QuickBooks payment ref", so the **column rename is
>   deferred** (a later migration; cosmetic, no behavior change). Tracked in #526.

---

## Consequences

### Security impact

No change to any security posture — this is a documentation consolidation (ADR-0090). Every security control of the member ADRs remains in force and is carried verbatim: compensation data (Pay Rate, classification, labor cost, mileage rate) isolated in a payroll-role-gated `employee_profile`/`pay_rate` store, never on the Entra-synced identity row, never exposed to the employee/agents/clients, never written to issues/PRs/logs — counts/aggregates only (ADR-0082/0083); QuickBooks **read-only everywhere**, no write path to the books/chart-of-accounts/payments, the app only verifies a payment it already holds (ADR-0082/0083/0085); Autotask writes confined to Imperion's own house company (time) and the employee's own ExpenseReport, with `companyID` the only client linkage and no client PII copied (ADR-0082/0083); receipts in a private storage account, owner+finance/admin gated, pushed to Autotask then guarded-lifecycle-deleted, never logged (ADR-0083); MileIQ read-only per-user OAuth, tokens in Key Vault (ADR-0083); `Purchase` bronze lands `total_amount` + payee but never logs them, not comp data, single company-wide read-only connection with tokens in Key Vault / SecretStore (ADR-0085); attestation and admin corrections fully audited, attested original preserved (ADR-0082/0083). `Never commit secrets` — no secrets, tokens, or client PII appear in this dossier or any member file; MileIQ/QuickBooks/Autotask credentials are custodied in Key Vault per the unified security standard.

### Cost impact

None from the consolidation. No runtime, schema, or model change here. Slightly larger ADR corpus to index (one added file); the generated index and `adr-index.json` absorb it mechanically. The member ADRs' own cost notes are carried verbatim and unchanged: scheduled QuickBooks/MileIQ/Autotask pulls (cadence per ADR-0038); one private storage account for transient receipt blobs (90-day retention); one Autotask Time Ticket per employee per week + one ExpenseReport per employee per month (negligible); no new AI spend (OCR deferred per ADR-0043). ADR-0085 additionally **avoids** a QBO subscription upgrade, and its daily incremental `Purchase` page-walk sits far inside Intuit's free Builder tier.

### Operational impact

The employee-finance decision surface is now reconstructable from one file. Member files are retained with `consolidated_into: ADR-0093` — all three keep `status: accepted` — so all inbound `ADR-NNNN` links and history survive. The generated README index (`scripts/adr-index.mjs`) and `adr-index.json` are regenerated in the same change; `--check` passes. The members' standing operational notes are unchanged and remain the operational truth: the time/expense migrations are **not prod-applied until Mark runs them**; the whole reconciliation path is **gated on Mark's Intuit/QuickBooks app registration**; ADR-0085's `Purchase` wire mapping is **modeled, unverified** until the QBO sandbox lands (`raw_payload` keeps drift recoverable without a migration); the `qb_bill_payment_ref` cosmetic rename is **deferred** (#526). Future employee-finance decisions either amend a member (and update this dossier's synthesis + amendment web in the same PR) or, if net-new, are authored standalone and folded in at the next consolidation pass.

## Future considerations

- This dossier is vectorized into gold alongside other knowledge once stable (ADR-0090 future considerations; LocalPipeline).
- As the deferred member items land — W2 activation (withholding, QuickBooks payroll source, overtime), live punch-clock, receipt OCR (Claude-vision, ADR-0043), MileIQ Teams group API, QuickBooks write (a new ADR), billable-expense markup, company-card/per-diem kinds, finance analytics in the BI hub (ADR-0062), and the `qb_bill_payment_ref` rename (#526) — they amend the relevant member and this dossier's synthesis + amendment web in the same PR.
- If Imperion later moves to QBO Essentials+ and an AP workflow, `BillPayment` could be added as an additional payment source without removing `Purchase` (a future ADR, per ADR-0085).
- The same consolidation method (ADR-0090) applies to the remaining clusters.
