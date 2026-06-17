---
adr: 0046
title: "Ticket board filters & saved/shareable list views"
status: accepted
date: 2026-06-09
repo: frontend
summary: "A `saved_view` table provides per-user, shared, and default saved list views over URL-param filters."
tags: [surfaces]
---
# ADR-0046: Ticket board filters & saved/shareable list views

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-09 |
| **Cross-references** | — |

## Problem

The Tickets page (0014/0050 silver, now full of real Autotask data) renders one
flat list. Operators need to scope it — by status, priority, account, time
window — and to keep those scopes: a personal default view, multiple named
views, and **company-shared** views so the team can standardize queues
(Mark's UI review, 2026-06-09).

## Context

Tickets live in silver `ticket` (kept fresh by the pipeline's 5-minute merge
sweep, ADR-0044). List pages are server components reading repositories
directly (ADR-0042 allows direct reads). No saved-view infrastructure existed
anywhere in the app. Other list pages (tasks, contacts, future devices) will
want the same capability.

## Options considered

1. A generic `saved_view` table — `entity_type` discriminator + `filters`
   jsonb — applied to tickets first (this decision).
2. Ticket-specific `ticket_view` table with typed filter columns (rejected —
   schema churn for every new filter and every new list page).
3. Client-side views in localStorage (rejected — not shareable, not portable
   across devices, invisible to the company).

### Tradeoffs

- (1) one table serves every future list page; jsonb filters mean adding a
  filter is a UI change only. Cost: filters are not FK-validated (a deleted
  account id in a view simply matches nothing).
- (2) stronger typing but multiplies tables/migrations.
- (3) cheapest but fails the "company views" requirement outright.

## Decision

- **Migration 0052** — `saved_view` (entity_type, name, owner_user_id FK →
  app_user, is_shared, is_default, filters jsonb). UNIQUE (owner, entity,
  name); partial unique index = ONE default per (owner, entity). Web-app role
  gets full DML (defensive grant, 0050 pattern); pipeline/backend identities
  get nothing — views are purely a GUI concern.
- **Repository** (EngagementsRepository): `listTickets(filter?)` composes a
  parameterized WHERE (status/priority/accountId/openedWithinDays);
  `ticketFilterOptions()` returns the DISTINCT values present;
  `listSavedViews(entity, viewerEmail)` returns mine + shared;
  `createSavedView` upserts by (owner, entity, name) and clears the prior
  default when making a new one; `deleteSavedView` is owner-only, with an
  admin override for shared-view cleanup.
- **Tickets page**: a Filters block (GET form → URL params, shareable links),
  view chips (mine + shared, star = my default, users icon = shared), "Save
  current filters as…" with share/default toggles. Resolution order: explicit
  URL params → `?view=` → my default view → all tickets.
- **Authorization (ADR-0045):** view writes require `tickets:write` (all
  roles hold it — views aren't sensitive); deletes check ownership in SQL,
  admins may delete any.
- Mock repo degrades to empty lists, so the page is safe before the migration
  is applied.
- **Amended for #92 (2026-06-11):** `updateSavedView(id, {name?, isDefault?},
  ownerEmail)` completes the lifecycle — rename an existing view and make/clear
  it as my default without re-creating it. Ownership is enforced in the UPDATE's
  WHERE clause (non-owners update 0 rows); setting default clears the owner's
  previous default first. UI: a per-chip manage menu (`<details>`, no client JS)
  on views you own — rename / make-or-clear default / delete. Visibility and
  ownership rules are covered by `saved-views.test.ts`.

## Consequences

### Security impact

All filter values are bound parameters — no SQL text interpolation. Views are
readable only by their owner unless explicitly shared. Owner resolution is by
the session's Entra email against the `app_user` mirror (ADR-0016).

### Cost impact

One small table; two extra SELECT DISTINCTs per page load (trivial at this
data size).

### Operational impact

Apply migration 0052. No app settings. Future list pages reuse the table with
a new `entity_type`.

## Future considerations

Views for tasks/contacts/devices; ~~a queue filter once Autotask queue lands in
silver (bronze has `queue_id`)~~ — **shipped 2026-06-12 (#219)**, see the update
below; per-view column layouts; org-managed "pinned" views.

## Update 2026-06-12 — queue filter (#219)

Migration **0074** adds `ticket.queue` (nullable text + index); the cloud
pipeline's `mergeTicketSources` maps bronze `autotask_tickets.queue_id` into it
(ImperionCRM_Pipeline follow-up PR, sequenced after the migration). The filter
block gains a **Queue** select, `TicketFilter`/`ticketFilterOptions()` gain
queue/queues, and saved views may persist `queue` (FILTER_KEYS).

**Label decision (documented in the 0074 header):** `queue` stores the RAW
Autotask `queue_id` picklist value as text — Autotask labels live behind the
`/Tickets/entityInformation/fields` picklist endpoint and resolving them is
deferred polish (a pipeline/on-prem concern). Filtering and saved views are
correct on raw ids; a future label lookup decorates at read time or backfills,
no schema change either way.

**Degradation:** the queues lookup is guarded separately in
`ticketFilterOptions()` so a not-yet-applied migration degrades to "no queue
select" without breaking the existing filters; the select also hides itself
while no ticket carries a queue.
