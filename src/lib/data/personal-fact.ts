/**
 * `personal_fact` data layer — the personal-tier temporal knowledge graph
 * (#1155, epic #1152, ADR-0114). Owner-private entity–relation–object triples,
 * each carrying a Validity Window (`valid_from`/`valid_to`) so "freshness =
 * correctness" is modelled as data.
 *
 * Every read/write routes through `withIdentity`, so the owner-axis RLS policy
 * (migration 0168) scopes rows AT THE DATABASE to `app.user_id`. The storage
 * layer is the floor, not an application `WHERE` clause: queries carry no
 * `owner_user_id` filter — RLS supplies it, and inserts stamp the resolved
 * `app_user.id` so the RLS `WITH CHECK` accepts the row.
 *
 * Four pure-SQL operations (the issue's contract):
 *   - add        — insert a fact (window opens at `valid_from`, default now()).
 *   - invalidate — close a live fact's window (`valid_to = now()`); the Curator
 *                  does this on contradiction (BE #302). Never a hard delete.
 *   - timeline   — a subject's facts ordered by window (history view).
 *   - current    — the live set (`valid_to IS NULL`) — what the store reflects "now".
 *
 * Provenance is polymorphic: a fact cites its verbatim source with a
 * `(source_kind, source_id)` pair — `memory_drawer` (0167) for non-agent turns,
 * `agent_message` (0056/0163) for agent runs (split by origin, ADR-0113).
 *
 * Server-only; degrades to `[]` / `null` in mock mode (no pool), like the rest
 * of the data layer (ADR-0024).
 */
import "server-only";
import type { IdentityContext } from "@/lib/db/identity";
import { withIdentity } from "@/lib/db/identity";

/** The two verbatim bronze stores a fact can cite (split by origin, ADR-0113). */
export type PersonalFactSourceKind = "memory_drawer" | "agent_message";

/** Polymorphic provenance back to a verbatim bronze row. */
export interface PersonalFactSource {
  kind: PersonalFactSourceKind;
  id: string;
}

export interface PersonalFact {
  id: string;
  roomPath: string;
  subject: string;
  predicate: string;
  object: string;
  validFrom: string;
  /** NULL = currently valid; set = the window was closed (invalidated/superseded). */
  validTo: string | null;
  /** Provenance back to verbatim bronze, or null when synthesized without a single source. */
  source: PersonalFactSource | null;
  confidence: number | null;
  createdAt: string;
  updatedAt: string;
}

interface PersonalFactRow {
  id: string;
  room_path: string;
  subject: string;
  predicate: string;
  object: string;
  valid_from: string;
  valid_to: string | null;
  source_kind: PersonalFactSourceKind | null;
  source_id: string | null;
  confidence: number | null;
  created_at: string;
  updated_at: string;
}

const SELECT_COLS =
  "id, room_path, subject, predicate, object, valid_from, valid_to, " +
  "source_kind, source_id, confidence, created_at, updated_at";

function mapRow(r: PersonalFactRow): PersonalFact {
  return {
    id: r.id,
    roomPath: r.room_path,
    subject: r.subject,
    predicate: r.predicate,
    object: r.object,
    validFrom: r.valid_from,
    validTo: r.valid_to,
    source: r.source_kind && r.source_id ? { kind: r.source_kind, id: r.source_id } : null,
    confidence: r.confidence,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export interface NewPersonalFact {
  roomPath: string;
  subject: string;
  predicate: string;
  object: string;
  /** Window open time; defaults to now() in SQL when omitted. */
  validFrom?: string;
  /** Provenance back to the verbatim bronze row this fact was synthesized from. */
  source?: PersonalFactSource | null;
  confidence?: number | null;
}

/**
 * Insert a fact (the window opens at `valid_from`, default now()). Returns null in
 * mock mode, or when the caller's `app_user.id` is unresolved — a personal fact
 * cannot exist without an owner, and the RLS `WITH CHECK` would reject it.
 */
export async function addFact(
  identity: IdentityContext,
  fact: NewPersonalFact,
): Promise<PersonalFact | null> {
  if (!identity.userId) return null;
  const row = await withIdentity(identity, async (client) => {
    const { rows } = await client.query<PersonalFactRow>(
      `INSERT INTO personal_fact
         (owner_user_id, room_path, subject, predicate, object,
          valid_from, source_kind, source_id, confidence)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()), $7, $8, $9)
       RETURNING ${SELECT_COLS}`,
      [
        identity.userId,
        fact.roomPath,
        fact.subject,
        fact.predicate,
        fact.object,
        fact.validFrom ?? null,
        fact.source?.kind ?? null,
        fact.source?.id ?? null,
        fact.confidence ?? null,
      ],
    );
    return rows[0];
  });
  return row ? mapRow(row) : null;
}

/**
 * Close a live fact's Validity Window (`valid_to = now()`) — the supersede /
 * contradiction action. Idempotent: only matches a fact whose window is still
 * open, so a re-invalidate is a no-op. RLS scopes the fact to its owner; `id`
 * is a query filter, not a security one. Returns the updated fact, or null when
 * nothing matched (already closed, not owned, or mock mode).
 */
export async function invalidateFact(
  identity: IdentityContext,
  factId: string,
): Promise<PersonalFact | null> {
  const row = await withIdentity(identity, async (client) => {
    const { rows } = await client.query<PersonalFactRow>(
      `UPDATE personal_fact
          SET valid_to = now()
        WHERE id = $1 AND valid_to IS NULL
       RETURNING ${SELECT_COLS}`,
      [factId],
    );
    return rows[0] ?? null;
  });
  return row ? mapRow(row) : null;
}

export interface TimelineOpts {
  /** Restrict to one room scope. */
  roomPath?: string;
}

/**
 * A subject's facts ordered by Validity Window (oldest window first) — the
 * history view, including closed windows. RLS scopes to the owner.
 */
export async function timeline(
  identity: IdentityContext,
  subject: string,
  opts: TimelineOpts = {},
): Promise<PersonalFact[]> {
  const rows = await withIdentity(identity, async (client) => {
    const params: unknown[] = [subject];
    let where = "subject = $1";
    if (opts.roomPath) {
      params.push(opts.roomPath);
      where += ` AND room_path = $${params.length}`;
    }
    const { rows } = await client.query<PersonalFactRow>(
      `SELECT ${SELECT_COLS}
         FROM personal_fact
        WHERE ${where}
        ORDER BY valid_from ASC, created_at ASC`,
      params,
    );
    return rows;
  });
  return (rows ?? []).map(mapRow);
}

export interface CurrentOpts {
  /** Restrict to one room scope. */
  roomPath?: string;
  /** Restrict to one subject. */
  subject?: string;
}

/**
 * The live set — facts whose Validity Window is still open (`valid_to IS NULL`),
 * i.e. what the store reflects "now". Newest window first. RLS scopes to the owner.
 */
export async function current(
  identity: IdentityContext,
  opts: CurrentOpts = {},
): Promise<PersonalFact[]> {
  const rows = await withIdentity(identity, async (client) => {
    const params: unknown[] = [];
    let where = "valid_to IS NULL";
    if (opts.subject) {
      params.push(opts.subject);
      where += ` AND subject = $${params.length}`;
    }
    if (opts.roomPath) {
      params.push(opts.roomPath);
      where += ` AND room_path = $${params.length}`;
    }
    const { rows } = await client.query<PersonalFactRow>(
      `SELECT ${SELECT_COLS}
         FROM personal_fact
        WHERE ${where}
        ORDER BY valid_from DESC, created_at DESC`,
      params,
    );
    return rows;
  });
  return (rows ?? []).map(mapRow);
}
