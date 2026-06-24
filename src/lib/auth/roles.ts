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
 * Human-facing display label for each role (#794). The role KEY and the Entra
 * security-group name stay `support` (renaming the group is Mark-gated); only
 * the surfaced label differs — the baseline role is shown as "Technician".
 * Use `roleLabel()` wherever a role is rendered to a user.
 */
export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin",
  finance: "Finance",
  project_manager: "Project Manager",
  sales: "Sales",
  support: "Technician",
};

/** Display label for a role key (#794) — falls back to the key if unknown. */
export function roleLabel(role: string): string {
  return ROLE_LABEL[role as AppRole] ?? role;
}

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
 * The CMDB Configuration Item register (#645, epic #372, ADR-0078) is admin-only:
 * it exposes the full client managed-estate inventory (accounts, end-user
 * identities, devices) as one cross-account CI surface, so it rides the same
 * nav-visibility + route gate as Settings / AI Agents (ADR-0030) rather than a
 * per-module capability. Read-only — there is NO write path, so no `policy.ts`
 * capability is added (mirrors `canSeeAgentPages`).
 */
export function canSeeCmdb(roles: readonly AppRole[] | undefined): boolean {
  return isAdmin(roles) || hasRole(roles, "support");
}

/**
 * The connector catalog (#416, ADR-0076 §4) is admin-only: it is the integration
 * marketplace where org-wide data connectors are enabled, tuned and disabled — the
 * same class as Settings → connections / company credentials (`settings:write`). So
 * it rides the Settings/CMDB nav-visibility + route gate (ADR-0030) rather than a
 * per-module capability. Mutations are additionally enforced by `settings:write`.
 */
export function canSeeConnectors(roles: readonly AppRole[] | undefined): boolean {
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
 * Per-user weekly-capacity admin (ADR-0069 D2, #591) — setting each user's
 * `user_capacity.weekly_hours` (the workload view's per-user over-allocation
 * threshold) is delivery management: admin | project_manager. GUI-side twin of the
 * `delivery:capacity` capability the server action enforces. Mirrors
 * `canManageProjects` (same gate as the workload view itself); not comp data.
 */
export function canManageCapacity(roles: readonly AppRole[] | undefined): boolean {
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
 * The unified timesheet administration surface (ADR-0082, #539) — the single
 * all-users lifecycle table that absorbs the correctness (#465) and payroll (#466)
 * queues. Visible to anyone who can act on either gate (admin OR finance); the
 * individual row actions remain gated by `canApproveTimesheets` / `canApprovePayroll`.
 */
export function canAdministerTimesheets(roles: readonly AppRole[] | undefined): boolean {
  return canApproveTimesheets(roles) || canApprovePayroll(roles);
}

/**
 * The expense correctness-approval gate (ADR-0083) is admin-only — the GUI-side
 * twin of the `expense:approve` capability the server actions enforce. Mirrors
 * `canApproveTimesheets`. (Finance approval — finance∨admin — is a separate gate.)
 */
export function canApproveExpenses(roles: readonly AppRole[] | undefined): boolean {
  return isAdmin(roles);
}

/**
 * The expense finance-approval gate (ADR-0083) is the CFO gate — finance∨admin.
 * GUI-side twin of `expense:finance-approve`. Finance-approves an Approved report
 * (authorizes reimbursement; the app never pays) and confirms the QuickBooks match
 * to set Reimbursed; it never touches comp data. Mirrors `canApprovePayroll`.
 */
export function canFinanceApproveExpenses(roles: readonly AppRole[] | undefined): boolean {
  return isAdmin(roles) || hasRole(roles, "finance");
}

/**
 * The unified expense administration surface (ADR-0083, #548) — the single all-users
 * lifecycle table (mirrors the timesheet #539 surface). Visible to anyone who can act
 * on either gate (admin OR finance); individual row actions stay gated by
 * `canApproveExpenses` / `canFinanceApproveExpenses`.
 */
export function canAdministerExpenses(roles: readonly AppRole[] | undefined): boolean {
  return canApproveExpenses(roles) || canFinanceApproveExpenses(roles);
}

/**
 * The expense category-mapping console (ADR-0083, #489) is admin one-time/maintenance
 * setup — admin-only. GUI-side twin of the `expense:category-map` capability the server
 * action enforces. Maps the read-only synced QuickBooks chart of accounts onto clean
 * website-facing categories (caps / billable default / Autotask id / visibility); the app
 * never writes QuickBooks. Mirrors `canManageEmployeeMappings`.
 */
export function canManageExpenseCategories(roles: readonly AppRole[] | undefined): boolean {
  return isAdmin(roles);
}

/**
 * The mileage-rate admin (ADR-0083, #490) is COMP-GATED exactly like Pay Rate — the
 * effective-dated system mileage rate is comp data (the backend derives each employee's
 * mileage $ from it), so it is restricted to finance∨admin and NEVER shown to
 * employee/agent/client roles. GUI-side twin of the `expense:mileage-rate` capability the
 * server action enforces. Mirrors `canApprovePayroll` / `canFinanceApproveExpenses`.
 */
export function canManageMileageRate(roles: readonly AppRole[] | undefined): boolean {
  return isAdmin(roles) || hasRole(roles, "finance");
}

/**
 * The collections / AR-dunning surface (ADR-0085/0087, #677) is the finance gate —
 * finance∨admin. This is the GUI-side READ twin (`collections:read`) of the
 * `collections:write` capability the server action enforces (ADR-0045): both the
 * read of the dunning overlay and the worklist view (#678) are AR/finance work, so
 * they ride the same finance gate as `contracts:write`. App-native overlay on the
 * read-only invoice mirror — nothing here moves money or writes QuickBooks.
 */
export function canSeeCollections(roles: readonly AppRole[] | undefined): boolean {
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

/* ──────────────────────────────────────────────────────────────────────────
 * GROUP-LEVEL nav guards (#794, ADR-0030). The new IA (`src/lib/nav.ts`) renders
 * collapsible groups; a role that lacks a group's guard never sees the group OR
 * its children (hide-entirely). These are nav-visibility only — defense-in-depth;
 * each page still enforces its own server-side gate. Matrix per issue #794:
 *   Top + Employee → all roles · CMDB + Service → admin|support(Technician) ·
 *   Marketing + Sales → admin|sales · Projects → admin|project_manager ·
 *   Finance → admin|finance · Board + Settings → admin. Reports split below.
 * ────────────────────────────────────────────────────────────────────────── */

/** The Marketing group — admin | sales (mirrors `canManageCampaigns`). */
export function canSeeMarketing(roles: readonly AppRole[] | undefined): boolean {
  return isAdmin(roles) || hasRole(roles, "sales");
}

/** The Sales group — admin | sales (mirrors `canManageSales`). */
export function canSeeSales(roles: readonly AppRole[] | undefined): boolean {
  return isAdmin(roles) || hasRole(roles, "sales");
}

/** The Projects group — admin | project_manager (mirrors `canManageProjects`). */
export function canSeeProjects(roles: readonly AppRole[] | undefined): boolean {
  return isAdmin(roles) || hasRole(roles, "project_manager");
}

/** The Service group — admin | support(Technician). Mirrors `canSeeCmdb`. */
export function canSeeService(roles: readonly AppRole[] | undefined): boolean {
  return isAdmin(roles) || hasRole(roles, "support");
}

/** The Finance group — admin | finance (mirrors `canSeeCollections`). */
export function canSeeFinance(roles: readonly AppRole[] | undefined): boolean {
  return isAdmin(roles) || hasRole(roles, "finance");
}

/** Per-domain Reports leaves (#794): each report rides its domain's group gate. */
export function canSeeMarketingReport(roles: readonly AppRole[] | undefined): boolean {
  return canSeeMarketing(roles);
}
export function canSeeSalesReport(roles: readonly AppRole[] | undefined): boolean {
  return canSeeSales(roles);
}
export function canSeeProjectReport(roles: readonly AppRole[] | undefined): boolean {
  return canSeeProjects(roles);
}
export function canSeeServiceReport(roles: readonly AppRole[] | undefined): boolean {
  return canSeeService(roles);
}
export function canSeeFinanceReport(roles: readonly AppRole[] | undefined): boolean {
  return canSeeFinance(roles);
}

/** Per-nav-key capability guards. Keys absent here are visible to everyone. */
const NAV_GUARD: Partial<Record<string, (roles: readonly AppRole[] | undefined) => boolean>> = {
  settings: canSeeSettings,
  security: canSeeSettings,
  agents: canSeeAgentPages,
  // The AI-Technician operator cockpit (#1056) — same admin gate as the AI agent
  // pages it lives beside (operating the agent layer, ADR-0050).
  "operator-technician": canSeeAgentPages,
  // The native cross-agent approval cockpit (#1014) — same admin gate (operating the
  // agent layer, ADR-0050); the controls additionally require `agents:operate`.
  "operator-cockpit": canSeeAgentPages,
  board: canSeeAgentPages,
  cmdb: canSeeCmdb,
  // Change Enablement (ADR-0079, #656) — the ITIL Service practice; admin∨support, the
  // same gate as the Service group it lives in (and the CMDB it draws affected CIs from).
  changes: canSeeService,
  "time-admin": canAdministerTimesheets,
  "time-mappings": canManageEmployeeMappings,
  "expense-admin": canAdministerExpenses,
  "expense-categories": canManageExpenseCategories,
  "expense-mileage-rate": canManageMileageRate,
  capacity: canManageCapacity,
  // The unified Monthly Close (ADR-0083 #491) is the finance gate — finance∨admin,
  // same as the payroll/finance-approve surfaces (`canApprovePayroll`).
  "monthly-close": canApprovePayroll,
  // The collections / AR-dunning worklist (#678) is the finance gate — finance∨admin
  // (`collections:read`). The UI lands in a follow-up; the nav guard is wired now.
  collections: canSeeCollections,

  // ── Collapsible GROUP headers (#794). A group hides entirely (header + all
  // children) when the role lacks its guard. Employee has no entry → all roles.
  "grp-marketing": canSeeMarketing,
  "grp-sales": canSeeSales,
  "grp-projects": canSeeProjects,
  "grp-service": canSeeService,
  "grp-finance": canSeeFinance,
  "grp-settings": canSeeSettings,
  // The Reports group header itself is unguarded; the sidebar hides the whole
  // group when none of its per-domain leaves (below) are visible for the role.
  "grp-reports": () => true,

  // ── Per-domain Reports leaves (#794) — each report rides its domain gate.
  "report-marketing": canSeeMarketingReport,
  "report-sales": canSeeSalesReport,
  "report-projects": canSeeProjectReport,
  "report-service": canSeeServiceReport,
  "report-finance": canSeeFinanceReport,
  // Expense analytics (#492) is comp-adjacent — rides the finance|admin gate
  // (same set as canSeeLaborCost, which the page enforces server-side).
  "report-expense": canSeeFinanceReport,

  // ── Settings group sub-pages (#794) — all admin-only, same as the group.
  "settings-assessment-types": canSeeSettings,
  "settings-client-mapping": canSeeSettings,
  "settings-client-mapping-unifi": canSeeSettings,
  "settings-connections": canSeeSettings,
  "settings-sla": canSeeSettings,
  consent: canSeeSettings,
  questions: canSeeSettings,
  workflows: canSeeSettings,
  "custom-fields": canSeeSettings,
  statuses: canSeeSettings,
};

/** Whether a nav item (by `key`) should be shown for the given roles. */
export function canSeeFeature(navKey: string, roles: readonly AppRole[] | undefined): boolean {
  const guard = NAV_GUARD[navKey];
  return guard ? guard(roles) : true;
}
