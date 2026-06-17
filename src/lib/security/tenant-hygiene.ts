/**
 * Tenant hygiene — verified domains, app registrations, directory role
 * assignments: account-scoped read surface + golden-baseline benchmark
 * (#260, posture model ADR-0051, per-source bronze ADR-0039, golden-baseline
 * benchmark precedent ADR-0051 §3 / sensitivity-csa #259).
 *
 * BOUNDARY (front end = GUI, ADR-0042): this is a pure READ. It joins the bronze
 * feeds through `account_tenant` (ADR-0051 tenant scoping) and routes through the
 * optional-enrichment seam (#301/#302) — a not-yet-migrated table/view degrades to
 * an EMPTY result, never a blanked account page. The bronze collectors are a
 * separate on-prem lane; until they (and migration 0136) land, every account
 * renders the honest "absent" / grey state.
 *
 * Bronze envelope follows the 0077/0080 contract: flat text columns, the loader
 * stringifies, real types live in raw_payload. We therefore read text and
 * normalize defensively here.
 *
 * Schema source-of-truth still lives in `ImperionCRM` migrations (0136); this is a
 * READ surface. Never import into a client component — it touches the server-only
 * pool.
 */
import "server-only";
import { getPool } from "@/lib/db/client";
import { isSchemaLagError } from "@/lib/data/postgres/fallback";

/** One Entra verified domain observed in a mapped tenant. */
export interface EntraDomainRow {
  tenantId: string;
  domainName: string;
  isVerified: boolean;
  isDefault: boolean;
  isInitial: boolean;
  authenticationType: string | null;
  collectedAt: string | null;
}

/** One Entra app registration observed in a mapped tenant. */
export interface EntraAppRegistrationRow {
  tenantId: string;
  appObjectId: string;
  appId: string | null;
  displayName: string | null;
  /** Earliest credential expiry across all creds (date string), null when none. */
  earliestCredentialExpiry: string | null;
  hasExpiredCredential: boolean;
  collectedAt: string | null;
}

/** One Entra directory role assignment observed in a mapped tenant. */
export interface EntraRoleAssignmentRow {
  tenantId: string;
  assignmentId: string;
  roleDisplayName: string | null;
  isPrivileged: boolean;
  principalId: string | null;
  principalType: string | null;
  principalDisplayName: string | null;
  collectedAt: string | null;
}

export interface TenantHygieneForAccount {
  domains: EntraDomainRow[];
  appRegistrations: EntraAppRegistrationRow[];
  roleAssignments: EntraRoleAssignmentRow[];
}

/**
 * The MSP tenant-hygiene standard the golden baseline benchmarks every customer
 * tenant against (ADR-0051 §3). Kept here (not in the DB) because it is a small,
 * slow-moving MSP policy constant the read surface compares against — the same
 * shape as the secure-score control golden list and STANDARD_CSA_SET (#259).
 *
 * - `maxPrivilegedPrincipals`: privileged directory-role holders (distinct
 *   principals) above this is sprawl. Microsoft's own guidance is 2–4 Global
 *   Admins; we benchmark privileged-role holders against the upper bound.
 * - `credentialExpiryWarningDays`: an app-registration credential within this
 *   many days of expiry is "expiring soon" (rotate before it breaks the app). An
 *   already-expired credential always fails regardless of the window.
 */
export const TENANT_HYGIENE_STANDARD = {
  maxPrivilegedPrincipals: 4,
  credentialExpiryWarningDays: 30,
} as const;

/** Three-level posture rating shared across the hygiene checks. */
export type HygieneStatus = "ok" | "warn" | "fail";

export interface RoleAssignmentBenchmark {
  /** Distinct principals holding at least one privileged directory role. */
  privilegedPrincipals: number;
  /** Distinct principals holding any role assignment at all (the denominator). */
  totalPrincipals: number;
  /** The configured cap (TENANT_HYGIENE_STANDARD.maxPrivilegedPrincipals). */
  cap: number;
  /** ok = at/under cap, warn = up to 2× cap, fail = beyond. */
  status: HygieneStatus;
}

