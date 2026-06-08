# Database migrations

Raw SQL migrations for the Imperion CRM PostgreSQL + pgvector store (ADR-0003,
ADR-0017). Schema design lives in [docs/database/data-model.md](../docs/database/data-model.md).

## Layout

```
db/migrations/NNNN_description.sql   -- ordered, idempotent, transactional
```

- Apply in filename order. Each file is wrapped in `BEGIN; … COMMIT;` and uses
  `IF NOT EXISTS` / idempotent guards, so re-running is safe.
- One migration per schema change; never edit an applied migration — add a new one.
- Update the ERD in `docs/database/data-model.md` with every schema change
  (CLAUDE.md §8).

## Target

- Server: `imperioncrm-pg-prd.postgres.database.azure.com` (Azure Flexible Server,
  PostgreSQL 18), database **`imperioncrm`**.
- **pgvector** must be allowlisted on the server before `0001` runs:
  `az postgres flexible-server parameter set -g Imperion_CRM -s imperioncrm-pg-prd --name azure.extensions --value VECTOR`

## Applying a migration (Entra token — no stored password)

The server has Microsoft Entra auth enabled, so connect with a short-lived AAD
access token as the password — nothing secret is stored or printed:

```bash
# Username = your Entra principal (must be an Entra admin / granted role on the server)
PGUSER="Mark@ImperionLLC.com"
PGPASSWORD="$(az account get-access-token \
  --resource https://ossrdbms-aad.database.windows.net \
  --query accessToken -o tsv)"
export PGUSER PGPASSWORD
psql "host=imperioncrm-pg-prd.postgres.database.azure.com port=5432 dbname=imperioncrm sslmode=require" \
  -v ON_ERROR_STOP=1 -f db/migrations/0001_phase1_core.sql
```

Prerequisites: a firewall rule allowing your client IP, and your Entra principal
configured as a Postgres Entra admin (or granted the needed role). Password auth
with the server admin account also works if you prefer.

## Applying a migration (Node runner — no psql required)

When `psql` isn't installed, `scripts/migrate.mjs` applies **named, committed** migration
files using the same Entra-token model (no stored secret; TLS verified). It mints the
token from your logged-in `az` and uses your `az` identity as the DB user.

```powershell
node scripts/migrate.mjs 0035        # apply db/migrations/0035_*.sql
node scripts/migrate.mjs 0035 0036   # several, in the given order
node scripts/migrate.mjs --list      # list available migration files
```

It applies **only the file(s) you name** (never a blind "run everything", which would
re-fire the seed migrations); each migration is idempotent, so a named re-run is safe.
Connection defaults to prod and is overridable via `PGHOST` / `PGPORT` / `PGDATABASE` /
`PGUSER`; pass `PGTOKEN` to supply a token instead of shelling out to `az`.

## Phasing

`0001_phase1_core.sql` covers Phase 1 (CRM core spine, engagement timeline,
identity/RBAC). Later phases (integrations, demand gen, comms/consent, delivery,
agent platform + board, feedback) add their own numbered migrations per the
[build plan](../docs/architecture/product-requirements.md#build-phasing-schema-designed-now-built-in-order).
A typed query layer for the repository implementation (ADR-0007) is a separate,
later change; these migrations are the source of truth for the schema.
