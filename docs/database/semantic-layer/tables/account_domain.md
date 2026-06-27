---
type: Silver Table
title: account_domain
entity: account_domain
archetype: H
description: Per-account registry of tracked client domains — the operator-curated + entra-derived list that is both the DNS public-resolve worklist and the client-communications filter substrate (which domains count as a DB client).
resource: ../../../decision-records/ADR-0126-client-communications-capture-model.md
tags: [silver, security, identity, domain, dns, communications, registry]
data_class: operational
timestamp: 2026-06-26T12:00:00Z
---

# account_domain

The per-account registry of **tracked client domains** — one row per `(account_id, domain)`.
Reference/identity archetype (**H**): a small, curated mapping table, not a merge product.
Migration `0081` (ADR-0063 amendment 2026-06-12). It answers one question — *"which domains
belong to this client?"* — and two consumers depend on the answer:

1. **DNS posture** ([ADR-0063](../../../decision-records/ADR-0063-dns-posture-tracking.md)):
   the public-resolve worklist iterates this list; drift rolls up per `(account_id, domain)`
   into [`dns_domain`](dns_domain.md).
2. **Client-communications filter**
   ([ADR-0126](../../../decision-records/ADR-0126-client-communications-capture-model.md),
   epic [#1366](https://github.com/markdconnelly/ImperionCRM/issues/1366) gap (b),
   issue [#1368](https://github.com/markdconnelly/ImperionCRM/issues/1368)): comms are pulled
   from Imperion's **own** tenant and retained **only** when the counterpart's domain is a
   tracked client domain here. This registry (plus the onboarded client contacts) is the
   filter substrate — non-client traffic is dropped.

## Source of record / authority

`account_domain` is the **system of record for which domains a client owns/uses**. Rows enter
two ways, both write to the same table (the GUI holds the write grant — `mgid-imperioncrm-web-prd`
has `SELECT, INSERT, DELETE`):

- **Operator-curated** — an admin adds/removes a domain via the GUI (the Dark Web ID /
  client-mapping domain surface, [#1161](https://github.com/markdconnelly/ImperionCRM/issues/1161)).
- **Entra-derived (`created_by = 'derived:entra'`)** — the onboarding→contact-filter loop: when
  a client tenant is mapped, the account's VERIFIED, non-initial M365 domains are derived via
  `account → account_tenant → entra_domains` and idempotently upserted
  (`ON CONFLICT (account_id, domain) DO NOTHING` — a derivation pass **never** clobbers an
  operator-curated row). `*.onmicrosoft.com` initial domains are excluded (not mail domains).

The derivation runs on tenant-mapping (FE write step, ADR-0126 gap (b)). The **recurring bulk
re-derivation across all accounts** co-locates with the Entra-domains ingestion in the local
pipeline (LocalPipeline ADR-0026, *merge co-locates with ingestion* — the cross-repo contract in
the system CLAUDE.md §11) — a sibling concern, not a front-end process; both copies are
idempotent replace-from-source, so they are gap-free.

## Schema

| Column | Type | Notes |
|---|---|---|
| `account_id` | uuid | FK → `account` (ON DELETE CASCADE); part of PK |
| `domain` | text | the tracked domain (lower-cased on derive); part of PK |
| `note` | text | optional operator note / derivation provenance |
| `created_by` | text | `'derived:entra'` for derived rows, else operator identity |
| `created_at` | timestamptz | default `now()` |

Primary key `(account_id, domain)` — the idempotency key for both write paths.

## Joins

- `account_id` → [`account`](account.md) (the owning client).
- `domain` ↔ [`dns_domain`](dns_domain.md) / `dns_golden` / `dns_records` (the DNS rollups read
  this list as their monitored-domain SoR).
- Derivation path: `account_tenant` (account→tenant) → `entra_domains` bronze (verified domains
  per tenant). The same path that scopes per-client security-posture collectors (ADR-0126 §4).
- Comms filter (consumer, [#1369](https://github.com/markdconnelly/ImperionCRM/issues/1369)):
  the client-communication silver entity joins a captured message's counterpart domain back to
  this registry to decide retention.

## Notes

Domains are client-identifying — keep specific domains out of this doc; resolve against the live
read-only DB. PII boundary: this table holds **domains only**, never message content or personal
addresses; the captured comms it gates are `client_pii` and live elsewhere (ADR-0126). No
secrets, no code knowledge here (ADR-0086 conformance).
