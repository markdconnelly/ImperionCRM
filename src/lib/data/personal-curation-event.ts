/**
 * `personal_curation_event` data layer — the owner's READ view of the append-only
 * Personal Curator ledger (#1157, ADR-0114 amendment to ADR-0105). Every Curator /
 * LP-vectorizer god-view action over the owner's personal tier is recorded as one
 * row; this surface lets the owner see what was done to their data (transparency).
 *
 * The INSERTs are made by the service actors in the backend (curator role) — that
 * write path is the audit control enforced at the curator's data layer (BE #302),
 * not here. The web app only reads the caller's own ledger, via RLS.
 *
 * Server-only; degrades to `[]` in mock mode (no pool).
 */
import "server-only";
import type { IdentityContext } from "@/lib/db/identity";
import { withIdentity } from "@/lib/db/identity";

export type CurationAction =
  | "project"
  | "ingest"
  | "embed_enqueue"
  | "invalidate"
  | "propose_resolution";

export interface PersonalCurationEvent {
  id: string;
  actor: string;
  action: CurationAction;
  subjectRef: string | null;
  detail: Record<string, unknown>;
  at: string;
}

interface PersonalCurationEventRow {
  id: string;
  actor: string;
  action: CurationAction;
  subject_ref: string | null;
  detail: Record<string, unknown>;
  at: string;
}

const SELECT_COLS = "id, actor, action, subject_ref, detail, at";

function mapRow(r: PersonalCurationEventRow): PersonalCurationEvent {
  return {
    id: r.id,
    actor: r.actor,
    action: r.action,
    subjectRef: r.subject_ref,
    detail: r.detail,
    at: r.at,
  };
}

/**
 * The caller's curation ledger, newest first. Relies on RLS for owner scope — no
 * owner filter. `limit` bounds the page (default 100).
 */
export async function listCurationEvents(
  identity: IdentityContext,
  limit = 100,
): Promise<PersonalCurationEvent[]> {
  const rows = await withIdentity(identity, async (client) => {
    const { rows } = await client.query<PersonalCurationEventRow>(
      `SELECT ${SELECT_COLS}
         FROM personal_curation_event
        ORDER BY at DESC
        LIMIT $1`,
      [limit],
    );
    return rows;
  });
  return (rows ?? []).map(mapRow);
}
