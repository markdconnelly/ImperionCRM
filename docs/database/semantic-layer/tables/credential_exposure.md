---
type: Silver Table
title: credential_exposure
description: Breached/exposed credential surfaced from Dark Web ID — matched to contact/account by email+domain; status workflow.
resource: ../../../decision-records/ADR-0040-darkwebid-televy-ingestion.md
tags: [silver, security, exposure, darkwebid, merge]
timestamp: 2026-06-15T00:00:00Z
---

# credential_exposure

A compromised-credential finding ingested from Dark Web ID and matched to a contact /
account. Governed by
[ADR-0040](../../../decision-records/ADR-0040-darkwebid-televy-ingestion.md); union view
`exposure_bronze_all`. (Ingestion is wired but gated until the API key is configured.)

## Source of record / authority

**Dark Web ID is the single source** today (`darkwebid_exposures` bronze → `exposure_bronze_all`
union). Archetype **A** by pattern: the union is one-source now but built for future
breach feeds, and each finding is **matched** to silver subjects, not authored. The
remediation `status` (`new` → `acknowledged` → `resolved`) is app-owned and survives the
merge — the merge fills the match links and refreshes breach detail but never resets the
workflow state. `first_seen_at` / `last_seen_at` bound the finding window.

## Bronze match / merge

Pipeline `mergeExposureSources` (sibling `merge-security.ts`) folds each bronze row to a
silver exposure:

1. **Contact match** — `lower(email)` equality against `contact.email`.
2. **Account match** — the email's domain (or explicit `domain`), normalized, equals an
   account's `account_bronze_all.normalized_silver->>'domain'`.
3. **Dedup / upsert** — `ON CONFLICT (email, breach_source)` (the table's UNIQUE key): one
   silver row per credential-per-breach; re-ingestion refreshes `exposed_data` /
   `password_status` / `severity` / `last_seen_at` and **COALESCEs** the match links (never
   clears an existing link). `match_confidence` stamped on bronze = `0.9` when either
   subject matched, else `0.5`. Either link may be NULL (an exposure can land before its
   subject exists).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `contact_id` | uuid | FK → `contact` (SET NULL) — matched person, by email; nullable |
| `account_id` | uuid | FK → `account` (SET NULL) — owning company, by domain; nullable |
| `email` | text | the compromised login/email — **sensitive PII** |
| `breach_source` | text | e.g. a named breach; half of the UNIQUE dedup key |
| `breach_date` | date | |
| `exposed_data` | text[] | classes of data exposed — e.g. `password` · `email` · `phone` (NOT NULL, default `{}`) |
| `password_status` | text | `plaintext` · `hashed` · `none` · `unknown` |
| `severity` | text | `low` · `medium` · `high` (optional) |
| `status` | text | remediation workflow: `new` · `acknowledged` · `resolved` (default `new`) |
| `first_seen_at` / `last_seen_at` | timestamptz | finding window |

## Joins

- `contact_id` → `contact`; `account_id` → `account` (both SET NULL). Bronze origin via
  `exposure_bronze_all` (`darkwebid_exposures.exposure_id` back-link, stamped at merge).
- Feeds the security dashboard and the exposure-response workflow.

## Notes

Exposed emails and breach detail are **highly sensitive personal/security data** — never
inline any row-level value; resolve against the live read-only DB.
