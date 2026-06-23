# RLS access-spine — post-apply verification (ADR-0105, #967)

How to prove the two-axis RLS enforcement is live **after** a migration is applied to a
database. The owner axis lands first on `personal_note` (slice 2, migration 0153). Run this
the first time `0153` is applied to any environment, and again after slice 3 adds the company
axis.

> The application can only be unit-tested for *wiring* (does every read go through
> `withIdentity`? — `personal-note.test.ts`, `identity.test.ts`). Actual RLS *enforcement* is a
> database property, so it is verified against a live DB once the policy exists. The migration
> is **dormant until a Mark-gated apply**, so this check is a deploy step, not a CI step.

## Preconditions (confirm once per environment)

Connected as the **app role** (`mgid-imperioncrm-web-prd`), not the table owner:

```sql
SELECT current_user, rolbypassrls FROM pg_roles WHERE rolname = current_user;  -- non-owner, rolbypassrls = false
SELECT relrowsecurity FROM pg_class WHERE relname = 'personal_note';            -- t
SELECT polname FROM pg_policies WHERE tablename = 'personal_note';              -- personal_note_owner
```

## Owner-axis matrix (slice 2)

Let `A` and `B` be two distinct `app_user.id`s. As the **app role**, in one transaction per
case (mirrors `withIdentity`):

| # | Session context | Action | Expected |
|---|---|---|---|
| 1 | `set_config('app.user_id', A, true)` | `INSERT INTO personal_note(owner_user_id, body) VALUES (A, 'a-note')` | succeeds |
| 2 | `app.user_id = B` | `INSERT … VALUES (A, 'forge')` | **rejected** by `WITH CHECK` (cannot create a row owned by someone else) |
| 3 | `app.user_id = A` | `SELECT count(*) FROM personal_note` | counts only A's rows |
| 4 | `app.user_id = B` | `SELECT count(*) FROM personal_note` | does **not** see A's rows |
| 5 | *no* `app.user_id` set | `SELECT count(*) FROM personal_note` | `0` (fail-closed — unset GUC → NULL predicate) |
| 6 | `app.user_id = B` | `UPDATE personal_note SET body='x' WHERE id = <A's id>` | `0` rows affected |

Worked example for case 3:

```sql
BEGIN;
SELECT set_config('app.user_id', '<A-uuid>', true);
SELECT count(*) FROM personal_note;   -- only A's notes
COMMIT;
```

Admin god-view: connected as the **table owner** (`Mark@ImperionLLC.com`, via `migrate.mjs` /
pg-MCP) RLS is bypassed by ownership — `SELECT * FROM personal_note` sees all rows. Note this
is a *direct admin DB* view; the app never connects as the owner, so personal notes stay
owner-only through the web app (intended). An app-layer audited admin/company bypass is slice 3.

## Company-axis matrix (slice 3a — #979, migration 0186)

The COMPANY / role axis — a row gated to a set of app-role slugs is visible only when the
caller's roles (`app.groups`) intersect that set. Enforced by the policy
`company_scoped_record_role` via `app_role_in_scope(ARRAY['finance','admin'])`, which reads the
caller's roles (`app.groups`). Per ADR-0105 §3a the gate is **whole-table** (finance + admin),
NOT a per-row `required_role` column, and lands first on the **greenfield** `company_scoped_record`
table (the slice-2 / data_class precedent — enable a new axis on a new table, never retrofit a
live read path; retrofitting onto `pay_rate` et al. is gated on a real driver per ADR-0100).

### Preconditions

```sql
SELECT relrowsecurity FROM pg_class WHERE relname = 'company_scoped_record';   -- t
SELECT polname FROM pg_policies WHERE tablename = 'company_scoped_record';     -- company_scoped_record_role
```

### Read/write matrix

As the **app role**, in one transaction per case (mirrors `withIdentity`). Seed one
`company_scoped_record` row as the table owner first.

| # | Session context (`app.groups`) | Action | Expected |
|---|---|---|---|
| 1 | `{"finance"}` | `SELECT count(*) FROM company_scoped_record` | sees the row (finance is in scope) |
| 2 | `{"admin"}` | `SELECT count(*) FROM company_scoped_record` | sees the row (admin is in scope) |
| 3 | `{"support"}` (technician) | `SELECT count(*) FROM company_scoped_record` | **0** — a technician cannot read a finance-gated row |
| 4 | `{"sales"}` | `SELECT count(*) FROM company_scoped_record` | **0** — sales is not in scope |
| 5 | *no* `app.groups` set | `SELECT count(*) FROM company_scoped_record` | **0** (fail-closed — unset GUC → no role in scope) |
| 6 | `{"support"}` | `INSERT INTO company_scoped_record(label) VALUES ('forge')` | **rejected** by `WITH CHECK` — out-of-scope caller cannot create a row |
| 7 | `{"support","finance"}` | `SELECT count(*) FROM company_scoped_record` | sees the row (union — any role intersecting puts the caller in scope) |

