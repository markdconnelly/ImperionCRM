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

## Company-axis matrix (slice 3 — placeholder)

To be filled when slice 3 (#976) adds `app.groups` company policies: a technician must not read
finance rows; an exec reads company-wide but not another employee's personal drawer unless
promoted.
