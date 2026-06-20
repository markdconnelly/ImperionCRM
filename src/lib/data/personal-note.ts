/**
 * `personal_note` data layer — the access-spine slice 2 pilot (#975, ADR-0105).
 *
 * Every read/write goes through `withIdentity`, so the `personal_note` RLS owner
 * policy (migration 0153) scopes rows to the caller's `app.user_id` AT THE
 * DATABASE — the storage layer is the floor, not an application `WHERE` clause.
 * The SELECT deliberately carries NO `owner_user_id` filter: RLS supplies it, and
 * that is exactly the property this pilot proves. INSERT sets `owner_user_id`
 * explicitly; the policy's `WITH CHECK` rejects writing a row owned by anyone
 * else.
 *
 * Server-only; degrades to `[]` / `null` in mock mode (no pool), like the rest of
 * the data layer (ADR-0024).
 */
import "server-only";
import type { IdentityContext } from "@/lib/db/identity";
import { withIdentity } from "@/lib/db/identity";

export interface PersonalNote {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

interface PersonalNoteRow {
  id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

function mapRow(r: PersonalNoteRow): PersonalNote {
  return { id: r.id, body: r.body, createdAt: r.created_at, updatedAt: r.updated_at };
}

/** The acting user's own personal notes (newest first). RLS scopes the rows. */
export async function listPersonalNotes(identity: IdentityContext): Promise<PersonalNote[]> {
  const rows = await withIdentity(identity, async (client) => {
    const { rows } = await client.query<PersonalNoteRow>(
      `SELECT id, body, created_at, updated_at
         FROM personal_note
        ORDER BY created_at DESC`,
    );
    return rows;
  });
  return (rows ?? []).map(mapRow);
}

/**
 * Create a personal note owned by the acting user. Returns null in mock mode, or
 * when the caller's `app_user.id` is unresolved (`identity.userId` absent) — you
 * cannot own a row without an owner, and the RLS `WITH CHECK` would reject it.
 */
export async function createPersonalNote(
  identity: IdentityContext,
  body: string,
): Promise<PersonalNote | null> {
  if (!identity.userId) return null;
  const row = await withIdentity(identity, async (client) => {
    const { rows } = await client.query<PersonalNoteRow>(
      `INSERT INTO personal_note (owner_user_id, body)
       VALUES ($1, $2)
       RETURNING id, body, created_at, updated_at`,
      [identity.userId, body],
    );
    return rows[0];
  });
  return row ? mapRow(row) : null;
}
