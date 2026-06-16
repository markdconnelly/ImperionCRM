import { describe, expect, it } from "vitest";
import {
  compareRungs,
  isAgentPlane,
  isAutonomyRung,
  isMarkGated,
  resolveRung,
  rungAllows,
} from "./autonomy-dial";
import {
  AGENT_PLANES,
  AUTONOMY_RUNGS,
  DEFAULT_AUTONOMY_RUNG,
  type AgentAutopilotPolicy,
} from "@/types";

const policy = (over: Partial<AgentAutopilotPolicy> = {}): AgentAutopilotPolicy => ({
  id: "00000000-0000-0000-0000-000000000001",
  agentKey: "collections",
  workflowKey: "*",
  plane: "icm",
  rung: "L2",
  markGated: false,
  note: null,
  createdAt: "2026-06-16T00:00:00Z",
  updatedAt: "2026-06-16T00:00:00Z",
  ...over,
});

describe("isAutonomyRung", () => {
  it("accepts every member of the rung vocabulary", () => {
    for (const r of AUTONOMY_RUNGS) expect(isAutonomyRung(r)).toBe(true);
  });

  it("rejects unknown / wrong-typed values (fail closed)", () => {
    for (const bad of ["", "l1", "L4", "auto", 1, null, undefined, {}]) {
      expect(isAutonomyRung(bad)).toBe(false);
    }
  });

  it("covers exactly the four documented rungs", () => {
    expect([...AUTONOMY_RUNGS]).toEqual(["L0", "L1", "L2", "L3"]);
  });
});

describe("isAgentPlane", () => {
  it("accepts every known plane", () => {
    for (const p of AGENT_PLANES) expect(isAgentPlane(p)).toBe(true);
  });
  it("rejects unknown values", () => {
    for (const bad of ["", "ICM", "product", null, 0]) expect(isAgentPlane(bad)).toBe(false);
  });
});

describe("resolveRung — the safe default", () => {
  it("returns the conservative default when the dial has no row (null/undefined)", () => {
    expect(resolveRung(null)).toBe(DEFAULT_AUTONOMY_RUNG);
    expect(resolveRung(undefined)).toBe(DEFAULT_AUTONOMY_RUNG);
    // documents the chosen default = L1 (draft), per ADR-0087
    expect(DEFAULT_AUTONOMY_RUNG).toBe("L1");
  });

  it("returns the stored rung when a policy is present", () => {
    expect(resolveRung(policy({ rung: "L3" }))).toBe("L3");
    expect(resolveRung(policy({ rung: "L0" }))).toBe("L0");
  });

  it("falls back to the default for a corrupt stored rung (fail closed)", () => {
    expect(resolveRung(policy({ rung: "L9" as never }))).toBe(DEFAULT_AUTONOMY_RUNG);
  });
});

describe("compareRungs / rungAllows", () => {
  it("orders rungs by authority", () => {
    expect(compareRungs("L0", "L3")).toBeLessThan(0);
    expect(compareRungs("L2", "L2")).toBe(0);
    expect(compareRungs("L3", "L1")).toBeGreaterThan(0);
  });

  it("permits an action only at or above the required rung (inclusive)", () => {
    expect(rungAllows("L2", "L2")).toBe(true); // exactly enough
    expect(rungAllows("L3", "L2")).toBe(true); // more than enough
    expect(rungAllows("L1", "L2")).toBe(false); // an L1 agent must draft, not write
    expect(rungAllows("L0", "L1")).toBe(false); // observe-only can't even draft
  });
});

describe("isMarkGated — orthogonal to rung", () => {
  it("fails closed (gated) when there is no policy", () => {
    expect(isMarkGated(null)).toBe(true);
    expect(isMarkGated(undefined)).toBe(true);
  });

  it("honors the flag regardless of rung", () => {
    // an L3 (auto) agent is STILL gated for money/customer-facing legs when flagged
    expect(isMarkGated(policy({ rung: "L3", markGated: true }))).toBe(true);
    expect(isMarkGated(policy({ rung: "L3", markGated: false }))).toBe(false);
    expect(isMarkGated(policy({ rung: "L0", markGated: true }))).toBe(true);
  });
});
