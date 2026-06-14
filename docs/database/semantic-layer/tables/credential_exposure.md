---
type: Silver Table
title: credential_exposure
description: Breached/exposed credential surfaced from Dark Web ID — matched to contact/account by email+domain; status workflow.
resource: ../../../decision-records/ADR-0040-darkwebid-televy-ingestion.md
tags: [silver, security, exposure, darkwebid]
timestamp: 2026-06-14T00:00:00Z
---

# credential_exposure

A compromised-credential finding ingested from Dark Web ID and matched to a contact /
account. Governed by
[ADR-0040](../../../decision-records/ADR-0040-darkwebid-televy-ingestion.md); union view
`exposure_bronze_all`. (Ingestion is wired but gated until the API key is configured.)

## Source of record / authority

**Dark Web ID is the source** (`darkwebid_exposures` bronze). Matched to silver by **email
and account domain**. `status` is a remediation workflow (`new` → `acknowledged` →
`resolved`); `first_seen_at` / `last_seen_at` bound the finding.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `contact_id` / `account_id` | uuid | matched subjects (nullable) |
| `email` | text | matched identity — sensitive |
| `breach_source` / `breach_date` | text / date | |
| `exposed_data` | text[] | classes of data exposed |
| `password_status` | text | e.g. plaintext / hashed |
| `severity` | text | |
| `status` | text | new / acknowledged / resolved |

## Joins

- `contact_id` → `contact`; `account_id` → `account`. Bronze via `exposure_bronze_all`.
- Feeds the security dashboard and exposure-response workflows.

## Notes

Exposed emails and breach detail are **highly sensitive personal/security data** — never
inline any row-level value; resolve against the live read-only DB.
