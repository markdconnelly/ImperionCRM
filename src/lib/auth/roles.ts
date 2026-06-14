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
 * The AI operations pages — AI Agents and Board of Directors — are admin-only
 * (#90): they expose org-wide model-tier, budget, and deliberation controls, so
 * they match the Settings gate (ADR-0030) rather than a per-module capability.
 */
export function canSeeAgentPages(roles: readonly AppRole[] | undefined): boolean {
  return isAdmin(roles);
}

/**
 * Project-board writes — creating/editing projects and project types — belong
 * to delivery: admin | project_manager (ADR-0052 §8). This is the GUI-side
 * twin of the `delivery:write` capability the server actions enforce
 * (ADR-0045); reads stay open to all roles.
 */
export function canManageProjects(roles: readonly AppRole[] | undefined): boolean {
  return isAdmin(roles) || hasRole(roles, "project_manager");
}

/**
 * Sales-activity writes — creating/completing sales tasks from the Sales
 * Activity page — belong to sales: admin | sales (ADR-0052 §8). GUI-side twin
 * of the `sales:write` capability the server actions enforce (ADR-0045);
 * reads stay open to all roles.
 */
export function canManageSales(roles: readonly AppRole[] | undefined): boolean {
  return isAdmin(roles) || hasRole(roles, "sales");
}

/**
 * Campaign/event/send writes — campaigns, ads, audiences, events, scheduled
 * sends — belong to marketing-capable roles: admin | sales (ADR-0053 §8). GUI-side
 * twin of the `sales:write` capability the server actions enforce (ADR-0045);
 * reads stay open to all roles.
 */
export function canManageCampaigns(roles: readonly AppRole[] | undefined): boolean {
  return isAdmin(roles) || hasRole(roles, "sales");
}

/**
 * The timesheet correctness-approval surface (ADR-0082) is admin-only — the
 * GUI-side twin of the `time:approve` capability the server actions enforce.
 * (Payroll approval — finance∨admin — is a separate gate on the #466 surface.)
 */
export function canApproveTimesheets(roles: readonly AppRole[] | undefined): boolean {
  return isAdmin(roles);
}

/**
 * The employee mapping confirm surface (ADR-0082, #468) is admin one-time setup —
 * admin-only. GUI-side twin of the `time:map` capability the server action enforces.
 */
export function canManageEmployeeMappings(roles: readonly AppRole[] | undefined): boolean {
  return isAdmin(roles);
}

/**
 * The payroll-approval surface (ADR-0082, #466) is the CFO gate — finance∨admin
 * (Mark's call: admin is the top tier and holds it implicitly). GUI-side twin of
 * the `time:payroll-approve` capability the server actions enforce. Distinct from
 * the admin correctness gate (`canApproveTimesheets`): payroll approval authorizes
 * payment and confirms the QuickBooks match; it never touches comp data.
 */
export function canApprovePayroll(roles: readonly AppRole[] | undefined): boolean {
  return isAdmin(roles) || hasRole(roles, "finance");
}

/**
 * Revenue / MRR / money is hidden from Support. A user whose ONLY role is
 * `support` cannot see revenue; any other role (or a mix) can.
 */
export function canSeeRevenue(roles: readonly AppRole[] | undefined): boolean {
  return Boolean(roles?.some((r) => r !== "support"));
}

/**
 * Labor-cost / pay-derived efficiency analytics (ADR-0082, #467) are comp-sensitive:
 * the figures are derived from effective-dated `pay_rate`, so they are restricted
 * to finance | admin and never shown employee/client-facing. GUI-side twin of the
 * comp gate the repo read enforces (the cost query never runs for other roles).
 * (Utilization itself is comp-free, but the whole /reporting efficiency section
 * rides this gate per the issue.)
 */
export function canSeeLaborCost(roles: readonly AppRole[] | undefined): boolean {
  return isAdmin(roles) || hasRole(roles, "finance");
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
  agents: canSeeAgentPages,
  board: canSeeAgentPages,
  "time-approvals": canApproveTimesheets,
  "time-mappings": canManageEmployeeMappings,
  "time-payroll": canApprovePayroll,
};

/** Whether a nav item (by `key`) should be shown for the given roles. */
export function canSeeFeature(navKey: string, roles: readonly AppRole[] | undefined): boolean {
  const guard = NAV_GUARD[navKey];
  return guard ? guard(roles) : true;
}
