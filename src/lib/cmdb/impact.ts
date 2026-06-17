/**
 * CMDB impact-analysis read-model (#650, epic #372, ADR-0078; CMDB authority ADR-0097).
 *
 * Answers "what's affected?" for a CI: starting from one CI, traverse the
 * `ci_relationship` graph N hops to enumerate every reachable (dependent) CI, grouped
 * by type and weighted by criticality. This is a PURE module (no `pg`, no env, no
 * `node:*`) so the traversal — and its two hard requirements, CYCLE-SAFETY and a
 * BOUNDED DEPTH — are unit-testable without a database. The repository hands it the
 * full CI set (`listConfigurationItems`, #645) + the full edge set
 * (`listAllCiRelationships`, the n-hop input); this module does the graph walk.
 *
 * WHY A REUSABLE READ-MODEL. The same blast-radius computation feeds three surfaces:
 *   1. the impact panel on CI detail (this issue),
 *   2. #373 change-risk scoring (a change's risk ≈ its impact weight), and
 *   3. #320 incident-triage (an incident on a CI fans out to affected CIs).
 * So `analyzeImpact` returns a structured `CiImpact` (not pre-rendered markup) the two
 * later consumers can read directly.
 *
 * DIRECTION. A `ci_relationship` row is `from -[relation]-> to`. "What's affected if I
 * change/remove X" is a REACHABILITY question, and the curated vocabulary mixes
 * orientations (a device `belongs-to` an account; an account `depends-on` a service),
 * so the conservative blast radius treats the graph as UNDIRECTED by default — every
 * edge touching a CI can propagate impact. A caller that wants a strict directional
 * walk (e.g. only downstream dependents) passes `direction: "downstream" | "upstream"`.
 */

import type { CiType, Criticality, ConfigurationItem, CiRelationship } from "@/types";
import { CRITICALITY_WEIGHT, effectiveCriticality } from "@/lib/cmdb/criticality";
import { ciKey, CI_TYPES } from "@/lib/cmdb/ci";

/** A CI reference (cross-union key pair) — the traversal's node identity. */
export interface CiRef {
  ciType: CiType;
  ciId: string;
}

/** How far to walk and in which orientation. */
export interface ImpactOptions {
  /**
   * Maximum hop distance from the origin (>= 1). Bounded so a large/dense graph can
   * never run away; the traversal stops enqueuing once a node's distance would exceed
   * this. Clamped to [1, MAX_IMPACT_DEPTH].
   */
  maxDepth?: number;
  /**
   * Edge orientation to follow from each node:
   *  - "any" (default): undirected reachability — the conservative blast radius.
   *  - "downstream": follow edges forward (origin is `from`) — strict dependents.
   *  - "upstream": follow edges backward (origin is `to`) — strict dependencies.
   */
  direction?: "any" | "downstream" | "upstream";
}

/** The default + hard ceiling on traversal depth (configurable per call, but capped). */
export const DEFAULT_IMPACT_DEPTH = 3;
export const MAX_IMPACT_DEPTH = 10;

/** One affected CI, with the shortest hop distance at which it was reached. */
export interface AffectedCi {
  ci: ConfigurationItem;
  /** Shortest number of hops from the origin (1 = a direct neighbour). */
  hops: number;
  /** The CI's effective criticality (`override ?? derivedDefault`). */
  criticality: Criticality;
  /** That criticality's numeric weight (`CRITICALITY_WEIGHT`). */
  weight: number;
}

/** Affected CIs of one type, plus that group's rolled-up weight. */
export interface ImpactGroup {
  ciType: CiType;
  items: AffectedCi[];
  /** Sum of the group's criticality weights — the type-level blast contribution. */
  weight: number;
}

/** The full impact read-model for one origin CI. */
export interface CiImpact {
  origin: CiRef;
  /** The depth the walk actually used (after clamping). */
  depth: number;
  direction: NonNullable<ImpactOptions["direction"]>;
  /** Every reachable CI (excluding the origin), nearest-first then most-critical. */
  affected: AffectedCi[];
  /** The affected CIs partitioned by type (only non-empty groups), most-weighted first. */
  groups: ImpactGroup[];
  /** Total affected CI count (`affected.length`). */
  totalAffected: number;
  /** Criticality-weighted blast score = Σ weight over every affected CI. */
  totalWeight: number;
  /** The single highest effective criticality among the affected (null if none). */
  peakCriticality: Criticality | null;
}

/** Clamp an arbitrary requested depth into the supported, bounded range. */
export function clampDepth(requested: number | undefined): number {
  if (requested == null || Number.isNaN(requested)) return DEFAULT_IMPACT_DEPTH;
  const n = Math.floor(requested);
  if (n < 1) return 1;
  if (n > MAX_IMPACT_DEPTH) return MAX_IMPACT_DEPTH;
  return n;
}

