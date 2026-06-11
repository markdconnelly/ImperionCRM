# ADR-0045: Server-action authorization (write capabilities) & fail-closed bootstrap

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-09 |
| **Cross-references** | — |

## Problem

ADR-0030 gave the app *roles* and gated the GUI (nav visibility, Settings/Security
routes, server-side revenue redaction). It did **not** gate the mutating server
actions: a stress test of the role model found that all ~48 `*/actions.ts` server
actions checked only *authentication*, never *authorization*. Any signed-in user —
including a sole-`support` user — could create/update/delete any object (accounts,
contacts, proposals, opportunities, tasks, SBRs, campaigns, settings/credentials)
and the GDAP admin-consent callback was not admin-gated. Compounding this, the
claims mapper (ADR-0030 §1) shipped a *temporary fail-open*: a user with no
recognized role claim defaulted to `admin`, so in the current deployment every
user was effectively admin.

## Context

Roles derive from Entra group/App-Role claims and ride the JWT/session
(`lib/auth/{roles,claims}.ts`, ADR-0030). The five roles are
`admin|finance|project_manager|sales|support`, default `support`. Server actions
are the only write path the GUI uses; the front end is GUI-only and every *process*
is a server action or backend call (ADR-0042). Mark chose a **role-scoped write**
model (2026-06-09): reads stay broadly available, revenue stays redacted per
ADR-0030, and each write is granted to the roles that own that part of the system.

## Options considered

1. A small **capability matrix** (write domains → roles) enforced by a server-only
   `requireCapability()` guard called at the top of every mutating action, with the
   pure decision (`can()`) unit-tested as a repeatable stress test (this decision).
2. Per-action ad-hoc `isAdmin()`/role checks (rejected — no single source of truth,
   easy to miss an action, hard to test the model as a whole).
3. Owner/row-level scoping (`owner_user_id`) as the primary control (deferred — a
   good *second* layer, but it does not express "Support may not create proposals";
   tracked as a future consideration).

### Tradeoffs

- (1) one matrix (`lib/auth/policy.ts`, pure/edge-safe) is the single source of
  truth, reused by the guard and by a 50-test suite that asserts the full
  role×capability grid plus the claims mapping. Cost: a one-line guard call per
  action and a coarse-grained domain model (e.g. `tasks` sit under `delivery`, not
  split by category yet).
- (2)/(3) cheaper to start but unsafe/incomplete or solve a different problem.

## Decision

- **`lib/auth/policy.ts`** (pure): eight write capabilities — `crm`, `sales`,
  `delivery`, `contracts`, `tickets`, `comms`, `catalog`, `settings` (`:write`) —
  and `CAPABILITY_ROLES` mapping each to the roles that hold it (`admin` holds all).
  `can(roles, cap)` is the decision function.
  - `crm` → sales, project_manager · `sales` → sales · `delivery` → project_manager
    · `contracts` → finance · `tickets` → support, sales, project_manager · `comms`
    → sales, support · `catalog` → admin-only · `settings` → admin-only.
- **`lib/auth/guard.ts`** (server-only): `requireCapability(cap)` resolves session
  roles (`getSessionRoles`, default `support`) and throws `AuthorizationError`
  (fail-closed) when `can()` is false. Called at the top of every mutating action
  across the 15 `app/(app)/*/actions.ts` files; the GDAP callback route uses `can()`
  directly and redirects with `gdap=forbidden`.
- **Fail-closed bootstrap (supersedes ADR-0030 §1's unconditional fail-open).** A
  no-claim user now falls back to `support`. An explicit, default-off env flag
  `RBAC_FAIL_OPEN_ADMIN=true` restores admin-on-no-claim as a *temporary* bootstrap
  while Entra App Roles are assigned; break-glass (forced admin) is the preferred
  interim path.
  - **INTERIM AMENDMENT (2026-06-10, #140) — CLOSED (2026-06-11, #171):** while
    #139 was open, `claims.ts` failed OPEN unconditionally on no-claim (recognized
    claims still won). #169/#170 landed the live claim mapping (group GUIDs in the
    `roles` claim via `emit_as_roles` + the `ENTRA_GROUP_*` env map) and the
    operator verified sign-in, so #171 restored this bullet's fail-closed behavior
    verbatim. `RBAC_FAIL_OPEN_ADMIN` remains the documented break-glass (unset in
    prod).
- This is **defense in depth**: the GUI still hides controls a role can't use
  (ADR-0030); the server simply never trusts the client to have done so.

## Consequences

### Security impact

Closes the critical gap: writes now fail closed and are least-privilege per role.
The deployment-wide "everyone is admin" fail-open is gone by default. The pure
`can()` matrix is covered by an explicit stress-test grid so regressions surface in
CI. Residual risk: no row-level (owner) scoping yet — any role that *may* write a
domain may write *any* object in it (IDOR within a domain); tracked below. The
bootstrap flag, if ever set in prod, re-opens no-claim users to admin — documented
as not-for-prod in `.env.example`.

### Cost impact

None material — pure logic plus one guard call per action; one new dev dependency
(`vitest`).

### Operational impact

No migration. Operators must ensure Entra emits the App-Role/`groups` claim (or set
`ENTRA_GROUP_*`) so real users resolve to real roles; until then, use break-glass or
the documented `RBAC_FAIL_OPEN_ADMIN` flag. New npm scripts: `test` / `test:watch`.

## Future considerations

Row-level/owner scoping (`account.owner_user_id`) as a second layer; finer task
gating by category; PII-access audit logging; extending the guard to new backend
process endpoints as plain CRUD migrates server-side (ADR-0042).
