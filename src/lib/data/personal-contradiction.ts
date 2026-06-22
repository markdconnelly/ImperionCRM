/**
 * `personal_contradiction` data layer — Knowledge Contradictions the Personal
 * Curator detected (fact-vs-fact or fact-vs-vault), awaiting the OWNER's approval
 * (#1157, ADR-0114). The Curator OPENS contradictions in the backend (its god-view
 * role); this FE surface is the owner side: list mine, and RESOLVE mine (approve /
 * dismiss) — never auto-resolved.
 *
 * Every read/write routes through `withIdentity`, so the owner-axis RLS policy
 * scopes rows AT THE DATABASE to `app.user_id` — no `owner_user_id` WHERE clause.
 *
 * Server-only; degrades to `[]` / `null` in mock mode (no pool), like the rest of
 * the data layer (ADR-0024).
 */
import "server-only";
import type { IdentityContext } from "@/lib/db/identity";
import { withIdentity } from "@/lib/db/identity";

export type ContradictionStatus = "open" | "approved" | "dismissed";
/** The two terminal states an owner can move an open contradiction to. */
export type ContradictionResolution = "approved" | "dismissed";

export interface PersonalContradiction {
  id: string;
  roomPath: string | null;
  factAId: string | null;
  factBId: string | null;
  vaultFileId: string | null;
  detail: string;
  status: ContradictionStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PersonalContradictionRow {
  id: string;
  room_path: string | null;
  fact_a_id: string | null;
  fact_b_id: string | null;
  vault_file_id: string | null;
  detail: string;
  status: ContradictionStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

const SELECT_COLS =
  "id, room_path, fact_a_id, fact_b_id, vault_file_id, detail, status, " +
  "resolved_by, resolved_at, created_at, updated_at";

function mapRow(r: PersonalContradictionRow): PersonalContradiction {
  return {
    id: r.id,
    roomPath: r.room_path,
    factAId: r.fact_a_id,
    factBId: r.fact_b_id,
    vaultFileId: r.vault_file_id,
    detail: r.detail,
    status: r.status,
    resolvedBy: r.resolved_by,
    resolvedAt: r.resolved_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/**
 * The caller's contradictions, newest first. Relies on RLS for owner scope.
 * Defaults to the actionable set (`open`); pass a status to widen/narrow.
 */
export async function listContradictions(
  identity: IdentityContext,
  opts: { status?: ContradictionStatus } = { status: "open" },
): Promise<PersonalContradiction[]> {
  const rows = await withIdentity(identity, async (client) => {
    const params: unknown[] = [];
    let where = "";
    if (opts.status) {
      params.push(opts.status);
      where = `WHERE status = $${params.length}`;
    }
    const { rows } = await client.query<PersonalContradictionRow>(
      `SELECT ${SELECT_COLS}
         FROM personal_contradiction
        ${where}
        ORDER BY created_at DESC`,
      params,
    );
    return rows;
  });
  return (rows ?? []).map(mapRow);
}

/**
 * Resolve an OPEN contradiction (approve or dismiss), stamping the owner as
 * `resolved_by` and `resolved_at = now()`. Idempotent: only matches a row still
 * `open`, so a re-resolve is a no-op. RLS scopes the row to its owner; `id` is a
 * query filter, not a security one. Returns the updated row, or null when nothing
 * matched (already resolved, not owned, unresolved identity, or mock mode).
 */
export async function resolveContradiction(
  identity: IdentityContext,
  id: string,
  resolution: ContradictionResolution,
): Promise<PersonalContradiction | null> {
  if (!identity.userId) return null;
  const row = await withIdentity(identity, async (client) => {
    const { rows } = await client.query<PersonalContradictionRow>(
      `UPDATE personal_contradiction
          SET status = $2, resolved_by = $3, resolved_at = now()
        WHERE id = $1 AND status = 'open'
       RETURNING ${SELECT_COLS}`,
      [id, resolution, identity.userId],
    );
    return rows[0] ?? null;
  });
  return row ? mapRow(row) : null;
}
