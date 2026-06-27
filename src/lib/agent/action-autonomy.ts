/**
 * Pure helpers for the 1–5 actuation autonomy dial (ADR-0107 D4, ADR-0109, migration
 * 0158). The dial level resolves to an ADR-0055 tier ceiling; at dispatch an action whose
 * tier exceeds the ceiling routes to the approval cockpit, at/below it executes inline.
 *
 * PURE: no `pg`, no `node:*`, no env — safe to import anywhere (edge/server/client) and
 * unit-test directly. The backend keeps its own copy of this logic (repos don't share
 * code); keep the two in lockstep. Fail-closed: an unknown level resolves to level 1
 * (Manual) — "no opinion" must never mean "more autonomy".
 */

/** ADR-0055 autonomy tiers, lowest authority first. */
export type AutonomyTier = "T0" | "T1" | "T2" | "T3";
/** Tier authority order (T0 lowest → T3 highest). Exported for earned-autonomy tier math (#1036). */
export const TIER_ORDER: Record<AutonomyTier, number> = { T0: 0, T1: 1, T2: 2, T3: 3 };
const TIER_SET = new Set<string>(["T0", "T1", "T2", "T3"]);

/** The dial's levels (ADR-0107 D4). */
export type AutonomyLevel = 1 | 2 | 3 | 4 | 5;
export const ACTION_AUTONOMY_LEVELS: readonly AutonomyLevel[] = [1, 2, 3, 4, 5] as const;
export const DEFAULT_AUTONOMY_LEVEL: AutonomyLevel = 1; // fail-closed (Manual)

/**
 * Default level → tier-ceiling map (ADR-0107 D4). Levels 1 & 5 are fixed by definition;
 * 2–4 are the tunable middle (overridable per row via `ceilings`).
 */
const DEFAULT_CEILINGS: Record<AutonomyLevel, AutonomyTier> = {
  1: "T0", // Manual — only T0 reads run unattended; every T1+ approved
  2: "T1", // Assisted — auto T1; approve T2/T3
  3: "T2", // Supervised — auto ≤T2; approve T3
  4: "T3", // Autonomous-with-oversight — auto all + notify + undo window
  5: "T3", // Fully autonomous — auto all, silent
};

/** Operator-facing metadata for each level (the slider labels). */
export const LEVEL_META: Record<
  AutonomyLevel,
  { name: string; blurb: string }
> = {
  1: { name: "Manual", blurb: "Approve every action. Only reads run unattended." },
  2: { name: "Assisted", blurb: "Auto internal/undoable writes; approve client-visible + high-risk." },
  3: { name: "Supervised", blurb: "Auto routine client-visible; approve irreversible/financial." },
  4: { name: "Autonomous (oversight)", blurb: "Auto all tiers, with notify + an undo window." },
  5: { name: "Fully autonomous", blurb: "Execute silently; audit only." },
};

