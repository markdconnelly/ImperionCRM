/**
 * data_class — the THIRD access axis (#1034, ADR-01XX, agentic-OS contract 2026-06-21).
 *
 * The MSP isolates by DATA SENSITIVITY, not by client tenant: employees and the agents acting
 * for them roam all clients freely; the gate is which sensitivity CLASS a row/action belongs to.
 * This module is the canonical TypeScript home of the taxonomy + the **action-plane ceiling**:
 *
 *   - READ enforcement is in the database (RLS policy + `app_data_class_allowed()`, migration
 *     0175) — the hard floor; this module does NOT re-implement reads.
 *   - ACTION enforcement (the ceiling on the governed action / tool-grant plane, ADR-0107 / #990)
 *     reuses the SAME rule: an action's `data_class` must be within the caller/agent's permitted
 *     classes. `actionWithinCeiling()` is the FE-side check the approval surface uses to label /
 *     gate a proposed action; the backend dispatch is the authoritative enforcer (it reads the
 *     same `data_class_role_grant` table the RLS predicate reads). One rule, two layers.
 *
 * The role→class mapping lives in `data_class_role_grant` (DB source of truth, 0175). The default
 * map below MIRRORS the migration's seed so the FE can label/gate without a round-trip when the
 * caller's permitted classes are already resolved; the DB remains authoritative.
 *
 * No PII, no secrets — class names + role slugs only.
 */

/** The 5 coarse, role-mapped sensitivity classes (migration 0163/0175 CHECK constraint). */
export const DATA_CLASSES = [
  "operational",
  "financial",
  "people_hr",
  "security_credentials",
  "client_pii",
] as const;

export type DataClass = (typeof DATA_CLASSES)[number];

/** Type guard — narrows an arbitrary string (e.g. an action's `dataClass`) to a known class. */
export function isDataClass(value: string): value is DataClass {
  return (DATA_CLASSES as readonly string[]).includes(value);
}

/**
 * The ALWAYS-GATE classes — the hard ceiling earned autonomy can NEVER auto-cross (#1036):
 * money (`financial`), credentials (`security_credentials`), customer-facing (`client_pii`).
 * Modeled here AND on `data_class.always_gate` (0175) so #1036 enforces it as data. An action of
 * an always-gate class always surfaces to a human regardless of any earned-autonomy track record.
 */
export const ALWAYS_GATE_CLASSES: ReadonlySet<DataClass> = new Set<DataClass>([
  "financial",
  "security_credentials",
  "client_pii",
]);

/** True when the class is always-gate (money / credentials / customer-facing). */
export function isAlwaysGate(value: string): boolean {
  return isDataClass(value) && ALWAYS_GATE_CLASSES.has(value);
}

/**
 * Default role→permitted-classes map — MIRRORS the `data_class_role_grant` seed in migration
 * 0175 (which mirrors ADR-0100's broad-employee-read posture). The DATABASE is authoritative;
 * this is the FE convenience copy for labelling/gating when the DB-resolved set isn't in hand.
 * Keep in lockstep with 0175 (two copies of one fact, the 0156 ↔ SEEDED_TOOL_GRANTS precedent).
 */
export const DEFAULT_ROLE_CLASS_GRANTS: Readonly<Record<string, readonly DataClass[]>> = {
  admin: ["operational", "client_pii", "financial", "people_hr", "security_credentials"],
  finance: ["operational", "client_pii", "financial"],
  hr: ["operational", "client_pii", "people_hr"],
  security: ["operational", "client_pii", "security_credentials"],
  project_manager: ["operational", "client_pii"],
  sales: ["operational", "client_pii"],
  support: ["operational", "client_pii"],
};

/**
 * Resolve the set of classes a caller may reach from their role slugs (the `app.groups`
 * vocabulary, ADR-0105). Union over the caller's roles via {@link DEFAULT_ROLE_CLASS_GRANTS}.
 * Fail-closed: no roles → empty set → no class permitted (mirrors the SQL predicate's NULL → no
 * rows). Pass an explicit `grantMap` (e.g. one loaded from `data_class_role_grant`) to use the
 * live mapping instead of the default copy.
 */
export function permittedClassesForRoles(
  roles: readonly string[],
  grantMap: Readonly<Record<string, readonly DataClass[]>> = DEFAULT_ROLE_CLASS_GRANTS,
): Set<DataClass> {
  const allowed = new Set<DataClass>();
  for (const role of roles) {
    for (const cls of grantMap[role] ?? []) allowed.add(cls);
  }
  return allowed;
}

/**
 * The ACTION-PLANE CEILING (#1034 / ADR-0107): is an action of class `actionClass` within the
 * caller's permitted classes? This is the FE mirror of the SQL `app_data_class_allowed()` the
 * backend dispatch enforces — used to label/gate a proposed action in the approval surface.
 * Fail-closed: an unknown class is never within the ceiling.
 */
export function actionWithinCeiling(
  actionClass: string,
  permitted: ReadonlySet<DataClass>,
): boolean {
  return isDataClass(actionClass) && permitted.has(actionClass);
}
