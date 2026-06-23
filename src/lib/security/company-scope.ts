/**
 * Company / role axis — the company half of two-axis RLS (#979, ADR-0105 §3a).
 *
 * A company-tier surface can be gated to a set of app-role slugs: a caller may reach it
 * only when their roles (the `app.groups` vocabulary — normalized app-role slugs, ADR-0105)
 * intersect that allowed set. This is the canonical TypeScript home of that rule.
 *
 *   - READ enforcement is in the database (RLS policy + `app_role_in_scope()`, migration
 *     0186) — the hard floor; this module does NOT re-implement reads.
 *   - The FE check `rolesInScope()` mirrors the SQL predicate so a surface can label/gate
 *     access (e.g. hide a nav entry, badge a card) WITHOUT a round-trip when the caller's
 *     roles are already resolved. The DB remains authoritative.
 *
 * The shape is a WHOLE-TABLE role gate, NOT a per-row `required_role` column (ADR-0105 §3a):
 * per ADR-0100 (broad employee read is the v1 posture) the company axis is deliberately
 * narrow — applied only to genuinely sensitive comp/finance-shaped surfaces. A per-row
 * required_role / account-visibility model is the v2 concept ADR-0100 deferred.
 *
 * No PII, no secrets — role slugs only.
 */

/**
 * The app-role slugs the company axis gates on — the `app.groups` vocabulary (ADR-0105 §3a;
 * the same slugs `data_class_role_grant` is keyed on, 0175). Exported for type-safe gate
 * definitions; the DB does not constrain the set, so an unknown slug simply never matches.
 */
export const COMPANY_ROLE_SLUGS = [
  "admin",
  "finance",
  "project_manager",
  "sales",
  "support",
  "hr",
  "security",
] as const;

export type CompanyRoleSlug = (typeof COMPANY_ROLE_SLUGS)[number];

/**
 * The allowed-role set for the first company-gated surface — `company_scoped_record`
 * (migration 0186). MIRRORS the policy's `ARRAY['finance','admin']`; keep in lockstep with
 * the migration (two copies of one fact, the 0156 ↔ SEEDED_TOOL_GRANTS precedent).
 */
export const COMPANY_SCOPED_RECORD_ROLES: readonly CompanyRoleSlug[] = ["finance", "admin"];

/**
 * Does the caller's role set put them in scope for a whole-table gate? The FE mirror of the
 * SQL `app_role_in_scope(allowed_roles)`: TRUE when the caller's roles intersect the allowed
 * set. Fail-closed: empty roles → never in scope (mirrors the SQL predicate's `'{}' && …`
 * → FALSE → no rows).
 */
export function rolesInScope(
  callerRoles: readonly string[],
  allowedRoles: readonly string[],
): boolean {
  const allowed = new Set(allowedRoles);
  return callerRoles.some((r) => allowed.has(r));
}
