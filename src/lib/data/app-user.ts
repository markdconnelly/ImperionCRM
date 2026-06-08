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
}

export async function upsertAppUser(input: AppUserUpsert): Promise<void> {
  const pool = getPool();
  if (!pool) return; // mock mode — nothing to persist
  if (!input.entraObjectId) return;
  try {
    await pool.query(
      `INSERT INTO app_user (entra_object_id, email, display_name, roles)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (entra_object_id) DO UPDATE
         SET email = EXCLUDED.email,
             display_name = EXCLUDED.display_name,
             roles = EXCLUDED.roles,
             updated_at = now()`,
      [input.entraObjectId, input.email, input.displayName, input.roles],
    );
  } catch (err) {
    // Never block sign-in on a mirror failure; auth still succeeds.
    console.error("[auth] app_user upsert failed:", err);
  }
}
