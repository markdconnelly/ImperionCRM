---
adr: NNNN
title: "AR/invoice: mirror QuickBooks read-only (own-vs-mirror resolved); AR-aging is a derived read-model"
status: proposed
date: 2026-06-29
repo: frontend
summary: "Resolve the long-open own-vs-mirror question for AR/invoices: Imperion does NOT own an app-native AR/invoice ledger — QuickBooks Online is the system of record for money (ADR-0123) and is read-only on our side. The curated silver `invoice` is a pipeline-populated read-only MIRROR of bronze `qbo_invoices`; AR-aging is a DERIVED read-model over it (due_date + balance + status → aging buckets), not a separate `ar_item` silver entity. App-native state exists only for the dunning workflow and already lives in `collections_activity` (mig 0122). Agents (Audrey FP&A, Collections, Controller) are read-only over the mirror; any dunning SEND is a human easy-button."
tags: [finance, data, agents]
---

# ADR-NNNN: AR/invoice — mirror QuickBooks read-only; AR-aging derived, not owned

> Number claimed at MERGE per system CLAUDE.md §10.3 / [ADR-0084](./ADR-0084-merge-time-number-assignment.md).
> `NNNN` is a placeholder — the branch that merges second renumbers to the next free slot and
> fixes every reference. This ADR claims a migration number too (`0241` placeholder); both are
> renamed at merge.

| Field | Value |
|---|---|
| **Repo** | frontend (owns the schema + the OKF bundle, ADR-0042) |
| **Status** | Proposed |
| **Date** | 2026-06-29 |
| **Issue** | #1580 (resolves the long-open #668 own-vs-mirror question); epic #1394 (Audrey FP&A expansion) |
| **Cross-references** | ADR-0123 (QBO = system of record for money / finance read-only), ADR-0044 (external-SoR read-only-mirror discipline), ADR-0086 (OKF semantic layer), ADR-0042 (front-end owns schema) |

## Problem

