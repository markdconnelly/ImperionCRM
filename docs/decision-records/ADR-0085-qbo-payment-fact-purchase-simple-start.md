# ADR-0085: QuickBooks payment fact = `Purchase` on Simple Start (supersedes the `BillPayment` reconciliation source)

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-06-14 |
| **Amends** | ADR-0082 §Reconciliation #2 (payroll → Paid); ADR-0083 §reimbursement (→ Reimbursed) |
| **Supersedes** | migration 0091 (`qbo_bill_payments`) → migration 0092 (`qbo_purchases`) |
| **Repo** | frontend (schema + ADR); backend (read client + reconciliation — #116); local-pipeline (bronze collector — #174) |
| **Issue** | #526 (epic #458 / #482) |

## Context

ADR-0082 (time tracking) and ADR-0083 (expense) reconcile expected pay/reimbursement against
an **authoritative QuickBooks payment fact**, modeled as the QBO **`BillPayment`** entity
(Accounts Payable: enter a Bill, then pay it). Migration 0091 created the `qbo_bill_payments`
bronze; the backend reconciliation (#105) and LP collector (#170) were built against it,
all deploy-ahead behind the Mark QBO-app-registration gate.

On verifying access (2026-06-14) we established Imperion's QBO company is on the
**Simple Start** subscription, which **does not include Accounts Payable**. The
`Bill`/`BillPayment` entities are unavailable — the Intuit Accounting API returns
*"This feature is not included in your QuickBooks Online Simple Start subscription /
Feature Not Supported."* So the modeled payment fact **cannot exist** in these books.
This is the open question already flagged in the LP integration doc ("whether `Purchase`/
`Bill` carry 1099 contractor payments — confirm against the real books").

"QuickBooks Online Payments" (also on the account) is the **receivables** product
(accepting customer card/ACH on invoices) — irrelevant to paying contractors.

## Decision

**Keep Simple Start; re-target the authoritative payment fact from `BillPayment` to the
`Purchase` entity** (Check/Expense/CreditCard), which Simple Start fully exposes via the API.
In Simple Start, 1099 contractor payments and out-of-pocket reimbursements are recorded as
Checks/Expenses — i.e. `Purchase` objects whose **`EntityRef`** is the payee (Vendor), with
line(s) posting to an expense account.

- **Bronze:** migration 0092 drops the empty `qbo_bill_payments` and creates **`qbo_purchases`**
  (LP lossless envelope; `external_id = Purchase.Id`; columns: `txn_date, total_amount,
  payment_type, account_ref, account_name, entity_id, entity_type, entity_name, doc_number,
  currency, created_time, last_updated_time` + envelope + lossless `raw_payload`).
- **Payee link reused unchanged:** `Purchase.EntityRef.value` = the existing
  `employee_profile.qb_vendor_id` (migration 0085). No comp-store or mapping change.
- **Reconciliation logic unchanged:** match expected pay/reimbursement → a `Purchase` to the
  mapped payee for the amount within the period window. Only the source entity/table swaps;
  domain types stay stable, isolated at the mapping boundary (`mapPurchases`).
- **CFO account mapping is config, not schema:** the CFO designates which expense account(s)
  represent contractor-pay (time) and reimbursable-expense — these are
  `Line[].AccountBasedExpenseLineDetail.AccountRef`, preserved losslessly in `raw_payload`;
  recon/silver filters on them. Modeling does not block on the list.

W2 remains modeled-dormant. Read-only — the app never pays — is unchanged.

## Options considered

1. **Upgrade QBO to Essentials+** so `BillPayment` becomes available — design works as modeled,
   but adds recurring subscription cost and forces an enter-bill-then-pay workflow change for
   whoever keeps the books. **Rejected** (no subscription change).
2. **Re-target to `Purchase` (chosen)** — $0, matches how money already leaves the account in
   Simple Start, localized code change behind the existing mapping boundary.
3. Drop QBO verification and trust attestation alone — **rejected**; loses the independent
   payment proof that the whole reconciliation design exists to provide.

## Consequences

- Migration 0091 is **superseded before it was ever wired** (its table was empty — clean drop).
- Sibling re-targets: backend #116 (`src/shared/qbo.ts` + recon#2 + ADR-0048 + read-client doc),
  local-pipeline #174 (`Purchase` collector + ADR-0014 + integration doc).
- Field names/casing remain **modeled, unverified** until the Intuit sandbox/app registration
  lands; `raw_payload` lossless keeps drift recoverable without a migration.
- The silver/recon column `qb_bill_payment_ref` (migrations 0089/0090, unapplied) now holds a
  `Purchase` id — semantically still "a QuickBooks payment ref", so the **column rename is
  deferred** (a later migration; cosmetic, no behavior change). Tracked in #526.

### Security impact
None new. Read-only, single company-wide connection; tokens in Key Vault (backend) /
SecretStore (LP). `total_amount` and payee are landed in bronze but **never logged**; not comp
data. Never commit secrets.

### Cost impact
**Avoids** a QBO subscription upgrade. API volume (a daily incremental `Purchase` page-walk)
sits far inside Intuit's free Builder tier (500k calls/mo).

### Operational impact
Still gated on Mark's Intuit app registration (unchanged). `Purchase` is a broader entity than
`BillPayment` (all checks/expenses/CC purchases) — recon filters by payee + the CFO-designated
expense account(s), so unrelated spend is ignored.

### Future considerations
- Confirm the `Purchase` wire mapping against the QBO sandbox before go-live.
- If Imperion later moves to Essentials+ and an AP workflow, `BillPayment` could be added as an
  additional source without removing `Purchase` (a future ADR).
