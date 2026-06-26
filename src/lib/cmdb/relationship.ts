/**
 * CMDB relationship-layer helpers (#647, epic #372, ADR-0078).
 *
 * Pure module (no `pg`, no env, no `node:*`) so the edge-orientation and graph-shaping
 * logic is unit-testable without a database. The SQL lives in the postgres repository
 * (`listCiRelationships` / `createCiRelationship` / … / `deriveCiRelationships`); this
 * module turns the stored DIRECTIONAL edges into a CI-centric view for the detail
 * "Relationships" panel and the neighbourhood dependency graph.
 *
 * A `ci_relationship` row is `from -[relation_type]-> to`. From the point of view of a
 * given CI X, every edge touching X is either OUTGOING (X is the `from`) or INCOMING
 * (X is the `to`). The panel and graph render the OTHER endpoint plus the relation read
 * in X's direction.
 */
import type { CiRelationship, CiType } from "@/types";
import { ciKey } from "@/lib/cmdb/ci";

/**
 * The curated relation-type pick-list the manual-edge editor offers (#647). A loose
 * vocabulary (the column is plain text, not an enum, so adding one needs no migration);
 * this list is the GUI's suggested set, read FROM → TO.
 */
export const CI_RELATION_TYPES: readonly string[] = [
  "belongs-to",
  "assigned-to",
  "depends-on",
  "connects-to",
  "runs",
  "runs-on",
  "hosts",
  "member-of",
  "related-to",
] as const;

/** A reference to one endpoint CI of an edge (the cross-union key pair). */
export interface CiRef {
  ciType: CiType;
  ciId: string;
}

/**
 * One edge as seen FROM a given CI: the neighbour on the other end, the relation read in
 * this CI's direction (`outgoing` = forward as stored; `incoming` = the edge points AT
 * this CI), and whether it is a manual (curated) or derived edge.
 */
export interface CiNeighbourEdge {
  id: string;
  /** The CI on the other end of the edge. */
  neighbour: CiRef;
  relationType: string;
  /** outgoing = this CI is the `from`; incoming = this CI is the `to`. */
  direction: "outgoing" | "incoming";
  source: CiRelationship["source"];
  note: string | null;
}

/** Whether an edge's `from` endpoint is the given CI. */
function isFrom(edge: CiRelationship, ci: CiRef): boolean {
  return edge.fromCiType === ci.ciType && edge.fromCiId === ci.ciId;
}

/**
 * Re-orient every edge touching `ci` into the CI's point of view. An edge where `ci` is
 * the `from` is `outgoing`; where `ci` is the `to` is `incoming`. (An edge can't be a
 * self-loop — the DB CHECK forbids it — so exactly one side matches.)
 */
export function neighbourEdges(ci: CiRef, edges: CiRelationship[]): CiNeighbourEdge[] {
  return edges.map((e) => {
    const outgoing = isFrom(e, ci);
    return {
      id: e.id,
      neighbour: outgoing
        ? { ciType: e.toCiType, ciId: e.toCiId }
        : { ciType: e.fromCiType, ciId: e.fromCiId },
      relationType: e.relationType,
      direction: outgoing ? "outgoing" : "incoming",
      source: e.source,
      note: e.note,
    };
  });
}

/** A node in the rendered neighbourhood graph (the centre CI + its direct neighbours). */
export interface GraphNode {
  key: string;
  ciType: CiType;
  ciId: string;
  isCentre: boolean;
}

/** An edge in the rendered neighbourhood graph, oriented as stored (from → to). */
export interface GraphEdge {
  id: string;
  fromKey: string;
  toKey: string;
  relationType: string;
  source: CiRelationship["source"];
}

/**
 * Shape the centre CI + its direct edges into a deduplicated node/edge set for the
 * dependency-graph view. Nodes are unique by `${ciType}:${ciId}`; the centre is flagged.
 * Edges keep their stored orientation (from → to) so the arrowhead reads correctly.
 */
export function buildNeighbourhoodGraph(
  centre: CiRef,
  edges: CiRelationship[],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const centreKey = ciKey(centre);
  const nodes = new Map<string, GraphNode>();
  nodes.set(centreKey, {
    key: centreKey,
    ciType: centre.ciType,
    ciId: centre.ciId,
    isCentre: true,
  });

  const graphEdges: GraphEdge[] = edges.map((e) => {
    const fromKey = ciKey({ ciType: e.fromCiType, ciId: e.fromCiId });
    const toKey = ciKey({ ciType: e.toCiType, ciId: e.toCiId });
    for (const [key, ref] of [
      [fromKey, { ciType: e.fromCiType, ciId: e.fromCiId }],
      [toKey, { ciType: e.toCiType, ciId: e.toCiId }],
    ] as const) {
      if (!nodes.has(key)) {
        nodes.set(key, { key, ciType: ref.ciType, ciId: ref.ciId, isCentre: false });
      }
    }
    return {
      id: e.id,
      fromKey,
      toKey,
      relationType: e.relationType,
      source: e.source,
    };
  });

  return { nodes: [...nodes.values()], edges: graphEdges };
}
