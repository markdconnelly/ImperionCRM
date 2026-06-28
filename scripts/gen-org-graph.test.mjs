// Guards the org-graph generator (#1539): the committed src/data/org-graph.json must
// match what scripts/gen-org-graph.mjs produces from icm/org.yaml + icm/**. Runs in the
// `test` CI gate, so a manifest change that isn't regenerated fails the build (the same
// freshness contract as adr-index, without touching the CI workflow).
//
// The generator's main() runs on import (it's a CLI), so we shell out to `--check`
// instead of importing it, and separately assert the graph's structural invariants.

import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const graph = JSON.parse(readFileSync(join(ROOT, "src", "data", "org-graph.json"), "utf8"));

describe("org-graph generator", () => {
  it("committed org-graph.json is up to date with icm/ (gen-org-graph --check)", () => {
    // Throws (non-zero exit) if stale; the message tells the dev to regenerate.
    expect(() =>
      execFileSync("node", [join("scripts", "gen-org-graph.mjs"), "--check"], { cwd: ROOT }),
    ).not.toThrow();
  });

  it("has exactly one orchestrator at the apex (reports to no one)", () => {
    const roots = graph.nodes.filter((n) => n.reportsTo === null);
    expect(roots).toHaveLength(1);
    expect(roots[0].kind).toBe("orchestrator");
    expect(graph.orchestrator).toBe(roots[0].id);
  });

  it("every non-root node's reportsTo resolves to a node, and edges are consistent", () => {
    const ids = new Set(graph.nodes.map((n) => n.id));
    for (const n of graph.nodes) {
      if (n.reportsTo !== null) expect(ids.has(n.reportsTo)).toBe(true);
    }
    for (const e of graph.edges) {
      expect(ids.has(e.from)).toBe(true);
      expect(ids.has(e.to)).toBe(true);
    }
    // One edge per non-root node (the tree has |nodes|-1 edges).
    expect(graph.edges).toHaveLength(graph.nodes.length - 1);
  });

  it("every executive reports to the orchestrator; every domain reports to an executive", () => {
    const execIds = new Set(graph.nodes.filter((n) => n.kind === "executive").map((n) => n.id));
    for (const n of graph.nodes) {
      if (n.kind === "executive") expect(n.reportsTo).toBe(graph.orchestrator);
      if (n.kind === "domain") expect(execIds.has(n.reportsTo)).toBe(true);
    }
  });
});