Issue [#668](https://github.com/markdconnelly/ImperionCRM/issues/668) asked, for accounts
receivable: **does Imperion OWN an app-native invoice/AR ledger, or MIRROR an external system of
record?** The question stayed open while the AR surface was bootstrapped as a thin observability
VIEW (`invoice_mirror`, migration 0121) and an app-native dunning overlay (`collections_activity`,
migration 0122). The Audrey FP&A expansion (epic #1394, [#1580](https://github.com/markdconnelly/ImperionCRM/issues/1580))
now needs a stable, joinable silver `invoice` to build cash-flow and AR-aging read-models over —
which forces the own-vs-mirror question to be settled, not deferred.

## Context

- **QuickBooks Online is the system of record for money** ([ADR-0123](./ADR-0123-agent-first-build-doctrine.md)).
  QBO is **read-only on our side** — there is no app→QBO write path and no app-native money
  movement. Collecting a payment, voiding, or re-issuing an invoice happens in QuickBooks, by a
  human.
- **Bronze `qbo_invoices`** (migration 0120, LP #197 QBO pull) already lands every QBO invoice as
  a lossless envelope. The order-to-cash fact exists upstream; nothing about AR originates in the app.
- **App-native dunning workflow-state already has a home.** `collections_activity` (migration 0122)
  holds the dunning overlay — status, escalation, assignee, an append-only reminder log — keyed to
  the QBO invoice business key. That table is the ONLY app-native AR-adjacent state and it holds
  workflow state only (no amounts/balances/due dates).
- **The first AR silver surface was a VIEW.** `invoice_mirror` (migration 0121) type-casts the
  bronze envelope and recomputes aging on every read. It served observability but is not a stable,
  indexable surface to build derived read-models on.
- **Audrey is read-only L2** (epic #1394). She detects/drafts/escalates against AR; she never moves
  money. Any dunning SEND is a human easy-button surfaced on another agent's side.

## Options considered

1. **Own an app-native AR/invoice ledger** — a real `invoice` SoR the app writes, syncing to/from
   QBO. Gives full control but creates a second system of record for money, a bidirectional-sync
   reconciliation burden, and an app→QBO write path — directly against ADR-0123 (QBO owns money,
   read-only on our side).
2. **Keep AR as a read-only VIEW only** (status quo, mig 0121) — no stored silver state. Cheapest,
   but every cash-flow / AR-aging read-model re-derives the bronze cast on every query and cannot
   be indexed or joined cleanly; FP&A read-models (#1722) need a stable silver surface.
3. **Add a separate `ar_item` silver entity for aging** — a second persisted AR object distinct
   from `invoice`. Entity sprawl over the same QBO fact; two things to keep in sync for no new
   meaning.
4. **Mirror QBO read-only into a curated silver `invoice` table; derive aging in a read-model
   (chosen)** — one curated silver entity, populated by the pipeline merge, read-only to agents;
   aging computed over it on demand.

### Tradeoffs

Option 4 keeps QBO as the sole money SoR (ADR-0123 honoured), gives FP&A a stable indexable silver
surface to join and build read-models over, and avoids both a second AR object (option 3) and an
app→QBO write path (option 1) — at the cost of a pipeline merge job to populate the mirror (which
is the normal bronze→silver pattern, not new machinery) and a brief overlap with the 0121 VIEW
until the VIEW is retired (a follow-up cutover).

## Decision

**Mirror QuickBooks read-only.** Imperion does NOT own an app-native AR/invoice ledger.

1. **Own-vs-mirror = MIRROR.** The curated silver `invoice` is a read-only MIRROR of bronze
   `qbo_invoices` — a real silver TABLE (migration `0241`, placeholder) populated by the pipeline's
   bronze→silver merge (a **process**, not an agent), carrying the meaningful invoice fields
   (qbo_invoice_id, customer ref/name, issue_date, due_date, total/balance amounts `numeric(14,2)`,
   status, currency). Archetype B (external-SoR read-only mirror), the `ticket` (Autotask mirror)
   precedent under [ADR-0044](./ADR-0044-silver-contracts-tickets.md).
2. **App-native only for the dunning workflow.** The only app-native AR-adjacent state is the
   dunning *workflow*-state in `collections_activity` (migration 0122). This decision does NOT
   duplicate it — no amounts/balances/due dates are stored in the overlay; those are read from the
   mirror.
3. **AR-aging is a DERIVED read-model, not a silver entity.** Aging buckets
   (`current` / `1-30` / `31-60` / `61-90` / `90+`, plus `paid`) are computed over `invoice`
   (`due_date` + `balance` + `status` → bucket) at query time — NOT a separate `ar_item` silver
   table. Cash-flow forecast and plan-vs-actual ([#1722](https://github.com/markdconnelly/ImperionCRM/issues/1722))
   tie actuals out against this same `invoice` surface. No second AR object is persisted.
4. **Read-only to agents.** Web and the backend/agent runtime (Audrey FP&A, Collections,
   Controller) get **SELECT only** on `invoice`. The pipeline merge role gets `SELECT/INSERT/UPDATE`
   because it populates the mirror. There is no agent write path and no app→QBO write path. Audrey
   stays read-only L2; any dunning SEND is a human easy-button on another agent's side.
5. **The 0121 `invoice_mirror` VIEW is superseded as the curated silver surface but left in place.**
   The new `invoice` table carries the same `qbo_invoice_id` natural key, so `collections_activity`'s
   business-key resolution is unaffected. Retiring the VIEW (or re-pointing it at the table) is a
   follow-up cutover, filed separately — not in this slice.

## Consequences

- One curated silver `invoice` entity; the OKF concept file (`tables/invoice.md`) and the
  `coverage-matrix.md` row are updated in the same PR (system CLAUDE.md §11; semantic-layer gate).
- A pipeline bronze→silver merge job must populate `invoice` from `qbo_invoices` (filed as a sibling
  Pipeline/LocalPipeline issue — whichever plane ingests the QBO bronze owns its merge, per the
  LP↔cloud merge-parity contract; the merge is idempotent replace-from-source, so a dual-run
  converges).
- A short overlap: the 0121 VIEW and the new table coexist until the cutover follow-up lands. Both
  read from the same bronze, so they cannot diverge in meaning.

### Security impact

No new external exposure. Finance read-data, `data_class = financial`. The read-only invariant is
enforced at the GRANT layer: web + backend/agent runtime get SELECT only — no agent can write the AR
mirror. The pipeline merge role is the only writer (it populates the mirror; it is not an agent).
No PII beyond the existing QBO mirror posture (customer business name + amounts; no email/phone/
address is selected). **Never commit secrets** — none are involved here.

### Cost impact

Negligible. One additional silver table + a bronze→silver merge that rides the existing QBO pull
cadence. No new subscription, no new external calls.

### Operational impact

The migration is DORMANT until Mark applies it (each prod apply Mark-gated, §10.3). Until the
pipeline merge job ships, the table exists empty and the 0121 VIEW continues to serve AR
observability — no regression. Once the merge runs, FP&A read-models (#1722) build over the stable
`invoice` surface.

## Future considerations

- The pipeline bronze→silver merge job for `invoice` (sibling Pipeline/LocalPipeline issue).
- The 0121 `invoice_mirror` VIEW cutover — retire it or re-point it at the table once read-models
  consume the table directly (follow-up).
- Best-effort silver `account` resolution (QBO customer → `account`) currently lives in read-models;
  a typed account↔QBO-customer mapping remains a follow-up (unchanged from #668).
- `qbo_payments` (mig 0120) match/apply to close invoices precisely (vs the `balance > 0` open-AR
  signal) stays a future Pipeline/Backend concern.
