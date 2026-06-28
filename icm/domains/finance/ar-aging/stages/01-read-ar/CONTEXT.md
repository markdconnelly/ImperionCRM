# Stage 01 — read-ar

**Job:** read the open AR off the `invoice` QBO mirror and bucket it by age as of a stated date.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Open AR (QBO mirror) | silver `invoice` · `okf:invoice` | open invoices as of the date | the open balances + due dates to age |
| Aging rubric | `./skills/aging-rubric.md` | aging buckets + as-of discipline | how to bucket by age, what is measured vs derived |

## Process

1. `[script]` Fix the **as-of date** for the run (the snapshot date). Aging is derived
   in-view against this date; an undated read is an audit fail.
2. `[script]` Read the open AR from the `invoice` QBO read-only mirror — the open balance,
   due date, account name, and the in-view aging bucket per open invoice. A settled invoice
   is not open AR. An unresolved account (null `account_id` on a name miss) or an unparseable
   amount is **noted as a gap**, not guessed. The companion bronze `qbo_payments` payment
   receipts are **not** read here — payment match is a future collections / reconciliation
   concern (#667/#668); the open balance on the mirror is the open-AR signal this stage needs.
3. `[script]` Bucket the open AR by age per `aging-rubric.md` (current / 1–30 / 31–60 /
   61–90 / 90+) and total each bucket from the measured per-invoice balances.

## Outputs

`ar.md` — the as-of date, the open AR bucketed by age (amount + count per bucket), the total
open AR, notable concentrations by account name, and any data gaps noted (not guessed).

## Audit

- [ ] As-of date stated (not blank)
- [ ] Open AR read from the `invoice` mirror and bucketed by age (or gaps noted, not guessed)
- [ ] No figure estimated into a data gap; no payment-match inference beyond the open-AR signal
- [ ] No send, posting, money move, or QBO push emitted
