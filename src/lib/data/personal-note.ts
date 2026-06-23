/**
 * `personal_note` data layer — the access-spine slice 2 pilot (#975, ADR-0105) +
 * the audited admin god-view (slice 3b, #980, ADR-0105 §3b).
 *
 * Every read/write goes through `withIdentity`, so the `personal_note` RLS owner
 * policy (migration 0153) scopes rows to the caller's `app.user_id` AT THE
 * DATABASE — the storage layer is the floor, not an application `WHERE` clause.
 * The SELECT deliberately carries NO `owner_user_id` filter: RLS supplies it, and
 * that is exactly the property this pilot proves. INSERT sets `owner_user_id`
 * explicitly; the policy's `WITH CHECK` rejects writing a row owned by anyone
 * else.
 *
 * **God-view (slice 3b).** An admin (the `admin` role in `app.groups`) can
 * intentionally read across the owner boundary via the permissive
 * `personal_note_admin_godview` policy (migration 0187). That bypass is EXPLICIT
 * (a distinct call — `listAllPersonalNotesAsAdmin`, never the ordinary owner read
 * path) and AUDITED: when the read returns rows the admin does NOT own, ONE
 * `audit_log` entry per access event is written (action
 * `personal_note.godview`). The owner's own reads and ordinary company reads are
 * not audited (ADR-0105 §3b). There is no always-on superuser path — the bypass is
 * never silent.
 *
 * Server-only; degrades to `[]` / `null` in mock mode (no pool), like the rest of
 * the data layer (ADR-0024).
 */
import "server-only";
import type { PoolClient } from "pg";
import type { IdentityContext } from "@/lib/db/identity";
import { withIdentity } from "@/lib/db/identity";

/** The role slug that unlocks the audited god-view (ADR-0105 §3b; mirrors the SQL policy). */
const ADMIN_ROLE = "admin";

/** Audit-log action for an admin god-view access event over personal_note (ADR-0105 §3b). */
export const PERSONAL_NOTE_GODVIEW_ACTION = "personal_note.godview";

export interface PersonalNote {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

/** A personal note as seen through the admin god-view — carries the owner for audit/UI. */
export interface AdminPersonalNote extends PersonalNote {
  ownerUserId: string;
}

interface PersonalNoteRow {
  id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

interface AdminPersonalNoteRow extends PersonalNoteRow {
  owner_user_id: string;
}

function mapRow(r: PersonalNoteRow): PersonalNote {
  return { id: r.id, body: r.body, createdAt: r.created_at, updatedAt: r.updated_at };
}

function mapAdminRow(r: AdminPersonalNoteRow): AdminPersonalNote {
  return { ...mapRow(r), ownerUserId: r.owner_user_id };
}

/** Is the caller acting as an admin (carries the `admin` role in their group set)? */
function isAdmin(identity: IdentityContext): boolean {
  return identity.groups.includes(ADMIN_ROLE);
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

/**
 * The audited admin god-view (#980, ADR-0105 §3b) — an EXPLICIT, ledgered bypass of
 * the personal-tier owner boundary. Distinct from `listPersonalNotes` so the bypass
 * is never accidental: only an admin reaches it, and every access of rows the admin
 * does NOT own is written to `audit_log`.
 *
 * Returns null (NOT an empty list) when the caller is not acting as an admin — the
 * god-view is admin-only at the application layer too, a defense-in-depth check above
 * the permissive RLS policy. In mock mode returns []. `owner_user_id` is carried back
 * so the access event records which owners were viewed and the UI can attribute rows.
 *
 * The audit is written INSIDE the same `withIdentity` transaction as the read, so the
 * ledger entry and the access it records commit (or roll back) atomically — a viewed-
 * but-unledgered read is impossible. One row per access event, never per note row.
 */
export async function listAllPersonalNotesAsAdmin(
  identity: IdentityContext,
): Promise<AdminPersonalNote[] | null> {
  if (!isAdmin(identity)) return null;

  const rows = await withIdentity(identity, async (client) => {
    const { rows } = await client.query<AdminPersonalNoteRow>(
      `SELECT id, owner_user_id, body, created_at, updated_at
         FROM personal_note
        ORDER BY created_at DESC`,
    );
    await writeGodviewAudit(client, identity, rows);
    return rows;
  });
  return (rows ?? []).map(mapAdminRow);
}

/**
 * Ledger one god-view access event when the admin read includes rows it does not own
 * (ADR-0105 §3b: the owner's own reads are never audited). One `audit_log` row per
 * access event — `detail` records how many notes were viewed and the distinct owners
 * crossed, never the note bodies (no PII in the ledger). Skipped entirely when the
 * read returned no cross-owner rows.
 */
async function writeGodviewAudit(
  client: PoolClient,
  identity: IdentityContext,
  rows: AdminPersonalNoteRow[],
): Promise<void> {
  const adminUserId = identity.userId ?? null;
  const crossOwner = rows.filter((r) => r.owner_user_id !== adminUserId);
  if (crossOwner.length === 0) return; // saw only own notes → not a god-view event

  const ownersViewed = Array.from(new Set(crossOwner.map((r) => r.owner_user_id)));
  await client.query(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, detail)
     VALUES ($1, $2, 'personal_note',
             jsonb_build_object('notesViewed', $3::int, 'ownersViewed', $4::jsonb))`,
    [
      adminUserId,
      PERSONAL_NOTE_GODVIEW_ACTION,
      crossOwner.length,
      JSON.stringify(ownersViewed),
    ],
  );
}
