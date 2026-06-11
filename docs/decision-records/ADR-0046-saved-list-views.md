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

Views for tasks/contacts/devices; a queue filter once Autotask queue lands in
silver (bronze has `queue_id`); per-view column layouts; org-managed "pinned"
views.
