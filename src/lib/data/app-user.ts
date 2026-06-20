/**
 * `app_user` mirror upsert (ADR-0016/0030).
 *
 * On every Entra sign-in we mirror the user's identity and derived roles into
 * the `app_user` table so the DB has an authoritative, queryable record (for
 * audit-log FKs, ownership, and as a roles fallback). Server-only; a no-op when
 * the database is unconfigured (mock mode) so local/dev sign-in still works.
 */
import "server-only";
import { getPool } from "@/lib/db/client";
import type { AppRole } from "@/lib/auth/roles";

export interface AppUserUpsert {
  entraObjectId: string;
  email: string;
  displayName: string | null;
  roles: AppRole[];
  /**
   * Raw Entra group object-ids (migration 0152, #974). Authoritative membership
   * for two-axis RLS company scope; distinct from the normalized `roles`.
   * Optional so existing callers compile; defaults to `[]`.
   */
  groupIds?: string[];
}

/**
 * Resolve the signed-in employee's `app_user.id` by email — the session carries
 * email, not the row id (same resolution the connections repo and the agent
 * ask-action use). Returns null in mock mode (no pool), when no row exists yet,
 * or on a query failure — callers degrade gracefully (ADR-0024).
 */
export async function resolveAppUserIdByEmail(email: string): Promise<string | null> {
  const pool = getPool();
  if (!pool || !email.trim()) return null;
  try {
    const { rows } = await pool.query<{ id: string }>(
      `SELECT id FROM app_user WHERE lower(email) = lower($1) ORDER BY created_at LIMIT 1`,
      [email.trim()],
    );
    return rows[0]?.id ?? null;
  } catch (err) {
    console.error("[app-user] id resolution failed:", err);
    return null;
  }
}

export async function upsertAppUser(input: AppUserUpsert): Promise<void> {
  const pool = getPool();
  if (!pool) return; // mock mode — nothing to persist
  if (!input.entraObjectId) return;
  try {
    await pool.query(
      `INSERT INTO app_user (entra_object_id, email, display_name, roles, group_ids)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (entra_object_id) DO UPDATE
         SET email = EXCLUDED.email,
             display_name = EXCLUDED.display_name,
             roles = EXCLUDED.roles,
             group_ids = EXCLUDED.group_ids,
             updated_at = now()`,
      [
        input.entraObjectId,
        input.email,
        input.displayName,
        input.roles,
        input.groupIds ?? [],
      ],
    );
  } catch (err) {
    // Never block sign-in on a mirror failure; auth still succeeds.
    console.error("[auth] app_user upsert failed:", err);
  }
}
