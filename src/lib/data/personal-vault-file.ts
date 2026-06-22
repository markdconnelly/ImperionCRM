/**
 * `personal_vault_file` data layer — the Postgres pointer/mirror of a per-owner
 * Curated Vault blob markdown filesystem (#1157, ADR-0114 §8). This is the
 * owner-facing READ surface (list the caller's own vault files); the Personal
 * Curator's projection/ingest writes run in the backend as the curator service
 * role (BE #302), reached via that role's god-view policy (migration 0169).
 *
 * Every read routes through `withIdentity`, so the owner-axis RLS policy scopes
 * rows AT THE DATABASE to `app.user_id` — no `owner_user_id` WHERE clause.
 *
 * Server-only; degrades to `[]` in mock mode (no pool), like the rest of the
 * data layer (ADR-0024).
 */
import "server-only";
import type { IdentityContext } from "@/lib/db/identity";
import { withIdentity } from "@/lib/db/identity";

export type VaultSyncState = "projected" | "human_edited" | "conflict";

export interface PersonalVaultFile {
  id: string;
  roomPath: string;
  filePath: string;
  blobRef: string;
  contentHash: string | null;
  syncState: VaultSyncState;
  syncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PersonalVaultFileRow {
  id: string;
  room_path: string;
  file_path: string;
  blob_ref: string;
  content_hash: string | null;
  sync_state: VaultSyncState;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

const SELECT_COLS =
  "id, room_path, file_path, blob_ref, content_hash, sync_state, synced_at, created_at, updated_at";

function mapRow(r: PersonalVaultFileRow): PersonalVaultFile {
  return {
    id: r.id,
    roomPath: r.room_path,
    filePath: r.file_path,
    blobRef: r.blob_ref,
    contentHash: r.content_hash,
    syncState: r.sync_state,
    syncedAt: r.synced_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export interface VaultFileListOpts {
  /** Restrict to one room scope (path prefix). */
  roomPath?: string;
  /** Restrict to one sync state (e.g. surface conflicts). */
  syncState?: VaultSyncState;
}

/**
 * The caller's vault files (by file path). Relies on RLS for owner scope — no
 * owner filter. Optional room/sync-state filters compose with positional params.
 */
export async function listVaultFiles(
  identity: IdentityContext,
  opts: VaultFileListOpts = {},
): Promise<PersonalVaultFile[]> {
  const rows = await withIdentity(identity, async (client) => {
    const params: unknown[] = [];
    const clauses: string[] = [];
    if (opts.roomPath) {
      params.push(opts.roomPath);
      clauses.push(`room_path = $${params.length}`);
    }
    if (opts.syncState) {
      params.push(opts.syncState);
      clauses.push(`sync_state = $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await client.query<PersonalVaultFileRow>(
      `SELECT ${SELECT_COLS}
         FROM personal_vault_file
        ${where}
        ORDER BY file_path ASC`,
      params,
    );
    return rows;
  });
  return (rows ?? []).map(mapRow);
}
