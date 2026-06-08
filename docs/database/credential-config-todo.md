# Company credential configuration — database to-do

Corresponds to **ADR-0030** (Settings → Company credentials). This repo is the **single
source of truth for the schema** (CLAUDE.md §6); the backend and pipeline are consumers.
Migration **0027** is committed here but **not yet applied to prod**.

## Status

- **Committed:** `db/migrations/0027_connection_providers_credentials.sql`
  - adds `connection_provider` values: `myitprocess`, `televy`, `quotemanager`, `gdap`
  - adds `connection_status` value: `pending`
  - adds partial unique index `uq_connection_company_provider` on `(provider) WHERE
    scope = 'company'` so company credentials upsert (re-save = rotate, not duplicate)
- **Applied range in prod:** 0001–0026.

## To do

### 1. Apply migration 0027 to prod  ⚠️ requires `az` + `psql` (not available in the build env)
This was **not** run automatically — it needs an Azure login, a Postgres client, and a
firewall rule for the client IP, and it touches the prod database. Run it yourself
(per `db/README.md`):

```bash
PGUSER="Mark@ImperionLLC.com"   # an Entra admin / granted principal on the server
PGPASSWORD="$(az account get-access-token \
  --resource https://ossrdbms-aad.database.windows.net \
  --query accessToken -o tsv)"
export PGUSER PGPASSWORD
psql "host=imperioncrm-pg-prd.postgres.database.azure.com port=5432 dbname=imperioncrm sslmode=require" \
  -v ON_ERROR_STOP=1 -f db/migrations/0027_connection_providers_credentials.sql
```

Notes:
- **Safe to apply:** no migration seeds the `connection` table, so the new unique index
  cannot collide with existing rows. All statements are idempotent
  (`ADD VALUE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
- **Not wrapped in a transaction:** Postgres requires `ALTER TYPE ... ADD VALUE` to run
  outside `BEGIN/COMMIT` — that's intentional in 0027.
- **Ordering:** apply **before** the backend `/credentials` endpoint goes live, since the
  web app writes `status='pending'` and the new provider values on save.

### 2. Verify after applying
```sql
SELECT unnest(enum_range(NULL::connection_provider));   -- includes myitprocess/televy/quotemanager/gdap
SELECT unnest(enum_range(NULL::connection_status));     -- includes pending
SELECT indexname FROM pg_indexes WHERE indexname = 'uq_connection_company_provider';
```

### 3. Follow-ups (when the sync engines land)
- [ ] The pipeline writes `connection.sync_cursor` + `last_sync_at` + `status` per company
      provider so the Settings cards can show live health (today they show `pending`/`active`).
- [ ] Update the ERD in [`data-model.md`](data-model.md) to reflect the extended
      `connection_provider` / `connection_status` enums (CLAUDE.md §8).
- [ ] If credential validation is added backend-side (see backend to-do), no schema change
      is needed — status already covers `error`.

## Invariant

The credential **secret never lives in this database** — only `connection.keyvault_secret_ref`
(a Key Vault secret name) and `status`. The backend writes the secret to Key Vault and
returns the reference; the web app persists the reference here (CLAUDE.md §5).
