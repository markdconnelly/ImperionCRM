/**
 * Pure helpers for the data-driven autonomy dial (ADR-0087, migration 0123, #721).
 *
 * ADR-0087 makes "autonomy is one dial, stored as data" load-bearing: an
 * orchestration agent reads its rung from `agent_autopilot_policy` rather than
 * hardcoding it (e.g. BE #156's collections agent, today pinning `L1`). These
 * helpers are the shared, side-effect-free logic for turning a (possibly absent)
 * policy row into an actual rung — used by the data-layer read accessor and by any
 * future management surface or backend dial-reader.
 *
 * PURE: no `pg`, no `node:*`, no env. Safe to import anywhere (edge/server/client)
 * and unit-test directly. The fail-closed rule: when the dial has no opinion, an
 * agent stays at the most-conservative posture — gating is data, so "no data" must
 * never silently mean "more autonomy".
 */
import {
  AUTONOMY_RUNGS,
  AGENT_PLANES,
  DEFAULT_AUTONOMY_RUNG,
  type AgentAutopilotPolicy,
  type AgentPlane,
  type AutonomyRung,
} from "@/types";

const RUNG_SET = new Set<string>(AUTONOMY_RUNGS);
const PLANE_SET = new Set<string>(AGENT_PLANES);

/** Numeric authority of each rung, for ordering / ceiling comparisons. */
const RUNG_ORDER: Record<AutonomyRung, number> = { L0: 0, L1: 1, L2: 2, L3: 3 };

/** Type guard — fail closed on anything not in the rung vocabulary. */
export function isAutonomyRung(value: unknown): value is AutonomyRung {
  return typeof value === "string" && RUNG_SET.has(value);
}

/** Type guard — fail closed on anything not a known plane. */
export function isAgentPlane(value: unknown): value is AgentPlane {
  return typeof value === "string" && PLANE_SET.has(value);
}

/**
 * Resolve the effective rung from a dial lookup result. A null policy (the dial has
 * no row for this agent/plane yet) resolves to {@link DEFAULT_AUTONOMY_RUNG} — the
 * safe draft posture. A present policy yields its stored rung (validated; an
 * unrecognized value also falls back to the default, fail-closed).
 */
export function resolveRung(policy: AgentAutopilotPolicy | null | undefined): AutonomyRung {
  if (!policy) return DEFAULT_AUTONOMY_RUNG;
  return isAutonomyRung(policy.rung) ? policy.rung : DEFAULT_AUTONOMY_RUNG;
}

/** Compare two rungs: <0 if a is lower authority than b, 0 if equal, >0 if higher. */
export function compareRungs(a: AutonomyRung, b: AutonomyRung): number {
  return RUNG_ORDER[a] - RUNG_ORDER[b];
}

/**
 * Whether an agent at `rung` is allowed to take an action that requires at least
 * `required`. Used by an executor to gate an act-leg: e.g. an idempotent write
 * requires `L2`, so an `L1` agent must draft-and-hold instead. Inclusive (an agent
 * at exactly the required rung may act).
 */
export function rungAllows(rung: AutonomyRung, required: AutonomyRung): boolean {
  return compareRungs(rung, required) >= 0;
}

/**
 * Whether an action must funnel to the single human queue (the 🔒 Mark-gate). True
 * when the policy's `mark_gated` flag is set, REGARDLESS of rung — an L3 (auto)
 * agent with the flag is autonomous except for customer-facing / money /
 * prod-migration / deploy / X.0.0 legs (ADR-0087 security impact). A null policy
 * fails closed to gated (no opinion ⇒ require a human).
 */
export function isMarkGated(policy: AgentAutopilotPolicy | null | undefined): boolean {
  return policy ? policy.markGated : true;
}
