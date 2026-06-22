/**
 * Dispatch-time resolution for the 1–5 actuation autonomy dial (#996 / 2E, ADR-0107 D4/D5,
 * ADR-0109). The connective tissue that ties the action-contract catalog (#994) and the
 * persisted dial (`agent_action_autonomy`, migration 0158) to a single ROUTING DECISION:
 *
 *   proposed action (kind) ──catalog──▶ ADR-0055 tier
 *   acting agent + action class ──dial set──▶ most-specific level → tier ceiling
 *   tier vs ceiling ──▶ execute | execute_notify | cockpit   (+ the record for the ledger)
 *
 * At dispatch the backend (BE #250) is the AUTHORITATIVE dispatcher — it owns the runtime,
 * re-asserts consent at execute (ADR-0058), and writes the run ledger. This module is the
 * FRONT-END half of the contract: the pure, dependency-free resolution the backend mirrors
 * (repos don't share code; keep the two in lockstep, exactly like {@link ./action-autonomy}
 * and {@link ./action-catalog}). The web app uses it to PREVIEW the routing decision on the
 * operator surfaces (what would a given level do to this action?) and to shape the record
 * the surfaces render.
 *
 * PURE: no `pg`, no `node:*`, no env. Safe to import anywhere (edge / server / client) and
 * unit-test directly. FAIL-CLOSED everywhere: an unknown agent/class falls to the global
 * default dial (and ultimately level 1 / Manual); an uncatalogued action kind is treated as
 * the most-restrictive tier (T3) so "we don't know this action" never means "let it run".
 */

import {
  coerceLevel,
  resolveTierCeiling,
  routeAction,
  type AutonomyLevel,
  type AutonomyTier,
} from "@/lib/agent/action-autonomy";
import { getActionDef } from "@/lib/agent/action-catalog";

/** The wildcard key used by the global / agent-default dial rows. */
const WILDCARD = "*";

/**
 * The most-restrictive ADR-0055 tier — the fail-closed default for an action kind that is
 * NOT in the front-end catalog. The backend is the authoritative dispatcher and may know an
 * action the front end hasn't cataloged (the #994 passthrough property); routing it as T3
 * means the preview/record errs toward "route to the cockpit", never toward silent execute.
 */
const UNKNOWN_ACTION_TIER: AutonomyTier = "T3";

/** A persisted dial row, reduced to what dispatch resolution needs. */
export interface DialLike {
  agentKey: string;
  actionClass: string;
  level: AutonomyLevel;
  /** Optional per-row override of the level→ceiling boundaries (`{}` = built-in defaults). */
  ceilings?: Record<string, string> | null;
}

/** The routing outcome for a proposed action under the resolved dial. */
export type RouteDecision = "execute" | "execute_notify" | "cockpit";

/**
 * The full dispatch resolution for one proposed action — everything the backend records on
 * the run ledger (`agent_run.resolved_level` / `resolved_ceiling` / `route_decision`) and
 * the cockpit shows on a parked item.
 */
export interface DispatchResolution {
  /** The acting agent the dial was resolved for. */
  agentKey: string;
  /** The action class (catalog kind) that was dispatched. */
  actionClass: string;
  /** The ADR-0055 tier of the action (from the catalog; T3 fail-closed if uncatalogued). */
  tier: AutonomyTier;
  /** Whether the action kind was found in the front-end catalog (false ⇒ fail-closed tier). */
  cataloged: boolean;
  /** The resolved 1–5 autonomy level that applied (from the most-specific dial row). */
  resolvedLevel: AutonomyLevel;
  /** The ADR-0055 tier ceiling that level resolved to. */
  resolvedCeiling: AutonomyTier;
  /** The dial row that won most-specific resolution (`null` ⇒ no dial set ⇒ fail-closed L1). */
  matchedDial: DialLike | null;
  /** The routing decision: execute inline / execute + notify (L4) / route to the cockpit. */
  decision: RouteDecision;
  /** True when the action routes to the approval cockpit rather than executing inline. */
  routesToCockpit: boolean;
}

/**
 * Pick the most-specific dial row for an `(agentKey, actionClass)` from a set, fail-closed.
 *
 * Precedence (most specific first), mirroring the backend's SELECT order:
 *   1. exact agentKey + exact actionClass
 *   2. exact agentKey + `*` (the agent default)
 *   3. `*`            + exact actionClass (a global per-class rule)
 *   4. `*`            + `*` (the global default)
 *
 * Returns `null` when nothing matches — the caller then treats it as level 1 (Manual), the
 * fail-closed floor.
 */
export function pickDial(
  dials: readonly DialLike[],
  agentKey: string,
  actionClass: string,
): DialLike | null {
  const exact = (a: string, c: string) =>
    dials.find((d) => d.agentKey === a && d.actionClass === c) ?? null;
  return (
    exact(agentKey, actionClass) ??
    exact(agentKey, WILDCARD) ??
    exact(WILDCARD, actionClass) ??
    exact(WILDCARD, WILDCARD) ??
    null
  );
}

/**
 * Resolve the dispatch decision for a proposed action of `actionKind`, proposed by
 * `agentKey`, against the persisted `dials`. PURE — the single FE expression of ADR-0107
 * D4/D5 the backend dispatcher (BE #250) mirrors:
 *
 *   - The action's tier comes from the catalog (#994); an uncatalogued kind is T3 (fail-closed).
 *   - The level comes from the most-specific dial row ({@link pickDial}); no row ⇒ level 1.
 *   - {@link routeAction} maps tier-vs-ceiling to execute / execute_notify / cockpit.
 *
 * The returned {@link DispatchResolution} is exactly the record the backend writes to the run
 * ledger and the cockpit renders — level, ceiling, and the routing decision.
 */
export function resolveDispatch(
  actionKind: string,
  agentKey: string,
  dials: readonly DialLike[],
): DispatchResolution {
  const def = getActionDef(actionKind);
  const cataloged = def !== undefined;
  const tier: AutonomyTier = def?.tier ?? UNKNOWN_ACTION_TIER;

  const matchedDial = pickDial(dials, agentKey, actionKind);
  const resolvedLevel = coerceLevel(matchedDial?.level);
  const ceilings = matchedDial?.ceilings ?? null;
  const resolvedCeiling = resolveTierCeiling(resolvedLevel, ceilings);

  const decision = routeAction(tier, resolvedLevel, ceilings);

  return {
    agentKey,
    actionClass: actionKind,
    tier,
    cataloged,
    resolvedLevel,
    resolvedCeiling,
    matchedDial,
    decision,
    routesToCockpit: decision === "cockpit",
  };
}
