import { describe, expect, it } from "vitest";
import {
  coerceLevel,
  isAutonomyLevel,
  resolveTierCeiling,
  routeAction,
  tierWithinCeiling,
  DEFAULT_AUTONOMY_LEVEL,
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
