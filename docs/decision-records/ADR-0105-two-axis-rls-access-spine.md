---
adr: 0105
title: "Two-axis RLS access spine — Entra claims enforced at the storage layer"
status: proposed
date: 2026-06-20
repo: frontend
summary: "Two-axis Postgres RLS (owner/oid + role/groups) as the storage-layer floor of the access spine: claims injected per-request via SET LOCAL, read by policies with current_setting; group object-ids captured on sign-in; admin god-view by table ownership; a privileged curation service identity crosses the personal→company wall."
tags: [meta, security]
---

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
  - *Personal / owner axis* — `USING (owner_user_id = current_setting('app.user_id')::uuid)`.
  - *Company / role axis* — `USING (required_role = ANY(current_setting('app.groups')::text[]))`.
- **`app.user_id` ≠ `app.oid` (corrected in slice 2, #975).** Ownership columns
  (`owner_user_id`, `app_user_id`) FK to **`app_user.id`** — the internal uuid PK — NOT the
  Entra `oid` (which is `app_user.entra_object_id`, a different value). So the owner axis keys
  on a dedicated `app.user_id` GUC carrying the resolved `app_user.id`; `app.oid` is retained
  for audit and any future entra-keyed predicate. (The original draft wrote `app.oid` for the
  owner axis — wrong; an `oid` never equals an `owner_user_id`.)
- **Claim plumbing — `withIdentity(identity, fn)`** (`src/lib/db/identity.ts`): `BEGIN →
  set_config('app.user_id'|'app.oid'|'app.groups', …, true) → fn(client) → COMMIT`. Each GUC is
  set only when its fact is present (never to `''`, which would make `current_setting(…)::uuid`
  throw); an unset GUC reads back NULL → the policy matches no rows (fail-closed). `SET LOCAL`
  (via `set_config(..., is_local=true)`) is **mandatory** — a session-scoped `SET` on a pooled
  connection leaks identity onto the next borrower (a cross-user data bug). The helper is the
  only sanctioned way to carry identity into the DB session; `requestIdentity()`
  (`src/lib/auth/request-identity.ts`) is the single place a request's session is turned into
  that context (`userId` ← `resolveActingUser`, `groups` ← session roles).
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

Delivered in three slices: **slice 1 (#974)** ships the `withIdentity` helper + `group_ids`
capture with **no policies enabled** (zero behavior change); **slice 2 (#975)** enables the
first owner-axis policy on **`personal_note`** — a NEW, self-contained personal-tier table (the
"verbatim drawer" of #968), chosen over an existing owner-scoped table because the app has no
RLS today, so enabling it on a live table (e.g. `saved_view`'s shares, `notification_pref`'s
dispatcher cross-reads) would break existing reads; a greenfield table routes 100% of its
reads through `withIdentity` from creation; **slice 3 (#976)** adds the company policies, the
audited god-view, and the curation identity.

**`personal_note` is owner-only by design.** Because the app connects as the non-owner app
role, an admin using the web app sees only their own notes — the personal-tier privacy
contract (Derek's drawer invisible to Nick *and* to an admin via the app). Cross-user
visibility over personal data is granted ONLY through slice 3's explicit, audited bypass /
promotion path, never silently. Personal-tier tables are deliberately **out of the OKF
company-silver canon** (ADR-0086 forbids PII there), so `personal_note` gets no OKF concept
file.

## Slice 3 design — company axis, god-view, curation identity (#976; resolved 2026-06-20)

Slice 3 was decomposed into #979 (company axis), #980 (god-view), #981 (curation identity) and
designed against ADR-0095 (RBAC) and **ADR-0100 (broad employee read is the v1 posture)** before
any code. The load-bearing finding: **ADR-0100 makes the company axis narrow.** Reads are
*intentionally* broad for every signed-in employee; the only exception is server-side
revenue/comp redaction; object/account-scoped reads are deferred to v2 pending a real driver.
So a blanket per-row `required_role` company gate would *contradict* an Accepted ADR and risk
breaking many reads. The design below reflects that.

### `app.groups` vocabulary (settles the slice-1/2 deferral)

`app.groups` carries the caller's **normalized app-role slugs** (`admin`, `finance`,
`project_manager`, `sales`, `support`) — what `requestIdentity()` already passes and what
`app_user.roles` stores — **not** raw Entra group GUIDs. Slugs are legible in policy predicates
and on any future gated row; the raw GUIDs remain on `app_user.group_ids` for audit.

### Slice 3a — company axis: narrow, comp/finance-only, mostly deferred

- **Scope:** the company axis does **not** blanket company tables. Per ADR-0100, company-tier
  data stays broad-read with **no RLS**; the company gate applies only to the genuinely
  sensitive **comp/finance** surface (e.g. `pay_rate`, migration 0085) that ADR-0095/0100 already
  protect with GRANT-restriction + server-side redaction.
- **v1 applies it to ZERO existing tables.** Retrofitting RLS onto `pay_rate` et al. is a
  behaviour change requiring every read routed through `withIdentity` first, and those tables are
  *already* protected — so the v1 deliverable is the **documented pattern**, not an applied
  policy. Application is gated on a real driver (compartmented clients / restricted contractors /
  a compliance requirement — the same triggers ADR-0100 names) or the slice-2 routing being done
  for a given table.
- **Pattern (when applied):** a **whole-table role gate**, not a per-row `required_role` column:
  `USING (current_setting('app.groups', true)::text[] && ARRAY['finance','admin'])`. A per-row
  `required_role` / account-visibility model is explicitly the v2 concept ADR-0100 deferred.

### Slice 3b — audited admin god-view: personal-tier only, ledgered at the data layer

- **Mechanism:** a **per-table permissive `admin` RLS policy**
  (`USING ('admin' = ANY(current_setting('app.groups', true)::text[]))`), **not** a `BYPASSRLS`
  role — granular, reuses the same plumbing, and an admin's reach is visible in `pg_policies`.
- **Scope:** god-view is meaningful **only over RLS-gated personal-tier tables** (`personal_note`
  today). Over company-tier, broad read already gives an admin everything (ADR-0100), so no
  god-view policy is needed there.
- **Audit:** an admin reading **another employee's personal data** via god-view must be ledgered.
  RLS policies cannot cleanly write audit rows, so the audit is enforced at the **data layer**:
  when `requestIdentity` indicates `admin` and the read returns rows the admin does not own, the
  personal-tier repo writes an `audit_log` entry (one per access event, not per row). Ordinary
  company reads are **not** per-read audited (consistent with ADR-0100). The owner's own reads
  are not audited.

### Slice 3c — privileged curation service identity (build LAST, most scrutiny)

The autonomous curation/promotion agents move knowledge across the personal→company wall. They
have no user in the loop, so they cannot borrow a user token.

- **Identity:** a dedicated Azure **managed identity → dedicated Postgres login role** with
  **NO `BYPASSRLS`**. Its reach is *explicit*: narrow table GRANTs + dedicated curation RLS
  policies scoped to the promotion path only. The agent **runs in the backend** (ADR-0042; FE
  owns the DB role + policies + ledger schema, BE owns the runtime — a BE issue tracks the
  runtime).
- **Audit ledger:** a new append-only **`curation_event`** table (FE migration): actor (service
  identity), source personal ref, target company ref, action (`proposed` | `applied`), timestamp.
  Every cross-wall action is ledgered; no exceptions.
- **Promotion is human-approved, never silent.** The curation identity may **read personal to
  propose** and **write a proposal** (`status='draft'`), mirroring the agent-draft pattern of
  `engagement_answer` (`source='agent'`, ADR-0027); a human approves before the company-side
  write is applied. "Explicit, never silent" *is* the approval gate.
- **Non-impersonation (hard invariant):** the curation role acts **as itself** — it **never**
  calls `withIdentity` with a borrowed user context and never sets `app.user_id`/`app.oid` to a
  real user. Its curation policies key on the service identity, not on a user GUC. This is the
  structural guarantee that it cannot read a drawer *as* its owner.

### Implementation order & dependencies

3b (god-view on `personal_note`) is buildable next and self-contained. 3a is **design-only for
v1** (pattern documented; application deferred per ADR-0100). 3c depends on the #968 personal
data model + a promotion target existing, and is the highest-risk component — built last, behind
the human-approval gate, with its own backend ADR for the runtime.

## Consequences

### Security impact

Strongly positive: the database becomes the hard floor — even a misbehaving agent or a missed
application guard cannot read across the boundary once policies are enabled. The leak-safety of
the helper (`SET LOCAL` only, inside a transaction) is pinned by `identity.test.ts`. Group
object-ids are non-secret directory identifiers (no PII, no secrets on the row). The slice-3
curation identity is the highest-privilege actor; its **no-`BYPASSRLS` + never-impersonate +
ledger-every-write** invariants are the controls that keep upward personal→company leakage —
the threat this whole spine is designed against — from happening silently.

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
- The `app.groups` vocabulary is **settled** (slice-3 design): normalized app-role slugs, not
  raw group GUIDs (see "Slice 3 design"). A per-row `required_role` / account-visibility model
  remains the v2 concept ADR-0100 deferred — built only when a real driver appears.

## Amendment (2026-06-22) — Personal Curator intra-owner god-view (#1157, ADR-0114)

ADR-0105 §3c scoped the curation identity to the **cross-wall** promoter (never impersonates,
keyed on its service identity). ADR-0114 introduces a **second, distinct** privileged actor — the
**Personal Curator** — which stays **intra-owner**: it reads+writes broadly across the personal
tier to synthesize Knowledge Facts, project/ingest the Curated Vault, and hunt Knowledge
Contradictions, but only ever writes back to the **same** `owner_user_id` it read. It never crosses
the personal→company wall (that remains §3c's promoter alone). The Personal Curator's god-view,
**implemented in migration 0169** (#1157), follows the §3b shape rather than `BYPASSRLS`:

- a **permissive RLS policy per personal table** for a **dedicated, non-`BYPASSRLS`
  managed-identity → Postgres login** (`imperion-personal-curator`), keyed on **`current_user`**
  (the connection's DB role) — not a settable GUC, so it cannot be spoofed by the web/backend app
  role, and the reach is visible in `pg_policies`. **FE owns the policies + ledger schema; INFRA
  provisions the login role (Phase-2); the BACKEND owns the runtime (BE #302).**
- **personal-tier only** (memory_drawer personal rows · personal_fact · personal_vault_file ·
  personal_contradiction · personal_curation_event) — never a company table;
- **every god-view action ledgered** to append-only `personal_curation_event` (the audit control
  that keeps the non-bypass god-view accountable; enforced at the curator's data layer);
- the **LP vectorization role** (`imperion-localpipeline`) gets the same concession, **SELECT-only**
  here (read personal verbatim across owners to produce the gold summary, LP #300), plus INSERT on
  the ledger for its `embed_enqueue` action.

The owner-scoping invariant survives because both actors only write back to the owner they read.
This amends — does not supersede — §3c; the two curation actors coexist (intra-owner Curator +
cross-wall promoter).

## Amendment (2026-06-23) — Slice 3a built: company/role axis predicate + first policy (#979)

§3a designed the company axis as a **whole-table role gate** (not a per-row `required_role`
column — that per-row / account-visibility model stays the v2 concept ADR-0100 deferred), applied
**narrowly** to comp/finance-shaped surfaces, with v1 applying it to **zero existing** tables
(retrofitting onto already-GRANT-protected `pay_rate` et al. would break ADR-0100 broad reads).
This amendment records the **build** of that pattern (#979, migration 0186):

- The shared predicate **`app_role_in_scope(allowed_roles text[])`** (`STABLE`, `SECURITY
  DEFINER`, fail-closed) — the twin of `app_data_class_allowed` (0175) — makes the whole-table
  gate ONE re-usable rule: `USING (app_role_in_scope(ARRAY['finance','admin']))`.
- The first company policy lands on a **NEW, greenfield** table **`company_scoped_record`**, not
  on any live read path — the slice-2 / data_class precedent (prove a new axis on a new table
  whose reads route 100% through `withIdentity` from creation; never retrofit). This keeps the
  build behaviour-preserving while making the axis provable end-to-end; applying it to an existing
  comp/finance table remains gated on a real driver per §3a / ADR-0100.
- The FE mirror **`rolesInScope()`** (`src/lib/security/company-scope.ts`) labels/gates surfaces
  without a round-trip; the DB policy is authoritative. The company-axis test matrix is filled in
  `docs/testing/rls-access-spine.md` (a technician/`support` cannot read a finance-gated row;
  finance + admin can; the axis is independent of the owner axis).

The `app.groups` vocabulary stays **normalized app-role slugs** (§3 design). #980 (audited
god-view, §3b) and #981 (curation identity, §3c) remain the rest of slice 3.
