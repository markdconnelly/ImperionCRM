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

Direct-admin DB view: connected as the **table owner** (`Mark@ImperionLLC.com`, via
`migrate.mjs` / pg-MCP) RLS is bypassed by ownership — `SELECT * FROM personal_note` sees all
rows. This is a *direct admin DB* view; the app never connects as the owner, so through the web
app personal notes stay owner-only **except** via the audited god-view below (slice 3b).

## Admin god-view matrix (slice 3b — #980, migration 0187)

The audited admin god-view — an EXPLICIT, ledgered bypass of the personal-tier owner boundary
**for the app role** (not the direct-DB ownership bypass above). Enforced by the permissive
policy `personal_note_admin_godview` via `'admin' = ANY(current_setting('app.groups')::text[])`,
which is OR'd with `personal_note_owner` (Postgres OR's PERMISSIVE policies). Per ADR-0105 §3b
this is a **permissive admin policy, NOT a BYPASSRLS role** — granular (only tables carrying a
god-view policy), reuses `withIdentity` plumbing, and visible in `pg_policies`. The audit is
enforced at the **data layer** (`listAllPersonalNotesAsAdmin`, `personal-note.ts`): a single
`audit_log` row per access event (action `personal_note.godview`) when the read returns rows the
admin does not own.

### Preconditions

```sql
SELECT polname, polpermissive FROM pg_policy
  WHERE polrelid = 'personal_note'::regclass;   -- personal_note_owner + personal_note_admin_godview (both permissive=t)
```

### Read/write matrix

As the **app role**, in one transaction per case (mirrors `withIdentity`). Let `A` and `B` be
two distinct `app_user.id`s with `personal_note` rows.

| # | Session context | Action | Expected |
|---|---|---|---|
| 1 | `app.groups = {"admin"}`, `app.user_id = A` | `SELECT count(*) FROM personal_note` | sees **all** rows (A's own via owner policy + B's via god-view policy) |
| 2 | `app.groups = {"support"}`, `app.user_id = A` | `SELECT count(*) FROM personal_note` | sees only A's rows (non-admin → god-view branch FALSE → owner policy alone) |
| 3 | `app.groups = {}`, no `app.user_id` | `SELECT count(*) FROM personal_note` | **0** (fail-closed — neither branch matches) |
| 4 | `app.groups = {"admin"}`, `app.user_id = A` | `UPDATE personal_note SET body='x' WHERE id = <B's id>` | succeeds (admin `WITH CHECK` admits the course-correction write) |

