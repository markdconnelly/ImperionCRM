# Client-communications filter contract

How raw, Imperion-tenant communications are scoped to **DB clients** and projected into the
unified [`client_communication`](semantic-layer/tables/client_communication.md) silver
entity. Governing decision:
[ADR-0126](../decision-records/ADR-0126-client-communications-capture-model.md) (epic
[#1366](https://github.com/markdconnelly/ImperionCRM/issues/1366), this slice
[#1369](https://github.com/markdconnelly/ImperionCRM/issues/1369)).

This document specifies the **filter/merge contract**. The merge job that *applies* it
co-locates with whichever plane ingests the bronze (LocalPipeline **ADR-0026**, "merge
co-locates with ingestion") and is a **sibling follow-up** — it is intentionally **not**
built in this front-end PR (the front end owns the schema + the OKF meaning, ADR-0042 §1).

## What is captured (and what is not)

| Captured (own tenant, client-filtered) | Not captured |
|---|---|
| Direct client↔employee **email** | Internal-only email/chats/meetings (no client participant) |
| Client↔employee **Teams chats** | Anything pulled from a **client tenant** (no Mail/Chat/Calendars grants) |
| Client↔employee **Teams meetings** | **Message bodies / transcripts** (only subject + snippet stored) |
| Client↔employee **social DMs** (Meta Messenger / IG, ADR-0124) | Personal-cell **texting** (out of scope, no capture path) |

## The filter rule

A raw home-tenant message is retained as a `client_communication` **iff** at least one of
its **non-Imperion** participant addresses resolves to a DB client. Participants considered:

- **email** — `from`, `to`, `cc` addresses (`m365_mail_messages`)
- **teams_chat** — member emails (`m365_teams_chats.member_emails`)
- **teams_meeting** — organizer + attendee addresses (`m365_teams_meetings`)
- **social_dm** — the DM counterparty handle/address (Meta Messenger / IG DM bronze)

A participant address resolves to a client by **either** test:

1. **Domain match** — `lower(split_part(address,'@',2))` equals an
   [`account_domain`](semantic-layer/tables/account.md)`.domain` entry (the GUI-curated
   per-account domain list, migration 0081 / [#1368](https://github.com/markdconnelly/ImperionCRM/issues/1368)).
   → stamps `account_id`.
2. **Contact match** — the address exactly equals an onboarded
   [`contact`](semantic-layer/tables/contact.md) email tied to an account.
   → stamps `account_id` (+ `contact_id` when exactly one contact matches).

**Exclusion:** Imperion's own verified domains are removed from the "client participant"
set before the test, so a thread between only Imperion employees never matches.

**Direction:** `inbound` when the resolved client participant is the sender, `outbound`
when an Imperion employee is the sender. (`internal` is impossible by construction — an
internal-only message is dropped, not stored.)

**Account/contact stamping:** when multiple clients match a single message (a cross-client
thread), the merge emits **one row per matched account** (each scoped to that client),
keeping every client's history complete without leaking another client's participants —
`client_participants` is restricted to the row's own account.

## Idempotency (the merge upsert key)

`UNIQUE (channel, source_system, external_id)` is the merge key — idempotent
replace-from-source (LP ADR-0026). `content_hash` carries change detection so an unchanged
re-poll is a no-op. `thread_ref` (e.g. the m365 `conversation_id`) groups a thread for the
GUI without being part of the key.

## Onboarding loop

Onboarding a client **adds its domains/users to the filter** (ADR-0126 #2): new
`account_domain` rows + onboarded `contact` emails immediately widen what subsequent merges
retain. Until `account_domain` is populated (#1368) the filter has **no substrate** and
capture stays unfiltered/home-tenant-only — the hard dependency the epic tracks.

## Privacy posture (client_pii)

`client_communication.data_class = client_pii` — among the most sensitive rows in the
system. The filter **is the privacy control**: a correctly-scoped filter is what keeps
non-client traffic out. Content is deliberately minimal (subject + snippet, never bodies);
the rich timeline/transcript stays in [`interaction`](semantic-layer/tables/interaction.md)
/ object storage. Reads are subject to the standard RLS read-predicate and action-plane
ceilings (ADR-0118).

## Follow-ups (not in this PR)

- **Bronze→silver merge job** (applies this filter) — sibling LP/Pipeline issue per
  ADR-0026 (cloud Pipeline for live/webhook email/chat; on-prem LP for bulk). Tracked under
  epic #1366 alongside (d) "revive the 3 dead collectors" (LP #380).
- **`account_domain` hydration + onboarding→contact-filter loop** — #1368.
- **Social-DM fold-in** to this unified history — #1370 (relates #1338).
- **GUI surface** rendering the per-account unified history (the read repository added here
  is the data seam).
