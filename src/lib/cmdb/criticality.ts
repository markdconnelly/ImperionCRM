/**
 * CMDB CI criticality / business-impact helpers (#648, epic #372, ADR-0078;
 * CMDB authority ADR authored in parallel under #646 / PR #812).
 *
 * Pure module (no `pg`, no env, no `node:*`) so the DERIVED-DEFAULT rule and the
 * EFFECTIVE-criticality resolution are unit-testable without a database. The
 * persistence + SQL live in the postgres repository (the `cmdb_ci_overlay` table,
 * migration 0132); the same derived rule is encoded BOTH here (for the in-code
 * read path + tests) AND in the migration's re-runnable seed, so the two never
 * diverge.
 *
 * WHY A SEPARATE OVERLAY TABLE. A CI is a polymorphic `(ci_type, ci_id)` pair over
 * the READ-ONLY `cmdb_ci` union (#645) — there is no `cmdb_ci` row to hang a column
 * off. #647 added `ci_relationship` (the EDGE overlay). This is the per-CI ATTRIBUTE
 * overlay (one row per CI): the twin archetype — an app-owned sidecar keyed by the
 * CI business key. They are separate concerns (edges vs attributes) so they stay
 * separate tables; this one is `cmdb_ci_overlay`.
 *
 * THE DERIVED-DEFAULT RULE (v1). Computed from the silver attributes a CI already
 * carries — NO new ingest, NO new silver column:
 *   - account → `account.relationship` (customer|partner|prospect) × `lifecycle_stage`.
 *       A live managed customer is the business; a prospect is not yet.
 *   - device  → `device.device_type` (server|network → infrastructure; workstation|
 *       mobile → endpoint). A shared server outranks a single workstation.
 *   - user    → a flat baseline (silver carries no seniority/role signal today;
 *       an admin override is the escape hatch until such a signal lands).
 * The effective criticality an impact analysis (#650) weights against is
 * `override ?? derived_default` — a manual override always wins and SURVIVES any
 * re-derivation of defaults (the same survival pattern #647 used for manual edges:
 * re-derivation only ever rewrites the derived column, never the override).
 */

import type { CiType, Criticality } from "@/types";

export type { Criticality };

/**
 * The criticality / business-impact scale (highest → lowest). Ordered so callers
 * (badges, impact weighting) can compare by index. `critical` is reserved for the
 * admin override — the derived rule never auto-assigns it (a machine shouldn't
 * silently declare a CI business-critical; a human asserts that). Kept in lock-step
 * with the `Criticality` union + the `ci_criticality` DB enum (migration 0132).
 */
export const CRITICALITY_LEVELS = ["critical", "high", "medium", "low"] as const satisfies readonly Criticality[];

/** Numeric weight per level (higher = more critical) — the impact-analysis (#650) input. */
export const CRITICALITY_WEIGHT: Record<Criticality, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/** Human label per level (badge text). */
export const CRITICALITY_LABEL: Record<Criticality, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

/** Design-token class hints per level (badge tint) — maps to globals.css tokens. */
export const CRITICALITY_TONE: Record<Criticality, "red" | "amber" | "accent" | "dim"> = {
  critical: "red",
  high: "amber",
  medium: "accent",
  low: "dim",
};

/** Narrow an arbitrary string to a known criticality level (form/route guard). */
export function asCriticality(value: string | null | undefined): Criticality | null {
  return value && (CRITICALITY_LEVELS as readonly string[]).includes(value)
    ? (value as Criticality)
    : null;
}

/**
 * The minimal silver attributes the derived rule reads, per CI type. All optional —
 * an unknown/absent signal falls through to the conservative baseline. (Mirrors the
 * columns the migration's seed and the postgres read path project.)
 */
export interface CiCriticalityInputs {
  /** account CI — `account.relationship` (prospect|customer|partner) */
  accountRelationship?: string | null;
  /** account CI — `account.lifecycle_stage` */
  accountLifecycleStage?: string | null;
  /** device CI — `device.device_type` (workstation|server|network|mobile|…) */
  deviceType?: string | null;
  /** cloud CI — `cloud_asset.category` (compute|storage|network|database|identity|…) */
  cloudCategory?: string | null;
}

/**
 * Compute the DERIVED-DEFAULT criticality for a CI from its silver attributes.
 * Deterministic and side-effect-free; the migration encodes the IDENTICAL rule in
 * SQL so the DB seed and the in-code path agree. Never returns `critical` — that
 * level is reserved for an explicit admin override.
 */
export function deriveCriticality(ciType: CiType, inputs: CiCriticalityInputs): Criticality {
  switch (ciType) {
    case "account":
      return deriveAccountCriticality(inputs);
    case "device":
      return deriveDeviceCriticality(inputs);
    case "cloud":
      return deriveCloudCriticality(inputs);
    case "user":
      // No seniority/role signal in silver `contact` today — a flat baseline; an
      // admin override is the escape hatch until such a signal is added (a future
      // front-end schema change, ADR-0042).
      return "medium";
    case "software":
      // A software install is a SUPPORTING asset — silver `software_ci` carries no
      // business-impact signal (criticality lives with what the software RUNS ON, the
      // device CI). A flat `low` baseline; an admin override (cmdb:write) promotes a
      // business-critical app. Matches the migration 0204 seed and never auto-`critical`.
      return "low";
  }
}

/**
 * account → relationship × lifecycle. A live managed customer is the running
 * business (high); a partner or a customer still in onboarding/implementation is
 * mid (medium); a prospect or dormant account is low.
 */
function deriveAccountCriticality(inputs: CiCriticalityInputs): Criticality {
  const rel = (inputs.accountRelationship ?? "").toLowerCase();
  const stage = (inputs.accountLifecycleStage ?? "").toLowerCase();
  if (rel === "customer") {
    return stage === "managed_active" ? "high" : "medium";
  }
  if (rel === "partner") return "medium";
  // prospect / unknown → low.
  return "low";
}

/**
 * device → device_type. Shared infrastructure (server, network) is high; a single
 * endpoint (workstation, mobile) is medium; an unknown/untyped device is low.
 */
function deriveDeviceCriticality(inputs: CiCriticalityInputs): Criticality {
  const t = (inputs.deviceType ?? "").toLowerCase();
  if (t === "server" || t === "network") return "high";
  if (t === "workstation" || t === "mobile" || t === "laptop" || t === "desktop") {
    return "medium";
  }
  return "low";
}

/**
 * cloud → category. Data and identity planes carry the most business risk
 * (`database`, `identity`, `security` → high); the run/connectivity plane is mid
 * (`compute`, `network` → medium); supporting/peripheral resources are low. As with
 * the other arms, `critical` is never auto-derived (admin override only).
 */
function deriveCloudCriticality(inputs: CiCriticalityInputs): Criticality {
  const c = (inputs.cloudCategory ?? "").toLowerCase();
  if (c === "database" || c === "identity" || c === "security") return "high";
  if (c === "compute" || c === "network") return "medium";
  return "low";
}

/**
 * The EFFECTIVE criticality the register, the detail badge, and impact analysis
 * (#650) all use: a manual `override` always wins; otherwise the `derivedDefault`.
 * This is the single resolution point — keep every consumer routing through it so
 * the override-wins contract is enforced in exactly one place.
 */
export function effectiveCriticality(
  derivedDefault: Criticality,
  override: Criticality | null,
): Criticality {
  return override ?? derivedDefault;
}
