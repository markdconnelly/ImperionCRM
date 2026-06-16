# CMDB Configuration Item register

> Audience: platform admins. Surface: **CMDB** (`/cmdb`). Epic: **#372** (CMDB
> relationships + impact + asset lifecycle). Decision record: **ADR-0078**. Issue:
> **#645** (the foundation slice — later slices #647–653 ride on this read-model).

## What this is

The CMDB register is a **read-only Configuration Item (CI) view** projected over the
**existing silver inventory** the platform already holds. It is the foundation of the
CMDB cluster: a clean `cmdb_ci` union read-model that later slices (relationships,
impact, asset lifecycle) extend.

There is **no new ingest, no new bronze, and no schema change** — every CI is a
projection over a silver entity that is already populated by the pipeline.

## The CI model (v1)

| CI type | Projected over | Notes |
|---|---|---|
| **Account** | silver `account` | The managed client itself. |
| **End-user** | silver `contact` (account-scoped) | A managed-estate end-user identity. |
| **Device** | silver `device` | A managed device / asset. |

Every CI is tagged with its `ci_type`, a stable `ci_id`, and its **owning
`account_id`** (+ resolved account name). Because `ci_id` is unique only *within* a
type, the cross-union key is the `${ci_type}:${ci_id}` pair — that is what the detail
route (`/cmdb/<type>/<id>`) keys on.

### Staff / internal exclusion

The register is the **client managed estate only**. Imperion staff and admin
identities are **excluded**:

- The `end-user` CI is silver `contact` (client identities). Imperion employees are
  modelled as `app_user`, a different table the union never touches.
- Every CI additionally requires a non-null owning `account_id`, so an account-less or
  unlinked row can never enter the set (`isClientCi` / `account_id IS NOT NULL`).

This is conservative by design: an identity that cannot be attributed to a client
account is dropped rather than shown.

## Using the register

- The list shows every CI with its type, owning account, and key attributes.
- **Filter** by CI type (chips) and by account (dropdown); both filters compose.
- Click any CI to open its **detail view** — the owning account (links to the Account
  360) plus the CI's key attributes.

## Access

Admin-only (ADR-0030), the same gate as Settings and AI Agents (`canSeeCmdb`). The nav
entry is hidden and the route redirects for non-admins. The register is **read-only** —
there is no write path, so no `policy.ts` capability is added. Manage each item in its
source system; the CMDB never writes.

## Implementation

- Union read-model: `crm.listConfigurationItems()` — a SQL `UNION ALL` over `account`,
  `contact`, and `device` in `postgres-repositories.ts`; the **mock returns `[]`** so
  the page renders empty (never crashes) when silver is empty.
- Pure helpers + the staff-exclusion rule: `src/lib/cmdb/ci.ts` (unit-tested).
- Surface: `src/app/(app)/cmdb/` (register + `[type]/[id]` detail),
  `src/components/cmdb/ci-register.tsx`.
