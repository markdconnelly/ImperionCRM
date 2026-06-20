/**
 * Entra-claims → DB session context (access spine, ADR-0105 / parent #967).
 *
 * The two-axis RLS design enforces access at the storage layer by reading the
 * caller's identity out of Postgres GUCs inside each request's transaction:
 *   - `app.oid`     — the user's Entra object id            → audit / entra-keyed
 *   - `app.user_id` — the user's `app_user.id` (internal PK) → personal/owner axis
 *   - `app.groups`  — the user's role-scope set              → company/role axis
 *
 * **Why `app.user_id` is distinct from `app.oid`.** Ownership columns
 * (`owner_user_id`, `app_user_id`) FK to `app_user.id` — the internal uuid PK —
 * NOT the Entra `oid` (which is `app_user.entra_object_id`, a different value).
 * So owner-axis policies key on `app.user_id`
 * (`owner_user_id = current_setting('app.user_id')::uuid`); `app.oid` stays for
 * audit and any future entra-keyed predicate. `app.user_id` is set only when the
 * caller resolved it — otherwise it stays unset and `current_setting(..., true)`
 * yields NULL, so an owner policy matches no rows (fail-closed), never errors.
 *
 * RLS policies read the GUCs with `current_setting('<name>', true)` (the `true` =
 * missing_ok, so an unset context yields NULL → no rows rather than an error).
 *
 * **Why a transaction is mandatory.** The FE runs a long-lived pool, so a plain
 * `SET` (session-scoped) would persist onto the next request that borrows the
 * same connection — a cross-user data leak. `SET LOCAL` (here via the
 * parameterized `set_config(name, value, is_local=true)`) is reset at
 * COMMIT/ROLLBACK, so the context cannot outlive its transaction. This is the
 * load-bearing safety property; `identity.test.ts` pins it.
 *
 * The first owner-axis policy lands on `personal_note` (slice 2, #975); company
 * policies + the audited god-view + the curation identity follow in slice 3 (#976).
 *
 * Server-only. Returns null when no database is configured (mock mode), exactly
 * like a direct `pool.query()` caller degrades to mock data.
 */
import "server-only";
import type { PoolClient } from "pg";
import { getPool } from "@/lib/db/client";

/**
 * Identity facts carried into the DB session for RLS. Each is OPTIONAL — the
 * helper sets only the GUCs it is given, and an unset GUC reads back as NULL
 * (`current_setting(..., true)`), so a policy keyed on a missing fact matches no
 * rows (fail-closed) rather than erroring.
 */
export interface IdentityContext {
  /**
   * The caller's `app_user.id` (internal uuid PK) — the owner/personal axis.
   * Resolved from the Entra identity by the caller (e.g. `resolveActingUser`).
   * Omitted/null when unresolved → `app.user_id` unset → owner policies match
   * no rows (fail-closed).
   */
  userId?: string | null;
  /** Entra object id (`oid` claim) — audit / future entra-keyed predicates. */
  oid?: string | null;
  /**
   * Role-scope set — company axis. Carries the values RLS company policies
   * compare against (`required_role = ANY(current_setting('app.groups')::text[])`).
   * Slice 1 is agnostic about whether these are normalized app roles or raw
   * Entra group object-ids; that predicate is fixed when slice 3 (#976) writes
   * the company policies.
   */
  groups: string[];
}

/**
 * Build a Postgres `text[]` literal (`{"a","b"}`) from a string array, with
 * each element double-quoted and internal `"`/`\` escaped, so any value is
 * carried safely. Consumed by policies as `current_setting('app.groups')::text[]`.
 */
function toPgTextArrayLiteral(values: string[]): string {
  const escaped = values.map((v) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
  return `{${escaped.join(",")}}`;
}

/**
 * Run `fn` inside a transaction whose session carries the caller's Entra
 * identity as the `app.oid` / `app.groups` GUCs (transaction-scoped via
 * `SET LOCAL`). Commits on success, rolls back on throw, always releases the
 * pooled connection. Returns null in mock mode (no pool configured).
 */
export async function withIdentity<T>(
  identity: IdentityContext,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T | null> {
  const pool = getPool();
  if (!pool) return null; // mock mode — caller falls back to mock data

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // set_config(name, value, is_local) is the parameterized form of SET LOCAL —
    // is_local=true scopes the setting to this transaction, and the values are
    // bound as parameters rather than concatenated into SQL. Each GUC is set only
    // when its fact is present — never to '' (an empty GUC would make
    // `current_setting(name, true)::uuid` throw instead of yielding NULL).
    if (identity.userId) {
      await client.query("SELECT set_config('app.user_id', $1, true)", [identity.userId]);
    }
    if (identity.oid) {
      await client.query("SELECT set_config('app.oid', $1, true)", [identity.oid]);
    }
    await client.query("SELECT set_config('app.groups', $1, true)", [
      toPgTextArrayLiteral(identity.groups),
    ]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
