---
type: Silver Table
title: client_communication
entity: client_communication
archetype: B
description: Unified, client-scoped direct client↔employee communications (email/Teams chat/Teams meeting/social DM) — the filtered projection of Imperion's own-tenant comms, born from the bronze→silver merge.
resource: ../../../decision-records/ADR-0126-client-communications-capture-model.md
tags: [silver, communications, m365, privacy, client_pii]
data_class: client_pii
timestamp: 2026-06-26T12:00:00Z
---

# client_communication

The unified **client-relationship communications history**: one row per direct
client↔employee message across channels — email, Teams chat, Teams meeting, and
social-media DM — captured from **Imperion's own tenant** and **filtered to only clients
that exist in the DB**. Governed by
[ADR-0126](../../../decision-records/ADR-0126-client-communications-capture-model.md);
migration `0211_client_communication_silver.sql` (placeholder number, claimed at merge).

This is deliberately **distinct** from [`interaction`](interaction.md) (the unfiltered,
multi-purpose Contact-360 timeline, ADR-0011). `interaction` is the rich research substrate
carrying full bronze/silver/gold payloads, meeting drill-downs, ad engagements, and notes;
`client_communication` is the narrower, **filter-defined**, PII-minimal ledger of the
client relationship's direct correspondence — subject + snippet only, **never bodies**.

## Source of record / authority

**Single source of record: Imperion's own tenant** (ADR-0126). Client communications are
captured from the employee side of the conversation in Imperion's home tenant — client
tenants are **never** granted `Mail.Read` / `Chat.Read` / `Calendars.Read`, so comms are
never pulled from client tenants. Each row is **born silver** from the bronze→silver merge
that applies the client filter (archetype **B**).

Idempotency is by `(channel, source_system, external_id)` — the merge upsert key
(idempotent replace-from-source, LocalPipeline **ADR-0026**, "merge co-locates with
ingestion"). Per that rule the merge **co-locates with whichever plane ingests** the bronze: the cloud
Pipeline owns live/webhook-driven merges, the on-prem Local Pipeline owns bulk/scheduled
merges. The merge job itself is a **sibling follow-up**, not built in the front end.

### The client filter (the entity's defining rule)

A raw home-tenant message is retained as a `client_communication` **iff** any of its
**non-Imperion** participant addresses (email from/to/cc; Teams chat/meeting members; the
DM counterparty) resolves to a DB client by either:

1. **Domain match** — the address domain equals an entry in
   [`account_domain`](account.md)`.domain` (the GUI-curated per-account domain list,
   mig 0081 / #1368); resolves the `account_id`.
2. **Contact match** — the address exactly equals an onboarded
   [`contact`](contact.md) email for an account; resolves `account_id` (+ `contact_id`).

For **`social_dm`** there is **no email address** — the counterparty is a Meta/IG
**handle/PSID**, so neither email test applies. Social DMs resolve the client by the
**social-handle link** instead: the DM counterparty is matched against
[`contact_social_identity`](contact_social_identity.md) (the link the Meta merge already maintains), which
resolves the `contact_id` and its `account_id`. There is **no domain fallback** for social
DMs. Full mapping: [social-dm-foldin.md](../../social-dm-foldin.md) (#1370, ADR-0124).

Imperion's own domains (and its own Page/IG account) are excluded from the "client
participant" test, so purely-internal threads never match. **Onboarding a client adds its
domains/users — and, for social, its linked handles — to the filter** (ADR-0126 #2). Until
`account_domain` is populated (#1368) the email/Teams filter has no substrate and capture
stays unfiltered/home-tenant-only — the dependency the epic tracks.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` | uuid | FK → `account` (CASCADE) — the matched DB client; stamped by the filter |
| `contact_id` | uuid | FK → `contact` (SET NULL) — the matched client contact when a single one resolves |
| `channel` | enum `client_communication_channel` | `email` · `teams_chat` · `teams_meeting` · `social_dm` (folds Meta Messenger/IG DMs, ADR-0124) |
| `direction` | enum `client_communication_direction` | `inbound` (client→employee) · `outbound` (employee→client). No `internal` — internal traffic is filtered out, never stored |
| `client_participants` | text[] | the matched client-side addresses/handles (minimal PII) |
| `imperion_participants` | text[] | the employee-side addresses |
| `subject` | text | header subject (PII-minimal) |
| `snippet` | text | short truncated preview — **never the full body** (ADR-0126 privacy posture) |
| `occurred_at` | timestamptz | message/meeting time (timeline position) |
| `source_system` | text | bronze source: `m365_email` · `m365_teams` · `meta_messenger` · `instagram_dm` |
| `external_id` | text | source's stable id (Graph message/chat id, DM id) |
| `thread_ref` | text | conversation/thread id for grouping (e.g. m365 `conversation_id`) |
| `content_hash` | text | change detection for the idempotent re-merge |
| `data_class` | text | `client_pii` (ADR-0118 third RLS axis; always-gate) |
| `ingested_at` / `created_at` / `updated_at` | timestamptz | provenance / audit |

`UNIQUE (channel, source_system, external_id)` is the merge upsert key.

## Joins

- `account_id` → [`account`](account.md) (CASCADE) — the client the history rolls up to;
  the axis the GUI groups by.
- `contact_id` → [`contact`](contact.md) (SET NULL) — the specific client person, when
  resolvable.
- **Bronze feeds:** `m365_mail_messages`, `m365_teams_chats`, `m365_teams_meetings`
  (mig 0065) → filtered by [`account_domain`](account.md) + `contact`; **+ the Meta DM
  bronze** `facebook_messages` (0075, `source_system = meta_messenger`) and
  `instagram_messages` (0206, `source_system = instagram_dm`) for `channel = social_dm`,
  filtered by `contact_social_identity` (handle link, **no domain path**) — see
  [social-dm-foldin.md](../../social-dm-foldin.md) (#1370, ADR-0124).
- **Neighbor (not a FK):** [`interaction`](interaction.md) is the broader timeline over the
  same bronze; `client_communication` is the filtered, PII-minimal client-relationship
  projection. The two are kept separate by design (ADR-0126).

## Notes

Among the most sensitive rows in the system — direct client correspondence,
`data_class = client_pii`, subject to the standard RLS read-predicate and action-plane
ceilings. **Content is deliberately minimal** (subject + snippet only; no bodies, no
transcripts). Never inline message content here; resolve specifics against the live
read-only `postgres` MCP at query time (CLAUDE.md §8).
