import { describe, expect, it } from "vitest";
import { effectiveWipLimit, isOverWipLimit } from "./kanban-board";

/**
 * Over-limit board-highlight logic (ADR-0066 C1, #616 part 2). Pure derivation —
 * no DOM. The effective limit resolves the two WIP layers (personal per-browser
 * override vs the admin-configured `status_def.wip_limit` baseline); the over-limit
 * predicate decides whether the column header turns amber/red. The visual cue (the
 * "5 / 3" badge + red header) is driven entirely by these two functions.
 */

describe("effectiveWipLimit", () => {
  it("uses the admin-configured baseline when there is no personal override", () => {
    expect(effectiveWipLimit(undefined, 3)).toBe(3);
    expect(effectiveWipLimit(0, 3)).toBe(3); // 0 personal = unset, not "no limit"
  });

  it("lets a personal per-browser limit override the configured baseline", () => {
    expect(effectiveWipLimit(5, 3)).toBe(5);
  });

  it("is 0 (no limit) when neither layer sets one", () => {
    expect(effectiveWipLimit(undefined, undefined)).toBe(0);
    expect(effectiveWipLimit(0, undefined)).toBe(0);
  });
});

describe("isOverWipLimit", () => {
  it("flags a column whose count strictly exceeds its effective limit", () => {
    // Acceptance: limit 3, 4 cards → over.
    expect(isOverWipLimit(4, 3)).toBe(true);
  });

  it("is not over at or below the limit", () => {
    expect(isOverWipLimit(3, 3)).toBe(false);
    expect(isOverWipLimit(2, 3)).toBe(false);
  });

  it("never flags when there is no limit (0)", () => {
    expect(isOverWipLimit(99, 0)).toBe(false);
  });

  it("end-to-end: an admin limit of 3 with 4 cards highlights even without a personal limit", () => {
    const limit = effectiveWipLimit(undefined, 3);
    expect(isOverWipLimit(4, limit)).toBe(true);
  });
});
