---
type: Silver Table
title: segment
description: A general-purpose CRM contact set — manual (static) or rule (dynamic over contact fields) — with explicit membership. The enrollment source for marketing journeys and reusable for comms / list views. Distinct from an ad audience. Website system of record (app-native).
resource: ../../../decision-records/ADR-0073-marketing-automation-journeys.md
tags: [silver, marketing, segment, contact-set, app-native]
timestamp: 2026-06-17T00:00:00Z
---

# segment

A **general-purpose CRM contact set** (ADR-0073 decision 2, #420): a reusable grouping
of [`contact`](contact.md) rows that is either **manual** (a static set whose members
are added/removed explicitly) or **rule** (a dynamic set defined by a `rule_json`
predicate over contact fields, materialized into membership). It is the **enrollment
source** a marketing journey draws from (ADR-0073), and is reusable for comms, list
views, and reporting — a first-class CRM grouping, not a one-off campaign list. Membership
lives in the child [`segment_member`](#segment_member) table. Migration `9001`
(placeholder; real number claimed at merge, §10.3).

**Distinct from an ad audience** (ADR-0026). An ad `audience` / `audience_member` is the
paid-media targeting object that syncs OUT to ad platforms (Meta/Google) for delivery and
carries a platform audience id. A `segment` is an **internal** set over our own contacts
that never leaves the system. The two are deliberately separate tables with separate
lifecycles — a segment is for internal enrollment/comms/list-views, an audience is for ad
delivery.

## Source of record / authority

**Website system of record, app-native, born silver** (ADR-0042). The front end
**authors** the segment (create/edit, manual add/remove, bulk add) and **reads**
membership; processes (backend / local-pipeline) read it to **enroll** contacts into
journeys and to **recompute** a rule segment's membership from `rule_json`. The rule
predicate shape lives in the app (`lib/segment.ts`) so it is deterministic and
tunable — the recompute process reuses the same definition. Membership add is idempotent
via the `segment_member` UNIQUE `(segment_id, contact_id)` constraint: re-adding a
contact is a no-op, and a rule recompute UPSERTs.

A **rule** segment's membership is a **derived projection** — the recompute writer
replaces only its own `source='rule'` rows, leaving `manual` / `bulk` members pinned. A
**manual** segment carries no `rule_json` (CHECK-enforced) and its membership changes only
by explicit add/remove.

## Schema

### `segment`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | display name |
| `description` | text | optional |
| `type` | text | `manual` \| `rule`; CHECK; default `manual`. manual = static, explicit members; rule = dynamic, materialized from `rule_json` |
| `owner_user_id` | uuid | FK → `app_user` (ON DELETE SET NULL); who curates the segment |
| `rule_json` | jsonb | the membership predicate over contact fields (type=`rule` only; NULL for manual). Shape validated in the app, not the DB. CHECK pairs it with `type` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

CHECK `segment_rule_json_matches_type` — a `rule` segment must have `rule_json`; a
`manual` segment must not.

### `segment_member`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `segment_id` | uuid | FK → `segment` (ON DELETE CASCADE) |
| `contact_id` | uuid | FK → `contact` (ON DELETE CASCADE) |
| `added_by` | uuid | FK → `app_user` (ON DELETE SET NULL); who/what added the member |
| `source` | text | `manual` \| `bulk` \| `rule`; CHECK; default `manual`. How the row got there — lets a rule recompute scope its own rows |
| `added_at` | timestamptz | |

UNIQUE `(segment_id, contact_id)` — one membership row per contact per segment; add is
idempotent, rule recompute upserts.

## Joins

- `segment_member.segment_id` → `segment` (ON DELETE CASCADE): the members list of a
  segment; deleting a segment removes its membership.
- `segment_member.contact_id` → [`contact`](contact.md) (ON DELETE CASCADE): the member;
  "which segments is this contact in" reads the reverse. A rule segment is computed FROM
  `contact` fields (via `rule_json`) but the membership is materialized into rows, not a
  live FK.
- `segment.owner_user_id` / `segment_member.added_by` → [`app_user`](app_user.md) (ON
  DELETE SET NULL): curation/audit, not load-bearing for membership.
- **Downstream consumer:** the marketing journey ([`workflow`](workflow.md) kind=journey,
  ADR-0073) enrolls from a segment — `workflow.definition` holds source segment refs
  (held as data in migration 0115, an FK once segment landed). The backend journey runner
  (#398) reads `segment_member` to enroll contacts.

## Notes

A segment is an **internal CRM grouping** over contacts — it references contacts by id and
mints **no new client PII** of its own (`name` / `description` / `rule_json` are
internal grouping metadata). Member contact identity stays on [`contact`](contact.md);
resolve specific membership against the live read-only DB (CLAUDE.md §8). Bounded by the
contact base. Explicitly **not** an ad audience (ADR-0026) — it never syncs to an ad
platform.