/** Type guard — fail closed on anything outside 1–5. */
export function isAutonomyLevel(value: unknown): value is AutonomyLevel {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

/** Coerce an arbitrary value to a valid level, fail-closed to {@link DEFAULT_AUTONOMY_LEVEL}. */
export function coerceLevel(value: unknown): AutonomyLevel {
  const n = typeof value === "string" ? Number(value) : value;
  return isAutonomyLevel(n) ? n : DEFAULT_AUTONOMY_LEVEL;
}

/**
 * Resolve a level (+ optional `ceilings` override jsonb, e.g. `{"3":"T2"}`) to a tier
 * ceiling. Levels 1 & 5 are fixed (T0 / T3) and ignore overrides; 2–4 take a valid
 * override else the default. Fail-closed on a bad level.
 */
export function resolveTierCeiling(
  level: unknown,
  ceilings?: Record<string, unknown> | null,
): AutonomyTier {
  const lvl = coerceLevel(level);
  if (lvl === 1) return "T0";
  if (lvl === 5) return "T3";
  const override = ceilings?.[String(lvl)];
  if (typeof override === "string" && TIER_SET.has(override)) return override as AutonomyTier;
  return DEFAULT_CEILINGS[lvl];
}

/** Whether `tier` is at or below `ceiling` (i.e. may execute inline rather than route). */
export function tierWithinCeiling(tier: AutonomyTier, ceiling: AutonomyTier): boolean {
  return TIER_ORDER[tier] <= TIER_ORDER[ceiling];
}

/**
 * The routing decision for an action at a level: `execute` (≤ ceiling), `execute_notify`
 * (level 4 — execute but notify + undo window), or `cockpit` (> ceiling — route to
 * approval). Pure mirror of ADR-0107 D4 used by the backend dispatcher + the UI preview.
 */
export function routeAction(
  tier: AutonomyTier,
  level: unknown,
  ceilings?: Record<string, unknown> | null,
): "execute" | "execute_notify" | "cockpit" {
  const lvl = coerceLevel(level);
  const ceiling = resolveTierCeiling(lvl, ceilings);
  if (!tierWithinCeiling(tier, ceiling)) return "cockpit";
  return lvl === 4 ? "execute_notify" : "execute";
}

// ─────────────────────────────────────────────────────────────────────────────
// The canonical L0–L5 autonomy LADDER (ADR-0128, extends ADR-0109).
//
// Distinct plane from the 1–5 actuation dial above: the dial value `1–5` selects
// the ladder rungs `L1–L5` (L0 is the implicit floor below the dial). Each rung is a
// universal CAPABILITY CLASS that means the same thing for EVERY agent (the drift the
// ADR closes). An ACTION declares the minimum rung at which it auto-executes
// (`auto_at_level`) plus a dial-proof `always_gate`; the gauntlet selects auto-vs-park
// deterministically (gate 7 actuation_level + gate 8 hard_ceiling). The backend keeps
// its own copy of this predicate (repos don't share code) — keep the two in lockstep.
// ─────────────────────────────────────────────────────────────────────────────

/** The canonical ladder's six rungs (ADR-0128 D1). L0 = observe; L5 = max-within-ceiling. */
export type LadderLevel = 0 | 1 | 2 | 3 | 4 | 5;
export const LADDER_LEVELS: readonly LadderLevel[] = [0, 1, 2, 3, 4, 5] as const;

/**
 * Per-rung capability semantics (ADR-0128 D1) — the legend the dial UI derives from.
 * Ordered by the reversibility / blast-radius of what each rung auto-executes (the G3
 * doctrine made concrete): observe → propose → internal-reversible → low-risk-external →
 * broadly-reversible-with-undo → everything-but-the-ceiling.
 */
export const LADDER_META: Record<LadderLevel, { name: string; blurb: string }> = {
  0: { name: "Observe", blurb: "Read, research, surface. No writes, no proposals." },
  1: { name: "Propose", blurb: "Drafts and proposals only — everything parks. Default-safe wedge posture." },
  2: { name: "Auto-internal", blurb: "Auto-executes internal, reversible writes. Customer-facing parks." },
  3: { name: "Auto-low-risk-external", blurb: "Auto-sends standard low-risk external touches, execute-then-notify." },
  4: { name: "Reversible-auto", blurb: "Broad auto-execution of reversible actions behind an undo window." },
  5: { name: "Max-within-ceiling", blurb: "Maximal autonomy — everything auto-executes except the hard ceiling." },
};

/** Type guard — fail closed on anything outside 0–5. */
export function isLadderLevel(value: unknown): value is LadderLevel {
  return (
    value === 0 || value === 1 || value === 2 || value === 3 || value === 4 || value === 5
  );
}

/**
 * The ADR-0128 D4 selection rule, as a pure predicate. An action auto-executes IFF
 * `dial ≥ auto_at_level AND NOT always_gate` (the gauntlet-passes term is the caller's —
 * this function answers only the dial/ceiling half). `always_gate` is dial-proof: a true
 * value parks at EVERY level, regardless of `auto_at_level` or the dial. Fail-closed: a
 * non-ladder `dial` or `auto_at_level` is treated as the most-restrictive (no auto).
 */
export function ladderAutoExecutes(
  dial: unknown,
  autoAtLevel: unknown,
  alwaysGate: boolean,
): boolean {
  if (alwaysGate) return false;
  if (!isLadderLevel(dial) || !isLadderLevel(autoAtLevel)) return false;
  return dial >= autoAtLevel;
}
