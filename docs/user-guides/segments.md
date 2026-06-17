# Segments — reusable CRM contact sets (manual, bulk, or rule)

[← User guides](README.md)

A **segment** is a reusable set of contacts you can build once and use everywhere —
the enrollment source a marketing **journey** draws from, and a building block for
comms and list views. Find it in the left nav under **Marketing → Segments**, or
directly at `/segments`. Segments are a CRM concept and are **distinct from ad
audiences** (which target paid-media platforms): a segment is an internal grouping
over your own contacts and never syncs out.

Settled by [ADR-0073](../decision-records/ADR-0073-marketing-automation-journeys.md)
(decision 2); the data lives in the silver `segment` / `segment_member` tables
(migration 0126) and its meaning is in the
[semantic layer](../database/semantic-layer/tables/segment.md).

## Who can see it

The whole surface is gated by the **Marketing group guard** — **admin** or **sales**
roles. Creating, editing, and changing membership require the same marketing-capable
roles (`canManageCampaigns`); a viewer outside those roles never sees the page or its
controls. The gate is enforced server-side on every read and write.

## Two kinds of segment

- **Manual** — a *static* set. You add and remove contacts explicitly. Membership only
  changes when someone edits it.
- **Rule** — a *dynamic* set defined by a predicate over contact fields (e.g. *email
  contains "acme"* AND *account equals "Acme Corp"*). You preview the matches and
  materialize them into membership. The authoritative, scheduled recompute runs in the
  pipeline; the page lets you preview and add matches on demand.

## Building a segment

1. **New segment** (top-right) → give it a name and optional description, pick
   **Manual** or **Rule**.
2. For a **rule** segment, add clauses (field · operator · value) and choose whether
   **all** clauses must hold (AND) or **any** (OR). Operators: *contains*, *equals*,
   *starts with*, *is set*.
3. Save — you land on the segment's detail page.

## Adding and removing contacts

On a segment's detail page:

- **Add contacts** — search your contacts by name, email, or account; tick one or
  more and **Add**. Adding one is recorded as a *manual* add; adding several at once is
  a *bulk* add. Adding is **idempotent** — a contact already in the segment is never
  duplicated, and already-members are hidden from the picker.
- **Rule preview** (rule segments only) — shows how many contacts match the rule and
  aren't yet members; **Add matched contacts** materializes them (recorded as a *rule*
  add). A rule recompute only ever touches its own rule-sourced rows, so manually
  pinned members are left alone.
- **Remove** — each member row has a Remove control.

Each member shows its **source** (manual · bulk · rule) so you can see how it got
there.

## Using a segment

A segment is the enrollment source a marketing **journey** draws from (ADR-0073). Build
the segment here, then point a journey at it to enroll its members. Segments are also a
natural basis for list views and targeted comms.