export interface AppCredentialBenchmark {
  /** App registrations observed. */
  total: number;
  /** Apps with at least one already-expired credential. */
  expired: number;
  /** Apps with a credential expiring within the warning window (not yet expired). */
  expiringSoon: number;
  /** ok = none expired/expiring, warn = expiring soon only, fail = any expired. */
  status: HygieneStatus;
}

/**
 * Benchmark directory role assignments against the MSP standard. Pure +
 * deterministic. Privileged-principal sprawl: counts DISTINCT principals (a
 * principal holding several privileged roles counts once) holding any role flagged
 * `isPrivileged`. ok at/under the cap; warn up to 2× the cap; fail beyond.
 */
export function benchmarkRoleAssignments(
  assignments: Pick<
    EntraRoleAssignmentRow,
    "isPrivileged" | "principalId"
  >[],
  standard: { maxPrivilegedPrincipals: number } = TENANT_HYGIENE_STANDARD,
): RoleAssignmentBenchmark {
  const cap = standard.maxPrivilegedPrincipals;
  const allPrincipals = new Set<string>();
  const privilegedPrincipals = new Set<string>();
  for (const a of assignments) {
    const id = (a.principalId ?? "").trim();
    if (id === "") continue;
    allPrincipals.add(id);
    if (a.isPrivileged) privilegedPrincipals.add(id);
  }
  const count = privilegedPrincipals.size;
  const status: HygieneStatus =
    count <= cap ? "ok" : count <= cap * 2 ? "warn" : "fail";
  return {
    privilegedPrincipals: count,
    totalPrincipals: allPrincipals.size,
    cap,
    status,
  };
}

/**
 * Benchmark app-registration credential hygiene against the MSP standard. Pure +
 * deterministic — `now` is injected so the test is stable. An app with any
 * already-expired credential fails; an app with a credential expiring within the
 * warning window (but not yet expired) warns. ok when nothing is expired or
 * expiring. `earliestCredentialExpiry` is the collector-computed min end date; a
 * null/blank value means "no credentials" and is neither expired nor expiring.
 */
export function benchmarkAppCredentials(
  apps: Pick<
    EntraAppRegistrationRow,
    "earliestCredentialExpiry" | "hasExpiredCredential"
  >[],
  now: Date = new Date(),
  standard: { credentialExpiryWarningDays: number } = TENANT_HYGIENE_STANDARD,
): AppCredentialBenchmark {
  const windowMs = standard.credentialExpiryWarningDays * 24 * 60 * 60 * 1000;
  const horizon = now.getTime() + windowMs;
  let expired = 0;
  let expiringSoon = 0;
  for (const app of apps) {
    if (app.hasExpiredCredential) {
      expired += 1;
      continue;
    }
    const raw = (app.earliestCredentialExpiry ?? "").trim();
    if (raw === "") continue;
    const t = Date.parse(raw);
    if (Number.isNaN(t)) continue;
    if (t <= now.getTime()) expired += 1;
    else if (t <= horizon) expiringSoon += 1;
  }
  const status: HygieneStatus =
    expired > 0 ? "fail" : expiringSoon > 0 ? "warn" : "ok";
  return { total: apps.length, expired, expiringSoon, status };
}

function toBool(value: string | null): boolean {
  return (value ?? "").toLowerCase() === "true";
}

function fmtDate(value: string | null): string | null {
  return value ? value.slice(0, 10) : null;
}

/**
 * Read Entra domains + app registrations + role assignments for every Customer
 * Tenant mapped to an account. Schema-lag (collector not yet migrated) → empty
 * arrays per feed; null pool (local/demo) → all empty. Never throws for the
 * absent-data case so the posture page degrades gracefully to grey. A real
 * (non-schema-lag) error still propagates.
 */
