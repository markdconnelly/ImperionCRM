import { describe, expect, it } from "vitest";
import {
  coerceLevel,
  isAutonomyLevel,
  isLadderLevel,
  ladderAutoExecutes,
  resolveTierCeiling,
  routeAction,
  tierWithinCeiling,
  DEFAULT_AUTONOMY_LEVEL,
  LADDER_LEVELS,
  LADDER_META,
} from "./action-autonomy";

describe("action-autonomy dial (#1012 / ADR-0109)", () => {
  it("validates + coerces levels fail-closed to 1", () => {
    expect(isAutonomyLevel(3)).toBe(true);
    expect(isAutonomyLevel(0)).toBe(false);
    expect(isAutonomyLevel(6)).toBe(false);
    expect(coerceLevel("4")).toBe(4);
    expect(coerceLevel("nonsense")).toBe(DEFAULT_AUTONOMY_LEVEL);
    expect(coerceLevel(null)).toBe(1);
  });

  it("resolves the default level→ceiling map (ADR-0107 D4)", () => {
    expect(resolveTierCeiling(1)).toBe("T0");
    expect(resolveTierCeiling(2)).toBe("T1");
    expect(resolveTierCeiling(3)).toBe("T2");
    expect(resolveTierCeiling(4)).toBe("T3");
    expect(resolveTierCeiling(5)).toBe("T3");
    expect(resolveTierCeiling(99)).toBe("T0"); // fail-closed
  });

  it("honors a valid ceilings override for 2–4 but never for 1/5", () => {
    expect(resolveTierCeiling(3, { "3": "T1" })).toBe("T1");
    expect(resolveTierCeiling(2, { "2": "T3" })).toBe("T3");
    expect(resolveTierCeiling(1, { "1": "T3" })).toBe("T0"); // fixed
    expect(resolveTierCeiling(5, { "5": "T0" })).toBe("T3"); // fixed
    expect(resolveTierCeiling(3, { "3": "bogus" })).toBe("T2"); // bad override → default
  });

  it("tierWithinCeiling orders T0<T1<T2<T3", () => {
    expect(tierWithinCeiling("T1", "T2")).toBe(true);
    expect(tierWithinCeiling("T2", "T2")).toBe(true);
    expect(tierWithinCeiling("T3", "T2")).toBe(false);
  });

  it("routes by tier vs resolved ceiling (execute / execute_notify / cockpit)", () => {
    // Level 1 (Manual, T0): a T2 send always routes to the cockpit.
    expect(routeAction("T2", 1)).toBe("cockpit");
    // Level 3 (Supervised, T2): a T2 send executes inline; a T3 routes.
    expect(routeAction("T2", 3)).toBe("execute");
    expect(routeAction("T3", 3)).toBe("cockpit");
    // Level 4 (oversight): executes but flagged for notify + undo.
    expect(routeAction("T3", 4)).toBe("execute_notify");
    // Level 5: silent execute.
    expect(routeAction("T3", 5)).toBe("execute");
    // T0 read always executes regardless of level.
    expect(routeAction("T0", 1)).toBe("execute");
  });
});

describe("canonical L0–L5 ladder (ADR-0128)", () => {
  it("validates ladder rungs fail-closed (0–5 only)", () => {
    for (const n of [0, 1, 2, 3, 4, 5]) expect(isLadderLevel(n)).toBe(true);
    expect(isLadderLevel(6)).toBe(false);
    expect(isLadderLevel(-1)).toBe(false);
    expect(isLadderLevel("3")).toBe(false); // strict: not a number
    expect(isLadderLevel(null)).toBe(false);
  });

  it("exposes a capability legend for all six rungs", () => {
    expect(LADDER_LEVELS).toEqual([0, 1, 2, 3, 4, 5]);
    for (const lvl of LADDER_LEVELS) {
      expect(LADDER_META[lvl].name.length).toBeGreaterThan(0);
      expect(LADDER_META[lvl].blurb.length).toBeGreaterThan(0);
    }
  });

  it("ladderAutoExecutes: auto IFF dial ≥ auto_at_level AND NOT always_gate", () => {
    expect(ladderAutoExecutes(3, 3, false)).toBe(true); // at floor
    expect(ladderAutoExecutes(5, 3, false)).toBe(true); // above floor
    expect(ladderAutoExecutes(2, 3, false)).toBe(false); // below floor
    expect(ladderAutoExecutes(5, 5, false)).toBe(true); // L5 floor met at L5
  });

  it("always_gate is dial-proof — never auto, even at L5", () => {
    expect(ladderAutoExecutes(5, 0, true)).toBe(false);
    expect(ladderAutoExecutes(5, 5, true)).toBe(false);
  });

  it("fail-closed on a non-ladder dial or floor", () => {
    expect(ladderAutoExecutes(6, 3, false)).toBe(false);
    expect(ladderAutoExecutes("3", 3, false)).toBe(false);
    expect(ladderAutoExecutes(3, 99, false)).toBe(false);
    expect(ladderAutoExecutes(null, 0, false)).toBe(false);
  });
});
