/**
 * `memory_drawer` data layer — bronze verbatim NON-AGENT memory (#1163, ADR-0113):
 * user notes + captured human conversations. Agent-run transcripts live in
 * `agent_message` (0056/0163) — the two verbatim stores are split by origin.
 *
 * Every read/write routes through `withIdentity`, so the two-axis RLS policy
 * (migration 0167) scopes rows AT THE DATABASE — personal drawers to their owner
 * (`app.user_id`), company/shared drawers to any identified caller. The storage
 * layer is the floor, not an application `WHERE` clause: reads carry no
 * `owner_user_id` filter, RLS supplies it.
 *
 * This is the frontend surface: GUI reads (drill into a conversation's verbatim
 * turns; the caller's recent memory) plus one owner-scoped write for a
 * user-authored note (supersedes `personal_note`'s create). The capture of human
 * conversations and write-time enrichment are a backend PROCESS (ADR-0042 §1,
 * Backend #303); producing + embedding the gold SUMMARY is LocalPipeline (#300).
 * Bronze itself holds no embedding — it is the verbatim store the gold summary
 * drills into.
 *
 * Server-only; degrades to `[]` / `null` in mock mode (no pool), like the rest of
 * the data layer (ADR-0024).
 */
import "server-only";
import type { IdentityContext } from "@/lib/db/identity";
import { withIdentity } from "@/lib/db/identity";

export interface MemoryDrawerTurn {
  id: string;
  conversationId: string;
  turnIndex: number | null;
  wing: string;
  room: string | null;
  role: string | null;
  body: string;
  createdAt: string;
}

interface MemoryDrawerRow {
  id: string;
  conversation_id: string;
  turn_index: number | null;
  wing: string;
  room: string | null;
  role: string | null;
  body: string;
  created_at: string;
}

const SELECT_COLS =
  "id, conversation_id, turn_index, wing, room, role, body, created_at";

function mapRow(r: MemoryDrawerRow): MemoryDrawerTurn {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    turnIndex: r.turn_index,
    wing: r.wing,
    room: r.room,
    role: r.role,
    body: r.body,
    createdAt: r.created_at,
  };
}

/**
 * The verbatim turns of one conversation, in order — the gold→bronze drill-down.
 * RLS scopes visibility; `conversation_id` is a query filter, not a security one.
 */
export async function listConversationDrawers(
  identity: IdentityContext,
  conversationId: string,
): Promise<MemoryDrawerTurn[]> {
  const rows = await withIdentity(identity, async (client) => {
    const { rows } = await client.query<MemoryDrawerRow>(
      `SELECT ${SELECT_COLS}
         FROM memory_drawer
        WHERE conversation_id = $1
        ORDER BY turn_index ASC NULLS LAST, created_at ASC`,
      [conversationId],
    );
    return rows;
  });
  return (rows ?? []).map(mapRow);
}

/**
 * The caller's most recent visible memory (newest first). Relies on RLS for
 * scope — no owner filter — so it returns the caller's personal drawers plus the
 * agent/company drawers they may see.
 */
export async function listRecentDrawers(
  identity: IdentityContext,
  limit = 50,
): Promise<MemoryDrawerTurn[]> {
  const rows = await withIdentity(identity, async (client) => {
    const { rows } = await client.query<MemoryDrawerRow>(
      `SELECT ${SELECT_COLS}
         FROM memory_drawer
        ORDER BY created_at DESC
        LIMIT $1`,
      [limit],
    );
    return rows;
  });
  return (rows ?? []).map(mapRow);
}

export interface NewDrawerNote {
  /** Scope key, e.g. `user:<id>` / `project:<id>`. Defaults to the caller's `user:` wing. */
  wing?: string;
  /** Topic within the wing. */
  room?: string | null;
  /** Group these turns; a new id is minted when omitted (a standalone note). */
  conversationId?: string | null;
  /** The verbatim text. */
  body: string;
}

/**
 * Create an owner-scoped user-authored note (role `note`). Returns null in mock
 * mode, or when the caller's `app_user.id` is unresolved — a personal drawer
 * cannot exist without an owner, and the RLS `WITH CHECK` would reject it.
 * `content_hash` is computed in SQL (`md5(body)`); `turn_key` is left NULL — the
 * backend capture loop owns turn keying.
 */
export async function createDrawerNote(
  identity: IdentityContext,
  note: NewDrawerNote,
): Promise<MemoryDrawerTurn | null> {
  if (!identity.userId) return null;
  const wing = note.wing ?? `user:${identity.userId}`;
  const row = await withIdentity(identity, async (client) => {
    const { rows } = await client.query<MemoryDrawerRow>(
      `INSERT INTO memory_drawer
         (conversation_id, wing, room, owner_user_id, role, body, content_hash)
       VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, 'note', $5, md5($5))
       RETURNING ${SELECT_COLS}`,
      [note.conversationId ?? null, wing, note.room ?? null, identity.userId, note.body],
    );
    return rows[0];
  });
  return row ? mapRow(row) : null;
}