export async function listTenantHygieneForAccount(
  accountId: string,
): Promise<TenantHygieneForAccount> {
  const pool = getPool();
  if (!pool)
    return { domains: [], appRegistrations: [], roleAssignments: [] };

  let domains: EntraDomainRow[] = [];
  let appRegistrations: EntraAppRegistrationRow[] = [];
  let roleAssignments: EntraRoleAssignmentRow[] = [];

  try {
    const { rows } = await pool.query<{
      tenant_id: string;
      domain_name: string | null;
      external_id: string;
      is_verified: string | null;
      is_default: string | null;
      is_initial: string | null;
      authentication_type: string | null;
      collected_at: string | null;
    }>(
      `SELECT d.tenant_id, d.domain_name, d.external_id, d.is_verified,
              d.is_default, d.is_initial, d.authentication_type,
              d.collected_at::text AS collected_at
         FROM entra_domains d
         JOIN account_tenant m ON m.tenant_id = d.tenant_id
        WHERE m.account_id = $1::uuid
        ORDER BY d.is_default DESC NULLS LAST, d.domain_name NULLS LAST`,
      [accountId],
    );
    domains = rows.map((r) => ({
      tenantId: r.tenant_id,
      domainName: r.domain_name ?? r.external_id,
      isVerified: toBool(r.is_verified),
      isDefault: toBool(r.is_default),
      isInitial: toBool(r.is_initial),
      authenticationType: r.authentication_type,
      collectedAt: fmtDate(r.collected_at),
    }));
  } catch (err) {
    if (!isSchemaLagError(err)) throw err;
  }

  try {
    const { rows } = await pool.query<{
      tenant_id: string;
      external_id: string;
      app_id: string | null;
      display_name: string | null;
      earliest_credential_expiry: string | null;
      has_expired_credential: string | null;
      collected_at: string | null;
    }>(
      `SELECT a.tenant_id, a.external_id, a.app_id, a.display_name,
              a.earliest_credential_expiry, a.has_expired_credential,
              a.collected_at::text AS collected_at
         FROM entra_app_registrations a
         JOIN account_tenant m ON m.tenant_id = a.tenant_id
        WHERE m.account_id = $1::uuid
        ORDER BY a.display_name NULLS LAST`,
      [accountId],
    );
    appRegistrations = rows.map((r) => ({
      tenantId: r.tenant_id,
      appObjectId: r.external_id,
      appId: r.app_id,
      displayName: r.display_name,
      earliestCredentialExpiry: fmtDate(r.earliest_credential_expiry),
      hasExpiredCredential: toBool(r.has_expired_credential),
      collectedAt: fmtDate(r.collected_at),
    }));
  } catch (err) {
    if (!isSchemaLagError(err)) throw err;
  }

  try {
    const { rows } = await pool.query<{
      tenant_id: string;
      external_id: string;
      role_display_name: string | null;
      is_privileged: string | null;
      principal_id: string | null;
      principal_type: string | null;
      principal_display_name: string | null;
      collected_at: string | null;
    }>(
      `SELECT r.tenant_id, r.external_id, r.role_display_name, r.is_privileged,
              r.principal_id, r.principal_type, r.principal_display_name,
              r.collected_at::text AS collected_at
         FROM entra_role_assignments r
         JOIN account_tenant m ON m.tenant_id = r.tenant_id
        WHERE m.account_id = $1::uuid
        ORDER BY r.is_privileged DESC NULLS LAST, r.role_display_name NULLS LAST`,
      [accountId],
    );
    roleAssignments = rows.map((r) => ({
      tenantId: r.tenant_id,
      assignmentId: r.external_id,
      roleDisplayName: r.role_display_name,
      isPrivileged: toBool(r.is_privileged),
      principalId: r.principal_id,
      principalType: r.principal_type,
      principalDisplayName: r.principal_display_name,
      collectedAt: fmtDate(r.collected_at),
    }));
  } catch (err) {
    if (!isSchemaLagError(err)) throw err;
  }

  return { domains, appRegistrations, roleAssignments };
}