Worked example for case 3:

```sql
BEGIN;
SELECT set_config('app.groups', '{"support"}', true);
SELECT count(*) FROM company_scoped_record;   -- 0
COMMIT;
```

> The owner axis (slice 2) and this company axis are independent — a finance technician sees
> company-gated finance rows but still cannot read another employee's `personal_note` drawer,
> and an owner sees their own drawer regardless of company role. The two-axis acceptance matrix
> (#967) is the conjunction of this table and the owner-axis table above.

### Action / label mirror (unit-tested — `src/lib/security/company-scope.test.ts`)

The FE mirror of the SQL predicate (`rolesInScope`), used to label/gate a surface without a
round-trip; the DB policy is the authoritative enforcer.

| Caller roles | Gate | `rolesInScope` |
|---|---|---|
| `finance` | finance+admin | true |
| `admin` | finance+admin | true |
| `support` (technician) | finance+admin | **false** |
| `sales` / `project_manager` / `hr` / `security` | finance+admin | **false** |
| `support` + `finance` | finance+admin | true (union) |
| (none) | finance+admin | **false** (fail-closed) |

## data_class-axis matrix (#1034, ADR-0118, migration 0175)

The THIRD axis — data sensitivity, the MSP's real isolation axis (employees roam all clients;
the gate is the `data_class`, not the client). Enforced by the policy `agent_conversation_data_class`
via `app_data_class_allowed(data_class)`, which reads the caller's roles (`app.groups`) against
`data_class_role_grant`. The read axis lands first on **`agent_conversation`** (the greenfield
classed table, 0163); the action ceiling is the FE/BE mirror unit-tested in `data-class.test.ts`.

> The same predicate enforces the ACTION ceiling on the governed action plane (ADR-0107): an
> action's `data_class` must satisfy `app_data_class_allowed()` for the caller, else it is refused
> (sub-agent dispatch) or routed to the approval cockpit (autonomous path). Reads and actions
> share one rule.

### Preconditions

```sql
SELECT relrowsecurity FROM pg_class WHERE relname = 'agent_conversation';        -- t
SELECT polname FROM pg_policies WHERE tablename = 'agent_conversation';          -- agent_conversation_data_class
SELECT count(*) FROM data_class;                                                 -- 5
SELECT count(*) FROM data_class_role_grant WHERE role_slug = 'support';          -- 2 (operational, client_pii)
```

### Read matrix

As the **app role**, in one transaction per case (mirrors `withIdentity`). Seed two
`agent_conversation` rows as the table owner first: one `data_class='operational'`, one
`data_class='financial'`.

| # | Session context (`app.groups`) | Action | Expected |
|---|---|---|---|
| 1 | `{"support"}` (technician) | `SELECT count(*) FROM agent_conversation WHERE data_class='operational'` | sees the operational row |
| 2 | `{"support"}` | `SELECT count(*) FROM agent_conversation WHERE data_class='financial'` | **0** — a technician cannot read a Financial row |
| 3 | `{"finance"}` | `SELECT count(*) FROM agent_conversation WHERE data_class='financial'` | sees the financial row |
| 4 | `{"finance"}` | `SELECT count(*) FROM agent_conversation WHERE data_class='security_credentials'` (seed one) | **0** — finance is not granted security_credentials |
| 5 | `{"admin"}` | `SELECT count(*) FROM agent_conversation` | sees all classes (admin is granted every class) |
| 6 | *no* `app.groups` set | `SELECT count(*) FROM agent_conversation` | **0** (fail-closed — unset GUC → no role → no class) |
| 7 | `{"support"}` | `INSERT INTO agent_conversation(title,data_class) VALUES ('x','financial')` | **rejected** by `WITH CHECK` — cannot create a Financial-class row |

Worked example for case 2:

```sql
BEGIN;
SELECT set_config('app.groups', '{"support"}', true);
SELECT count(*) FROM agent_conversation WHERE data_class = 'financial';   -- 0
COMMIT;
```

### Action-ceiling matrix (unit-tested — `src/lib/security/data-class.test.ts`)

The FE mirror of the SQL predicate; the backend dispatch is the authoritative enforcer.

| Caller roles | Action class | `actionWithinCeiling` |
|---|---|---|
| `support` (technician) | `financial` | **false** — refused / routed to approval |
| `support` | `people_hr` | **false** |
| `support` | `operational` | true |
| `finance` | `financial` | true |
| `finance` | `security_credentials` | **false** |
| `admin` | any class | true |
| (any) | unknown class | **false** (fail-closed) |