> **Audit (data-layer property, not a DB-policy property).** RLS admits the rows; the
> `audit_log` ledger entry is written by the repo, so verify it at the application layer. Case 1
> (an admin reading B's notes) must produce exactly **one** `audit_log` row with
> `action='personal_note.godview'`, `actor_user_id=A`, `detail.notesViewed` = the cross-owner
> count, and `detail.ownersViewed` = the distinct owners (e.g. `["B"]`) — never the note bodies.
> An admin reading only their own notes (no cross-owner rows) writes **no** audit row. This is
> pinned in `src/lib/data/personal-note.test.ts`.

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

## Curation-identity matrix (slice 3c — #981, migration 0192)

The **cross-wall curation promoter** — the ONLY actor permitted to move knowledge across the
personal→company wall (#966 decision 5/6, ADR-0105 §3c). It runs autonomously (no user in the
loop) as the dedicated **non-`BYPASSRLS`** Postgres login `imperion-curation-promoter`, with a
**narrow audited write-scope** and its **own append-only ledger** (`curation_event`). The four
§3c invariants enforced by migration 0192:

1. **No `BYPASSRLS`** — explicit narrow GRANTs + curation policies scoped to the promotion path.
2. **Append-only ledger** — every cross-wall action is one `curation_event` row; promoter has
   `INSERT` only (no `UPDATE`/`DELETE`).
3. **Human-approved promotion, never silent** — the promoter writes a `status='draft'`
   `curation_promotion` (read-personal-to-propose); a human flips draft→approved→applied
   (`src/lib/data/curation-promotion.ts`). The engagement_answer agent-draft pattern (ADR-0027).
4. **Non-impersonation** — all promoter policies key on **`current_user`** (the DB login role),
   NOT a settable GUC, so the web/backend app role spoofing `app.user_id`/`app.oid` can never
   satisfy them. The promoter has no owner-axis reach; it acts as itself.

This is distinct from the **Personal Curator** (`imperion-personal-curator`, migration 0169,
ADR-0114) which is INTRA-owner and never crosses the wall — the two actors coexist.

### Preconditions

```sql
SELECT rolbypassrls FROM pg_roles WHERE rolname = 'imperion-curation-promoter';  -- f (Phase-2)
SELECT relrowsecurity FROM pg_class
  WHERE relname IN ('curation_promotion', 'curation_event');                     -- t, t
SELECT polname FROM pg_policies WHERE tablename = 'curation_promotion';
  -- curation_promotion_promoter + curation_promotion_reviewer
SELECT polname FROM pg_policies WHERE tablename = 'curation_event';
  -- curation_event_promoter + curation_event_reviewer + curation_event_owner
SELECT polname FROM pg_policies WHERE tablename = 'personal_fact' AND polname LIKE '%promoter%';
  -- personal_fact_promoter_read (SELECT-only)
```

### DB-property matrix (verify after a Phase-2 role + apply)

Cases keyed on the connection's login role (`current_user`) — the non-impersonation guarantee.
"as promoter" = connected as `imperion-curation-promoter`; "as app role" = the web role with the
`app.groups` GUC set (mirrors `withIdentity`). Let `O` be a personal-fact owner's `app_user.id`.

| # | Connected as | Session context | Action | Expected |
|---|---|---|---|---|
| 1 | promoter | — | `INSERT INTO curation_promotion(..., status, proposed_by) VALUES (…, 'draft', 'imperion-curation-promoter')` | succeeds — read-to-propose write |
| 2 | promoter | — | `INSERT … status='approved'` | **rejected** by `WITH CHECK` — promoter can only write a draft (the approval gate) |
| 3 | promoter | — | `UPDATE curation_promotion SET status='applied' WHERE …` | **0 rows / refused** — no `UPDATE` grant; cannot apply (humans apply) |
| 4 | promoter | `set_config('app.user_id', O, true)` | `SELECT count(*) FROM personal_note` | **0** — the promoter has NO personal_note policy + a GUC it sets is ignored; it cannot read a drawer as its owner (non-impersonation) |
| 5 | promoter | — | `SELECT count(*) FROM personal_fact` | sees facts (read-to-propose god-view) — but `UPDATE personal_fact …` → **refused** (SELECT-only grant) |
| 6 | promoter | — | `INSERT INTO curation_event(actor, …) VALUES ('imperion-curation-promoter', …)` | succeeds; `UPDATE/DELETE curation_event` → **refused** (append-only) |
| 7 | app role | `app.groups = {"admin"}` | `SELECT count(*) FROM curation_promotion` | sees the queue (reviewer policy) |
| 8 | app role | `app.groups = {"support"}` (technician) | `SELECT count(*) FROM curation_promotion` | **0** — a technician cannot review the cross-wall queue |
| 9 | app role | `app.groups = {"admin"}` | `UPDATE curation_promotion SET status='applied' WHERE status='approved'` | succeeds — the human apply path |
| 10 | app role | `app.user_id = O`, no `app.groups` | `SELECT count(*) FROM curation_event WHERE source_owner_user_id = O` | sees events touching O's drawer (owner transparency) |
| 11 | app role | no context | `SELECT count(*) FROM curation_promotion` | **0** (fail-closed — neither reviewer nor promoter branch matches) |

> Case 4 is the load-bearing **non-impersonation** proof: even with `app.user_id` set to a real
> owner, the promoter sees zero `personal_note` rows — the owner axis keys on the GUC only for
> the *app role*, and the promoter has no `personal_note` policy granting it anything. Its only
> personal reach is the SELECT-only `personal_fact_promoter_read` god-view (case 5), enough to
> *propose*, never to *mutate* a drawer.

### Human-review wiring (unit-tested — `src/lib/data/curation-promotion.test.ts`)

The FE owns the human-review surface (the promoter writer is BACKEND). These pin the
application-layer behaviour above the RLS reviewer policy; the DB is the authoritative enforcer.

| Behaviour | Expectation |
|---|---|
| non-reviewer (`support`) calls `listPendingPromotions` / `approvePromotion` | returns `null`, never opens a transaction (defense-in-depth above RLS) |
| `approvePromotion` | flips `draft→approved`, guarded `WHERE status='draft'`; interim — **not** ledgered |
| `applyPromotion` | flips `approved→applied` **and** writes ONE `curation_event('applied')` in the same transaction |
| `rejectPromotion` | flips `draft→rejected` **and** writes ONE `curation_event('rejected')` |
| `curation_event.detail` | provenance pointers + the status only — **never** proposed content (no PII in the ledger) |
| no row matched the from-status | returns `null`, no ledger row (nothing happened) |