/**
 * Build the traversal adjacency map keyed by `ciKey`. For each edge we record the
 * neighbour reachable from each endpoint, tagged with the orientation that edge
 * represents from that endpoint (`forward` = this endpoint is the `from`). The walk
 * then filters by the requested `direction`.
 */
type AdjEntry = { to: string; orientation: "forward" | "backward" };

function buildAdjacency(edges: CiRelationship[]): Map<string, AdjEntry[]> {
  const adj = new Map<string, AdjEntry[]>();
  const push = (key: string, entry: AdjEntry) => {
    const list = adj.get(key);
    if (list) list.push(entry);
    else adj.set(key, [entry]);
  };
  for (const e of edges) {
    const fromKey = ciKey({ ciType: e.fromCiType, ciId: e.fromCiId });
    const toKey = ciKey({ ciType: e.toCiType, ciId: e.toCiId });
    // Self-loops can't exist (DB CHECK), but guard anyway so they never inflate the walk.
    if (fromKey === toKey) continue;
    // From `from`, reaching `to` is a forward step; from `to`, reaching `from` is backward.
    push(fromKey, { to: toKey, orientation: "forward" });
    push(toKey, { to: fromKey, orientation: "backward" });
  }
  return adj;
}

/** Whether an adjacency step is allowed under the requested direction. */
function stepAllowed(
  orientation: AdjEntry["orientation"],
  direction: NonNullable<ImpactOptions["direction"]>,
): boolean {
  if (direction === "any") return true;
  if (direction === "downstream") return orientation === "forward";
  return orientation === "backward"; // upstream
}

/**
 * Compute the impact read-model for `origin`: a breadth-first walk over the edge graph,
 * bounded to `maxDepth` hops and CYCLE-SAFE via a visited-set keyed by `ciKey` (each CI
 * is recorded at its FIRST — i.e. shortest — distance and never re-enqueued, so cycles
 * and diamonds terminate). Unknown neighbours (an edge to a CI absent from `allItems`)
 * are skipped gracefully — they still gate the visited-set so the walk can't loop
 * through them, but they don't appear in the result.
 */
export function analyzeImpact(
  origin: CiRef,
  allItems: ConfigurationItem[],
  edges: CiRelationship[],
  options: ImpactOptions = {},
): CiImpact {
  const depth = clampDepth(options.maxDepth);
  const direction = options.direction ?? "any";
  const originKey = ciKey(origin);

  const adj = buildAdjacency(edges);
  const byKey = new Map<string, ConfigurationItem>();
  for (const c of allItems) byKey.set(ciKey(c), c);

  // BFS. `visited` is the cycle-safety set (origin pre-seeded so it's never re-counted).
  const visited = new Set<string>([originKey]);
  const affected: AffectedCi[] = [];
  let frontier: string[] = [originKey];

  for (let hop = 1; hop <= depth && frontier.length > 0; hop++) {
    const next: string[] = [];
    for (const key of frontier) {
      for (const entry of adj.get(key) ?? []) {
        if (visited.has(entry.to)) continue; // cycle-safe: first visit wins (shortest hop)
        if (!stepAllowed(entry.orientation, direction)) continue;
        visited.add(entry.to);
        next.push(entry.to); // gate the walk even if the CI is unknown
        const ci = byKey.get(entry.to);
        if (!ci) continue; // missing-edge endpoint → skip gracefully, don't surface it
        const criticality = effectiveCriticality(ci.derivedDefault, ci.override);
        affected.push({
          ci,
          hops: hop,
          criticality,
          weight: CRITICALITY_WEIGHT[criticality],
        });
      }
    }
    frontier = next;
  }

  // Nearest-first, then most-critical, then stable by display name.
  affected.sort(
    (a, b) =>
      a.hops - b.hops ||
      b.weight - a.weight ||
      a.ci.displayName.localeCompare(b.ci.displayName),
  );

  const groups = groupByType(affected);
  const totalWeight = affected.reduce((sum, a) => sum + a.weight, 0);
  const peakCriticality = affected.reduce<Criticality | null>(
    (peak, a) =>
      peak === null || a.weight > CRITICALITY_WEIGHT[peak] ? a.criticality : peak,
    null,
  );

  return {
    origin,
    depth,
    direction,
    affected,
    groups,
    totalAffected: affected.length,
    totalWeight,
    peakCriticality,
  };
}

/**
 * Partition the affected CIs by type into non-empty groups, each carrying its rolled-up
 * weight, ordered most-weighted-group first (then by the stable CI_TYPES order). Items
 * inside a group keep the caller's incoming order (already nearest-first / most-critical).
 */
export function groupByType(affected: AffectedCi[]): ImpactGroup[] {
  const groups: ImpactGroup[] = [];
  for (const ciType of CI_TYPES) {
    const items = affected.filter((a) => a.ci.ciType === ciType);
    if (items.length === 0) continue;
    groups.push({
      ciType,
      items,
      weight: items.reduce((sum, a) => sum + a.weight, 0),
    });
  }
  return groups.sort((a, b) => b.weight - a.weight);
}
