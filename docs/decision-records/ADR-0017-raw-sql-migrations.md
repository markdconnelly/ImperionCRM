# ADR-0017: Raw SQL migrations as the schema source of truth

- **Status:** Accepted
- **Date:** 2026-06-07

## Problem
Choose how the PostgreSQL schema is defined, applied, and evolved now that the
database is online and Phase 1 needs to be populated.

## Context
The store is PostgreSQL 18 + pgvector on Azure Flexible Server (ADR-0003). The app
talks to data through a repository abstraction (ADR-0007), today backed by mock data.
We need to create the Phase 1 schema and keep it versioned, reviewable, and
re-runnable, without prematurely committing to an ORM. The dev host cannot reliably
`npm install` (Defender locks node_modules), so a code-/ORM-generation step is
currently fragile, whereas plain SQL applies anywhere.

## Options considered
1. **Raw SQL migrations** (`db/migrations/NNNN_*.sql`), applied via psql / `az`.
2. **Drizzle ORM** migrations (TS-first, strong pgvector support, generates SQL).
3. **Prisma** migrations.

## Tradeoffs
- (1) transparent, reviewable diffs; no toolchain or `npm install` dependency to
  apply; works directly against the online DB; pgvector/HNSW and Postgres-specific
  features expressed natively. Hand-written; no compile-time types by itself.
- (2) TS types + a query builder that would pair well with the repository
  implementation later, but adds a dependency, a generation step, and relies on the
  currently-fragile local `npm install`; pgvector needs an extra adapter.
- (3) heavier; pgvector and Postgres extensions are awkward; migration model is
  opinionated.

## Decision
Use **raw SQL migrations** as the schema source of truth. Files are ordered,
idempotent, and transactional (`BEGIN…COMMIT`, `IF NOT EXISTS`, idempotent enum
guards). Applied with `psql` (or `az postgres flexible-server execute`) using a
short-lived **Entra access token** (the server has AAD auth enabled), so no database
password is stored. The ERD in `docs/database/data-model.md` is updated with every
migration. A typed query layer (e.g. Drizzle/Kysely) for the repository
implementation (ADR-0007) is a **separate, later** decision and does not need to own
the schema.

## Security impact
No DB password handled — connections use an Entra token from `az`, consistent with
the Entra-everywhere posture (ADR-0002/0016). `vector` must be allowlisted via
`azure.extensions`; firewall rules grant least-privilege client access and are
removed when not needed.

## Cost impact
None. No new dependencies.

## Operational impact
Migrations are applied manually in filename order for now; a lightweight runner (or
the chosen query tool's migrator) can automate ordering later. Never edit an applied
migration — add a new one. Keep `azure.extensions` allowlist in sync with extensions
used by migrations.

## Future considerations
Adopt a typed query layer/migrator once the repository implementation begins; wire
migration application into CI/CD against a non-prod database when one exists (today
there is a single server).
