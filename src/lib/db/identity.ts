/**
 * Entra-claims → DB session context (access spine slice 1, #974 / parent #967).
 *
 * The two-axis RLS design (ADR-00XX) enforces access at the storage layer by
 * reading the caller's Entra identity out of two Postgres GUCs inside each
 * request's transaction:
 *   - `app.oid`    — the user's Entra object id  → personal/owner axis
 *   - `app.groups` — the user's role-scope set   → company/role axis
 *
 * RLS policies read them with `current_setting('app.oid', true)` /
 * `current_setting('app.groups', true)::text[]` (the `true` = missing_ok, so an
 * unset context yields NULL → no rows rather than an error).
 *
 * **Why a transaction is mandatory.** The FE runs a long-lived pool, so a plain
 * `SET` (session-scoped) would persist onto the next request that borrows the
 * same connection — a cross-user data leak. `SET LOCAL` (here via the
 * parameterized `set_config(name, value, is_local=true)`) is reset at
 * COMMIT/ROLLBACK, so the context cannot outlive its transaction. This is the
 * load-bearing safety property; `identity.test.ts` pins it.
 *
 * Slice 1 ships this plumbing only — NO policies are enabled yet, so routing a
 * read through `withIdentity` is behaviour-neutral until slice 2 (#975).
 *
 * Server-only. Returns null when no database is configured (mock mode), exactly
 * like a direct `pool.query()` caller degrades to mock data.
 */
import "server-only";
import type { PoolClient } from "pg";
import { getPool } from "@/lib/db/client";

/** Entra-derived security context carried into the DB session for RLS. */
export interface IdentityContext {
  /** Entra object id (`oid` claim) — owner/personal axis. */
  oid: string;
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
    // is_local=true scopes the setting to this transaction, and the claim values
    // are bound as parameters rather than concatenated into SQL.
    await client.query("SELECT set_config('app.oid', $1, true)", [identity.oid]);
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
