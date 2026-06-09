# Company credential configuration — database to-do

Corresponds to **ADR-0036** (Settings → Company credentials). This repo is the **single
source of truth for the schema** (CLAUDE.md §6); the backend and pipeline are consumers.
Migration **0033** is committed **and applied to prod** (verified 2026-06-08).

## Status

- **Committed:** `db/migrations/0033_connection_providers_credentials.sql`
  - adds `connection_provider` values: `myitprocess`, `televy`, `quotemanager`, `gdap`
  - adds `connection_status` value: `pending`
  - adds partial unique index `uq_connection_company_provider` on `(provider) WHERE
    scope = 'company'` so company credentials upsert (re-save = rotate, not duplicate)
- **Applied range in prod:** 0001–0043 (the company-credentials migration 0033 applied &
  verified 2026-06-08; later sets 0034–0043 since).

## Done

### 1. ✅ Migration 0033 applied to prod (2026-06-08)
Applied via the `db/README.md` Entra-token method. The `connection_provider` enum now
includes `myitprocess`, `televy`, `quotemanager`, `gdap` (alongside `apollo`); the
`connection_status` enum includes `pending`; and the partial unique index
`uq_connection_company_provider` is present. Verified directly against prod.

### 2. Re-verify query (reference)
```sql
SELECT unnest(enum_range(NULL::connection_provider));   -- includes myitprocess/televy/quotemanager/gdap
SELECT unnest(enum_range(NULL::connection_status));     -- includes pending
SELECT indexname FROM pg_indexes WHERE indexname = 'uq_connection_company_provider';
```

### 3. Follow-ups (when the sync engines land)
- [ ] The pipeline writes `connection.sync_cursor` + `last_sync_at` + `status` per company
      provider so the Settings cards can show live health (today they show `pending`/`active`).
- [x] Update the ERD in [`data-model.md`](data-model.md) to reflect the extended
      `connection_provider` / `connection_status` enums (CLAUDE.md §8). *(done 2026-06-08)*
- [ ] If credential validation is added backend-side (see backend to-do), no schema change
      is needed — status already covers `error`.

## Invariant

The credential **secret never lives in this database** — only `connection.keyvault_secret_ref`
(a Key Vault secret name) and `status`. The backend writes the secret to Key Vault and
returns the reference; the web app persists the reference here (CLAUDE.md §5).
