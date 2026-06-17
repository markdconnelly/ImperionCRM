import { describe, expect, test } from "vitest";
import { AUTONOMY_RUNGS, RUNG_LABEL, isAutonomyRung } from "@/lib/agent/icm-autonomy";

/**
 * The autonomy-dial vocabulary guard (#278, ADR-0087). The server action that flips
 * the dial trusts `isAutonomyRung` to reject anything that isn't one of the four
 * rungs before it reaches the backend, so the boundary is tested here directly.
 */
describe("autonomy rung guard", () => {
  test("accepts every defined rung", () => {
    for (const r of AUTONOMY_RUNGS) expect(isAutonomyRung(r)).toBe(true);
  });

  test("rejects anything outside the L0–L3 set", () => {
    for (const bad of ["L4", "l1", "auto", "draft", "", "L", "0"]) {
      expect(isAutonomyRung(bad)).toBe(false);
    }
  });

  test("every rung has a human-facing label", () => {
    for (const r of AUTONOMY_RUNGS) {
      expect(RUNG_LABEL[r]).toMatch(new RegExp(`^${r} · `));
    }
  });

  test("the rung order is lowest-authority first (draft default sits at index 1)", () => {
    expect(AUTONOMY_RUNGS).toEqual(["L0", "L1", "L2", "L3"]);
    expect(AUTONOMY_RUNGS[1]).toBe("L1"); // ADR-0061: workflows START in draft (L1)
  });
});
