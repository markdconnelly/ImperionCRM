/**
 * Write-capability authorization matrix (ADR-0045).
 *
 * ADR-0030 gave us *roles* and gated the GUI (nav visibility, Settings/Security
 * routes, server-side revenue redaction). It did NOT gate the mutating server
 * actions — every authenticated user could create/update/delete any object. This
 * module closes that gap with a small, explicit capability matrix the server
 * actions enforce via `lib/auth/guard.ts`.
 *
 * Model = role-scoped writes (Mark's call, 2026-06-09): reads stay broadly
 * available (rendering is fine; revenue stays redacted per ADR-0030), but each
 * write capability is granted only to the roles that own that part of the system.
 * `admin` holds every capability implicitly.
 *
 * PURE / edge-safe: imports only `roles.ts` (no pg, no node:*, no env) so it can
 * be unit-tested directly and imported anywhere.
 */
import type { AppRole } from "@/lib/auth/roles";

/** A write capability — the unit of authorization a server action requires. */
export const CAPABILITIES = [
  "crm:write", // accounts + contacts core records
  "sales:write", // opportunities, proposals, discovery, assessments, campaigns, leads, workflows
  "delivery:write", // projects, onboarding, tasks, business reviews (SBR)
  "contracts:write", // contract / billing records (finance)
  "tickets:write", // ticket + meeting-action-item handling (Support's allowed write)
  "comms:write", // outbound sends + consent ledger
  "catalog:write", // discovery/assessment question + template configuration
  "settings:write", // connections, company credentials, GDAP, poll cadence
  "agents:operate", // convene the AI board / operate the agent layer (ADR-0050: admin-only, spends model budget)
  "time:write", // own weekly timesheet — enter/attest time (ADR-0082; every employee, own row only)
  "time:approve", // admin correctness approval of a submitted timesheet (ADR-0082; admin-only)
  "time:map", // admin confirm of an employee's Autotask Resource / QuickBooks vendor mapping (ADR-0082; admin-only)
  "time:payroll-approve", // CFO payroll approval + confirm the QuickBooks-matched Paid state (ADR-0082; finance∨admin)
] as const;

export type Capability = (typeof CAPABILITIES)[number];

/**
 * Capability → roles that hold it (besides `admin`, which holds all). Keep this
 * the single source of truth; the guard and the test suite both read it.
 */
export const CAPABILITY_ROLES: Record<Capability, readonly AppRole[]> = {
  "crm:write": ["sales", "project_manager"],
  "sales:write": ["sales"],
  "delivery:write": ["project_manager"],
  "contracts:write": ["finance"],
  "tickets:write": ["support", "sales", "project_manager"],
  "comms:write": ["sales", "support"],
  "catalog:write": [],
  "settings:write": [],
  "agents:operate": [],
  // Every employee tracks their OWN time (ADR-0082). The capability is open to all
  // roles; the server action additionally scopes every write to the signed-in
  // employee's own timesheet, so this grants self-service, not cross-employee edit.
  "time:write": ["finance", "project_manager", "sales", "support"],
  // The admin correctness gate before payroll (ADR-0082) — admin-only (admin holds
  // all caps implicitly, so the explicit list is empty). NOT the payroll approval
  // (finance∨admin), which is a separate gate on the #466 surface.
  "time:approve": [],
  // Employee mapping confirm — admin one-time setup (ADR-0082, #468). Admin-only.
  "time:map": [],
  // The payroll-approval gate (CFO, ADR-0082) — finance∨admin. Payroll-approves an
  // Approved sheet (authorizes manual payment; the app never pays) and confirms the
  // backend-suggested QuickBooks match to set Paid. The comp math stays in the backend.
  "time:payroll-approve": ["finance"],
};

/** Whether the given roles may exercise a capability. `admin` always may. */
export function can(
  roles: readonly AppRole[] | undefined,
  capability: Capability,
): boolean {
  if (!roles || roles.length === 0) return false;
  if (roles.includes("admin")) return true;
  const allowed = CAPABILITY_ROLES[capability];
  return roles.some((r) => allowed.includes(r));
}
