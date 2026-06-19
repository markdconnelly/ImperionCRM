import { describe, expect, test } from "vitest";
import {
  CI_RELATION_TYPES,
  neighbourEdges,
  buildNeighbourhoodGraph,
} from "@/lib/cmdb/relationship";
import type { CiRelationship } from "@/types";

/**
 * Pure CMDB relationship helpers (#647). The DB stores DIRECTIONAL edges; these helpers
 * re-orient them into a CI's point of view (the panel) and shape a node/edge set (the
 * graph). No DB needed.
 */

const edge = (over: Partial<CiRelationship>): CiRelationship => ({
  id: "e1",
  fromCiType: "device",
  fromCiId: "d1",
  toCiType: "account",
  toCiId: "a1",
  relationType: "belongs-to",
  source: "derived",
  note: null,
  createdAt: "",
  updatedAt: "",
  ...over,
});

describe("neighbourEdges", () => {
  test("an edge where the CI is the `from` reads as outgoing", () => {
    const [n] = neighbourEdges({ ciType: "device", ciId: "d1" }, [edge({})]);
    expect(n.direction).toBe("outgoing");
    expect(n.neighbour).toEqual({ ciType: "account", ciId: "a1" });
  });

  test("an edge where the CI is the `to` reads as incoming", () => {
    const [n] = neighbourEdges({ ciType: "account", ciId: "a1" }, [edge({})]);
    expect(n.direction).toBe("incoming");
    expect(n.neighbour).toEqual({ ciType: "device", ciId: "d1" });
  });

  test("carries source + note + relation through", () => {
    const [n] = neighbourEdges({ ciType: "device", ciId: "d1" }, [
      edge({ source: "manual", note: "primary host", relationType: "depends-on" }),
    ]);
    expect(n.source).toBe("manual");
    expect(n.note).toBe("primary host");
    expect(n.relationType).toBe("depends-on");
  });
});

describe("buildNeighbourhoodGraph", () => {
  test("centre node is flagged and deduped against an endpoint", () => {
    const { nodes } = buildNeighbourhoodGraph({ ciType: "device", ciId: "d1" }, [
      edge({}),
    ]);
    expect(nodes.filter((n) => n.isCentre)).toHaveLength(1);
    // device d1 (centre) + account a1 = two distinct nodes, no duplicate of the centre.
    expect(nodes).toHaveLength(2);
    expect(nodes.find((n) => n.key === "device:d1")?.isCentre).toBe(true);
  });

  test("two edges to the SAME neighbour collapse to one node, two edges", () => {
    const { nodes, edges } = buildNeighbourhoodGraph(
      { ciType: "device", ciId: "d1" },
      [
        edge({ id: "e1", relationType: "belongs-to" }),
        edge({ id: "e2", relationType: "depends-on" }),
      ],
    );
    expect(nodes).toHaveLength(2); // device d1 + account a1
    expect(edges).toHaveLength(2);
  });

  test("edges keep their stored from→to orientation", () => {
    const { edges } = buildNeighbourhoodGraph({ ciType: "account", ciId: "a1" }, [
      edge({}),
    ]);
    expect(edges[0]).toMatchObject({ fromKey: "device:d1", toKey: "account:a1" });
  });
});

describe("cloud CI is first-class in the relationship graph (#653)", () => {
  // The cloud belongs-to account edge derived from cloud_asset.account_id (migration 0144).
  const cloudEdge = edge({
    id: "ce1",
    fromCiType: "cloud",
    fromCiId: "c1",
    toCiType: "account",
    toCiId: "a1",
  });

  test("a cloud→account edge re-orients from the cloud CI's point of view", () => {
    const [n] = neighbourEdges({ ciType: "cloud", ciId: "c1" }, [cloudEdge]);
    expect(n.direction).toBe("outgoing");
    expect(n.neighbour).toEqual({ ciType: "account", ciId: "a1" });
  });

  test("the same edge reads as incoming from the account (impact neighbourhood)", () => {
    const [n] = neighbourEdges({ ciType: "account", ciId: "a1" }, [cloudEdge]);
    expect(n.direction).toBe("incoming");
    expect(n.neighbour).toEqual({ ciType: "cloud", ciId: "c1" });
  });

  test("graph shapes the cloud node + keeps the stored orientation", () => {
    const { nodes, edges } = buildNeighbourhoodGraph(
      { ciType: "cloud", ciId: "c1" },
      [cloudEdge],
    );
    expect(nodes.find((n) => n.key === "cloud:c1")?.isCentre).toBe(true);
    expect(edges[0]).toMatchObject({ fromKey: "cloud:c1", toKey: "account:a1" });
  });
});

describe("CI_RELATION_TYPES", () => {
  test("offers belongs-to (the derived relation) in the manual pick-list", () => {
    expect(CI_RELATION_TYPES).toContain("belongs-to");
    expect(CI_RELATION_TYPES.length).toBeGreaterThan(0);
  });
});
