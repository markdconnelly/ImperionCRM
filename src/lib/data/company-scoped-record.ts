/**
 * `company_scoped_record` data layer — the access-spine slice 3a proof (#979, ADR-0105 §3a).
 *
 * Every read/write goes through `withIdentity`, so the company/role RLS policy (migration
 * 0186) gates rows to the caller's `app.groups` AT THE DATABASE — the storage layer is the
 * floor, not an application `WHERE` clause. The SELECT deliberately carries NO role filter:
 * RLS supplies the whole-table gate (`app_role_in_scope(ARRAY['finance','admin'])`), and that
 * is exactly the property this proof demonstrates. INSERT relies on the policy's `WITH CHECK`
 * to reject a write from an out-of-scope caller.
 *
 * Server-only; degrades to `[]` / `null` in mock mode (no pool), like the rest of the data
 * layer (ADR-0024).
 */
import "server-only";
import type { IdentityContext } from "@/lib/db/identity";
import { withIdentity } from "@/lib/db/identity";

export interface CompanyScopedRecord {
  id: string;
  label: string;
  createdAt: string;
  updatedAt: string;
}

interface CompanyScopedRecordRow {
  id: string;
  label: string;
  created_at: string;
  updated_at: string;
}

function mapRow(r: CompanyScopedRecordRow): CompanyScopedRecord {
  return { id: r.id, label: r.label, createdAt: r.created_at, updatedAt: r.updated_at };
}

/**
 * The company-scoped records the caller may reach (newest first). RLS scopes the rows to
 * callers whose roles intersect the table gate (finance + admin) — an out-of-scope caller
 * sees none.
 */
export async function listCompanyScopedRecords(
  identity: IdentityContext,
): Promise<CompanyScopedRecord[]> {
  const rows = await withIdentity(identity, async (client) => {
    const { rows } = await client.query<CompanyScopedRecordRow>(
      `SELECT id, label, created_at, updated_at
         FROM company_scoped_record
        ORDER BY created_at DESC`,
    );
    return rows;
  });
  return (rows ?? []).map(mapRow);
}

/**
 * Create a company-scoped record. Returns null in mock mode. The RLS policy's `WITH CHECK`
 * rejects the INSERT when the caller's roles are out of scope (a transaction error bubbles
 * to the caller), so this never silently creates an unreachable row.
 */
export async function createCompanyScopedRecord(
  identity: IdentityContext,
  label: string,
): Promise<CompanyScopedRecord | null> {
  const row = await withIdentity(identity, async (client) => {
    const { rows } = await client.query<CompanyScopedRecordRow>(
      `INSERT INTO company_scoped_record (label)
       VALUES ($1)
       RETURNING id, label, created_at, updated_at`,
      [label],
    );
    return rows[0];
  });
  return row ? mapRow(row) : null;
}
