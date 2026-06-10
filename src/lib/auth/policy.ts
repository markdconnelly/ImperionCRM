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
