# ADR-0105: Two-axis RLS access spine — Entra claims enforced at the storage layer

> **Number is a placeholder.** ADR-0105 is claimed at MERGE per system CLAUDE.md §10.3
> — the branch that merges second renumbers. Likewise the migration is authored as
> `0152_app_user_group_ids.sql` against a placeholder.

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Proposed |
| **Date** | 2026-06-20 |
| **Cross-references** | ADR-0042 (four-repo split / schema ownership) · ADR-0035 (backend Easy Auth + caller allowlist) · ADR-0016/0030 (`app_user` mirror, role claims) · ADR-0045 (fail-closed RBAC) · ADR-0103 (credential registry) · ADR-0104 (OKF grounding cortex) · epic #967 / #966 |

## Problem

The tiered-knowledge architecture (#966) introduces **personal** knowledge drawers alongside
**company** data. An agent acting *as* a user must never reach data that user could not reach
themselves, and one employee's personal drawer must be invisible to another employee **even
when both have full company access**. Today there is **zero** row-level enforcement in the
database: every app query runs with the app's managed identity and sees all rows. Access is
enforced only in application code — a single missing guard, or a misbehaving agent, reads
across the boundary. We need a hard floor at the storage layer.

## Context

Verified against live prod (2026-06-20, read-only pg-MCP):

- Tables are owned by the Entra admin `Mark@ImperionLLC.com` (via `scripts/migrate.mjs`).
- The app login roles `mgid-imperioncrm-web-prd` (FE) and `mgid-imperioncrmbackendfunction`
  (BE) are **non-owner, non-superuser, non-BYPASSRLS** → RLS policies **will** enforce on app
  queries with **no `FORCE ROW LEVEL SECURITY`** needed. The table-owner admin bypasses RLS by
  ownership → that *is* the audited admin god-view the design calls for.
- `pg_policies` count is **0** — greenfield, no policy to migrate.
- FE fires `pool.query()` directly (no transaction); BE already uses `withTransaction()`.
- Entra `oid`, `groups`, and `roles` claims are all available server-side in the Auth.js
  callbacks; the app already mirrors `app_user.roles` on sign-in.

## Options considered

1. **Application-only enforcement (status quo).** Every read path checks ownership/role in TS.
2. **Option B — connection/role-per-identity.** Mint a Postgres login per employee and rely on
   native role privileges.
3. **Option A — `SET LOCAL app.oid/app.groups` + `current_setting()` in RLS policies.** One app
   role; the caller's claims are injected into each request's transaction as GUCs; policies
   read them.

### Tradeoffs

- **(1)** is the current leak surface — one missed guard = cross-tenant read; an agent with a
  broad tool reaches anything. Not a floor. Rejected.
- **(2)** is impossible here: Entra auth is **1:1 app-principal → DB role**; you cannot derive a
  per-employee Postgres login from an Entra *user* token. Dead end. Rejected.
- **(3)** works with the existing single managed-identity pool and the verified non-BYPASSRLS
  app roles. The cost is a transaction wrapper on the FE data layer (BE is already
  transactional). Chosen.

## Decision

Adopt **Option A — two-axis RLS** as the storage-layer floor of the access spine (#967):

- **Two axes, both active at once.**
  - *Personal / owner axis* — `USING (owner_user_id = current_setting('app.oid')::uuid)`.
  - *Company / role axis* — `USING (required_role = ANY(current_setting('app.groups')::text[]))`.
- **Claim plumbing — `withIdentity(claims, fn)`** (`src/lib/db/identity.ts`): `BEGIN →
  set_config('app.oid', …, true); set_config('app.groups', …, true); → fn(client) → COMMIT`.
  `SET LOCAL` (via `set_config(..., is_local=true)`) is **mandatory** — a session-scoped `SET`
  on a pooled connection leaks identity onto the next borrower (a cross-user data bug). The
  helper is the only sanctioned way to carry identity into the DB session.
- **Group capture.** Sign-in persists the caller's raw Entra group object-ids to
  `app_user.group_ids` (migration 0152) — authoritative membership for the company axis,
  distinct from the lossy `app_user.roles` projection. GUIDs arrive in the `groups` claim or,
  under the live `emit_as_roles` config (#169), the `roles` claim; both are scanned.
- **Admin god-view** = the table-owner admin bypassing RLS by ownership (explicit, and audited
  at the app layer) — not a silent superuser.
- **Curation service identity** (slice 3, #976) is the *only* actor permitted to move knowledge
  across the personal→company wall: a managed identity with a narrow, audited write-scope and
  its own ledger; it cannot impersonate a user.
- **`app.groups` serialization** is a Postgres `text[]` literal (`{"a","b"}`), read by policies
  as `current_setting('app.groups', true)::text[]`. Whether its elements are normalized app
  roles or raw group GUIDs is fixed when slice 3 writes the company policies; slice 1's plumbing
  is agnostic.

Delivered in three slices: **slice 1 (#974, this ADR)** ships the `withIdentity` helper +
`group_ids` capture with **no policies enabled** (zero behavior change); **slice 2 (#975)**
enables the first owner-axis policy on a pilot personal table; **slice 3 (#976)** adds the
company policies, the audited god-view, and the curation identity.

## Consequences

### Security impact

Strongly positive: the database becomes the hard floor — even a misbehaving agent or a missed
application guard cannot read across the boundary once policies are enabled. The leak-safety of
the helper (`SET LOCAL` only, inside a transaction) is pinned by `identity.test.ts`. Group
object-ids are non-secret directory identifiers (no PII, no secrets on the row).

### Cost impact

Negligible. One pooled connection per request transaction (FE already pools); no new
infrastructure.

### Operational impact

The FE data layer must adopt `withIdentity` on the paths that touch RLS-guarded tables (done
incrementally, table-by-table, starting slice 2). Migrations are Mark-gated per prod apply.
Before enabling any policy in prod, re-verify the live role attributes (non-BYPASSRLS) and the
`pg_policies` baseline.

## Future considerations

- Blob access (personal artifacts) carries the same two-axis rule via owner-scoped
  containers/prefixes + scoped SAS keyed to `oid`/role — out of scope for slice 1.
- Agent-framework retrieval scoping (grounding-cortex, ADR-0104) consumes the same claims so an
  agent inherits, never exceeds, the caller's reach.
- The exact `required_role`/`app.groups` element vocabulary (app-role slugs vs group GUIDs) is
  decided with the slice-3 company policies.
