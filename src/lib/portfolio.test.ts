import { describe, expect, it } from "vitest";
import type { PortfolioRow } from "@/types";
import {
  csvCell,
  distinct,
  filterPortfolio,
  isActiveProject,
  nextMilestone,
  portfolioToCsv,
  rollupHealth,
  type PortfolioMilestone,
} from "./portfolio";

/** Pure portfolio-rollup logic behind the cross-project view (ADR-0069 D5, #350). */

const ms = (over: Partial<PortfolioMilestone> = {}): PortfolioMilestone => ({
  status: "in_progress",
  health: "green",
  ordinal: 0,
  name: "M",
  due: null,
  ...over,
});

const row = (over: Partial<PortfolioRow> = {}): PortfolioRow => ({
  id: "p1",
  name: "Acme rollout",
  account: "Acme",
  type: "Onboarding",
  typeKey: "onboarding",
  owner: "Dana",
  status: "in_progress",
  targetLive: "2026-07-01",
  health: "green",
  milestoneTotal: 3,
  milestoneDone: 1,
  nextMilestone: "Kickoff",
  nextMilestoneDue: "2026-06-20",
  ...over,
});

describe("rollupHealth", () => {
  it("returns null when a project has no milestones", () => {
    expect(rollupHealth([])).toBeNull();
  });

  it("reports the worst milestone health (red > amber > green)", () => {
    expect(rollupHealth([ms({ health: "green" }), ms({ health: "green" })])).toBe("green");
    expect(rollupHealth([ms({ health: "green" }), ms({ health: "amber" })])).toBe("amber");
    expect(rollupHealth([ms({ health: "amber" }), ms({ health: "red" })])).toBe("red");
  });
});

describe("nextMilestone", () => {
  it("returns the earliest not-yet-complete milestone by ordinal", () => {
    const next = nextMilestone([
      ms({ ordinal: 2, name: "Late", status: "in_progress" }),
      ms({ ordinal: 0, name: "Done", status: "complete" }),
      ms({ ordinal: 1, name: "Now", status: "in_progress" }),
    ]);
    expect(next?.name).toBe("Now");
  });

  it("returns null when every milestone is complete or there are none", () => {
    expect(nextMilestone([])).toBeNull();
    expect(nextMilestone([ms({ status: "complete" })])).toBeNull();
  });
});

describe("isActiveProject", () => {
  it("treats anything but complete as active", () => {
    expect(isActiveProject(row({ status: "in_progress" }))).toBe(true);
    expect(isActiveProject(row({ status: "blocked" }))).toBe(true);
    expect(isActiveProject(row({ status: "complete" }))).toBe(false);
  });
});

describe("filterPortfolio", () => {
  const rows = [
    row({ id: "a", account: "Acme", owner: "Dana", typeKey: "onboarding", health: "red", status: "in_progress" }),
    row({ id: "b", account: "Beta", owner: null, typeKey: "implementation", health: "green", status: "complete" }),
    row({ id: "c", account: "Acme", owner: "Lee", typeKey: "implementation", health: null, status: "blocked" }),
  ];

  it("activeOnly drops completed projects", () => {
    expect(filterPortfolio(rows, { activeOnly: true }).map((r) => r.id)).toEqual(["a", "c"]);
  });

  it("filters by account, type, owner (incl. unassigned), and health", () => {
    expect(filterPortfolio(rows, { account: "Acme" }).map((r) => r.id)).toEqual(["a", "c"]);
    expect(filterPortfolio(rows, { typeKey: "implementation" }).map((r) => r.id)).toEqual(["b", "c"]);
    expect(filterPortfolio(rows, { owner: "__unassigned__" }).map((r) => r.id)).toEqual(["b"]);
    expect(filterPortfolio(rows, { owner: "Dana" }).map((r) => r.id)).toEqual(["a"]);
    expect(filterPortfolio(rows, { health: "red" }).map((r) => r.id)).toEqual(["a"]);
    expect(filterPortfolio(rows, { health: "__none__" }).map((r) => r.id)).toEqual(["c"]);
  });

  it("an empty filter returns everything", () => {
    expect(filterPortfolio(rows, {}).length).toBe(3);
  });
});

describe("distinct", () => {
  it("dedupes, drops nulls, and sorts", () => {
    expect(distinct(["Beta", "Acme", null, "Acme"])).toEqual(["Acme", "Beta"]);
  });
});

describe("csvCell / portfolioToCsv", () => {
  it("quotes cells with commas, quotes, or newlines", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('he said "hi"')).toBe('"he said ""hi"""');
    expect(csvCell(null)).toBe("");
  });

  it("serializes rows with a header line and one line per row", () => {
    const csv = portfolioToCsv([row({ name: "Acme, Inc rollout", health: "amber" })]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("Project,Account,Type,Owner,Status,Health");
    expect(lines[1]).toContain('"Acme, Inc rollout"');
    expect(lines[1]).toContain("amber");
  });
});
