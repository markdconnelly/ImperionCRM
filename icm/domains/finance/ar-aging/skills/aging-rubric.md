# AR aging rubric (Mark-editable — aging buckets + cash-position structure + the NOT-dunning boundary)

> DEFAULTS authored by the agent 2026-06-28. The rubric for `ar-aging`: how to bucket open
> AR by age, how to structure the cash-position summary, and the hard NOT-dunning boundary.
> Mark: edit freely; stages cite this, nothing restates it.

## The AR aging buckets

Open receivables (the open-AR signal = a positive open balance on the QBO invoice mirror)
are bucketed by **whole days past the due date**, as of a stated date:

| Bucket | Definition |
|---|---|
| **current** | open, not yet past due (due date ≥ as-of) |
| **1–30** | 1–30 days past due |
| **31–60** | 31–60 days past due |
| **61–90** | 61–90 days past due |
| **90+** | more than 90 days past due |

The aging columns are **derived in-view** against the as-of date and the latest pulled
balance / due date — the pipeline's normal QBO pull *is* the refresh; no aging is stored. A
settled invoice (balance not open) is **paid**, not aged. Always report the **as-of date**
you read at: aging is a snapshot, and a number without its as-of date is not a finance
figure (audrey.md).

## The cash-position summary structure

A CFO / board AR summary, not a worklist. Report, each with its as-of date:

- **Total open AR** — the sum of open balances as of the date (measured).
- **Aging distribution** — open AR split across the buckets above (amount + share per
  bucket; the bucket totals are derived from the measured per-invoice balances).
- **Cash-position read** — what the aging implies about near-term cash: how much AR is
  current vs aged, the concentration in the 90+ tail, and the trend vs the prior snapshot
  **only when a prior snapshot is available** (a single snapshot has no trend — say so).
- **Notable concentrations** — large open balances or a single account driving a bucket,
  by account name (a business identifier, not personal PII), never by per-person data.
- **Data gaps** — unresolved accounts (the mirror leaves `account_id` null on a name miss),
  unparseable amounts, or a stale QBO pull — noted, never guessed into.

## The NOT-dunning boundary (hard)

This workflow **summarizes AR for the CFO / board. It NEVER duns.**

- **No payment reminder, ever.** Audrey does not draft, send, or queue any message to a
  client about an overdue invoice. Sending reminders is **external** work owned by the
  **future collections agent (#667, ADR-0058)** — not this workflow.
- **No money move, no QBO push.** QBO is the system of record (ADR-0123); the `invoice`
  mirror is read-only on our side. Collecting, voiding, or re-issuing happens in QuickBooks,
  by a human.
- **Output is an internal summary** — a reversible, internal `operational`-class artifact
  for the CFO / board. It informs a human; it never acts on a client.

## Discipline

- **Signal vs inference; don't estimate into a data gap.** The open balance on the mirror
  is the **measured** open-AR signal; bucket totals and shares are **derived** from it.
  Label which is which. Missing or stale data → **note the gap**; never guess a number to
  fill it (audrey.md). A confident wrong cash figure is worse than an honest "this pull is
  stale."
- **As-of discipline.** Every figure carries the as-of date of the snapshot it was read
  from. Aging recomputes on every read; an undated aging number is meaningless.
- **QBO-payment match is future.** Matching payment receipts against the mirror to confirm
  paid-vs-open is a future collections / reconciliation concern (#667/#668); within this
  workflow, use only the mirror's open-balance signal — do not infer applied payments.
- **No PII, no row-level values committed.** Report shape and aggregates; query the live
  read-only DB for actuals. Account names are business identifiers; never emit personal PII.
