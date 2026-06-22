/**
 * `domain_owner` data layer — the domain-owner registry (#1035, ADR-01XX): per concept/domain →
 * the business owner who resolves grounding conflicts in that domain (with a fallback role so an
 * unassigned domain still routes somewhere). Company-tier reference/config (archetype H): broad
 * employee read, admin-managed writes.
 *
 * Every read/write routes through `withIdentity` (the role grant + RLS posture is enforced at the
 * DB). Server-only; degrades to `[]` / `null` in mock mode (no pool), like the rest of the data
 * layer (ADR-0024).
 */
import "server-only";
import type { IdentityContext } from "@/lib/db/identity";
import { withIdentity } from "@/lib/db/identity";

export interface DomainOwner {
  domain: string;
  label: string;
  ownerUserId: string | null;
  fallbackRoleSlug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DomainOwnerRow {
  domain: string;
  label: string;
  owner_user_id: string | null;
  fallback_role_slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

const SELECT_COLS =
  "domain, label, owner_user_id, fallback_role_slug, description, created_at, updated_at";

function mapRow(r: DomainOwnerRow): DomainOwner {
  return {
    domain: r.domain,
    label: r.label,
    ownerUserId: r.owner_user_id,
    fallbackRoleSlug: r.fallback_role_slug,
    description: r.description,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** The full registry, alphabetical by domain. Broad employee read. */
export async function listDomainOwners(identity: IdentityContext): Promise<DomainOwner[]> {
  const rows = await withIdentity(identity, async (client) => {
    const { rows } = await client.query<DomainOwnerRow>(
      `SELECT ${SELECT_COLS} FROM domain_owner ORDER BY domain ASC`,
    );
    return rows;
  });
  return (rows ?? []).map(mapRow);
}

/** A single domain's registry row, or null if absent / mock mode. */
export async function getDomainOwner(
  identity: IdentityContext,
  domain: string,
): Promise<DomainOwner | null> {
  const row = await withIdentity(identity, async (client) => {
    const { rows } = await client.query<DomainOwnerRow>(
      `SELECT ${SELECT_COLS} FROM domain_owner WHERE domain = $1`,
      [domain],
    );
    return rows[0] ?? null;
  });
  return row ? mapRow(row) : null;
}

/**
 * Assign (or reassign) the business owner for a domain — admin-managed (the DB grant restricts the
 * write to the web role; the cockpit gates the UI to admins). Updates `owner_user_id` and,
 * optionally, the fallback role. Returns the updated row, or null if the domain is unknown / mock.
 */
export async function assignDomainOwner(
  identity: IdentityContext,
  domain: string,
  ownerUserId: string | null,
  fallbackRoleSlug?: string,
): Promise<DomainOwner | null> {
  const row = await withIdentity(identity, async (client) => {
    const sets = ["owner_user_id = $2"];
    const params: unknown[] = [domain, ownerUserId];
    if (fallbackRoleSlug !== undefined) {
      params.push(fallbackRoleSlug);
      sets.push(`fallback_role_slug = $${params.length}`);
    }
    const { rows } = await client.query<DomainOwnerRow>(
      `UPDATE domain_owner SET ${sets.join(", ")}
        WHERE domain = $1
       RETURNING ${SELECT_COLS}`,
      params,
    );
    return rows[0] ?? null;
  });
  return row ? mapRow(row) : null;
}
