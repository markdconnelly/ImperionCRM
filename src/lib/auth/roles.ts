/**
 * Application roles and capability predicates (ADR-0030).
 *
 * Roles derive from Entra security-group / app-role claims (the five
 * `Application.ImperionCRM.*` groups) and are normalized into this small,
 * stable set. This module is PURE — no `pg`, no `node:*`, no env reads — so it
 * is safe to import from edge (middleware), server, and client components alike.
 *
 * Default role is `support` (the most restricted): a user with no recognized
 * group claim sees the least. See `claims.ts` for how claims become roles.
 */

export const APP_ROLES = [
  "admin",
  "finance",
  "project_manager",
  "sales",
  "support",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

/** Most-restricted fallback when no group/app-role claim is recognized. */
export const DEFAULT_ROLE: AppRole = "support";

/**
 * Entra group display name / App-Role value → AppRole. Used when the token
 * carries human-readable role strings (the App-Role `roles` claim, recommended)
 * rather than raw group GUIDs. GUID→role mapping lives in env (`roleEnv`).
 */
export const APP_ROLE_CLAIM_MAP: Record<string, AppRole> = {
  "Application.ImperionCRM.Admins": "admin",
  "Application.ImperionCRM.Finance": "finance",
  "Application.ImperionCRM.ProjectManager": "project_manager",
  "Application.ImperionCRM.Sales": "sales",
  "Application.ImperionCRM.Support": "support",
};

const ROLE_SET = new Set<string>(APP_ROLES);

/**
 * Coerce an arbitrary list of candidate role strings into known AppRoles,
 * de-duplicated. Empty input (or all-unknown) yields `[DEFAULT_ROLE]` so callers
 * never receive an empty role set.
 */
export function normalizeRoles(input: readonly string[] | undefined): AppRole[] {
  const out = new Set<AppRole>();
  for (const r of input ?? []) {
    if (ROLE_SET.has(r)) out.add(r as AppRole);
  }
  return out.size ? [...out] : [DEFAULT_ROLE];
}

export function hasRole(roles: readonly AppRole[] | undefined, role: AppRole): boolean {
  return Boolean(roles?.includes(role));
}

export function isAdmin(roles: readonly AppRole[] | undefined): boolean {
  return hasRole(roles, "admin");
}

/** Settings (and Security, which now lives under Settings) are admin-only. */
export function canSeeSettings(roles: readonly AppRole[] | undefined): boolean {
  return isAdmin(roles);
}

/**
 * Revenue / MRR / money is hidden from Support. A user whose ONLY role is
 * `support` cannot see revenue; any other role (or a mix) can.
 */
export function canSeeRevenue(roles: readonly AppRole[] | undefined): boolean {
  return Boolean(roles?.some((r) => r !== "support"));
}

/** Placeholder shown in place of a money value the user may not see. */
export const REDACTED_MONEY = "—";

/**
 * Return `value` if the roles may see revenue, else the redaction placeholder.
 * Use server-side, before money reaches the client (see lib/auth/session.ts).
 */
export function redactMoney(
  roles: readonly AppRole[] | undefined,
  value: string,
): string {
  return canSeeRevenue(roles) ? value : REDACTED_MONEY;
}

/** Per-nav-key capability guards. Keys absent here are visible to everyone. */
const NAV_GUARD: Partial<Record<string, (roles: readonly AppRole[] | undefined) => boolean>> = {
  settings: canSeeSettings,
  security: canSeeSettings,
};

/** Whether a nav item (by `key`) should be shown for the given roles. */
export function canSeeFeature(navKey: string, roles: readonly AppRole[] | undefined): boolean {
  const guard = NAV_GUARD[navKey];
  return guard ? guard(roles) : true;
}
