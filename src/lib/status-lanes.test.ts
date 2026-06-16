import { describe, expect, it } from "vitest";
import {
  statusLanes,
  statusLaneOf,
  statusDefIdForKey,
  unionStatusDefs,
} from "./status-lanes";
import type { StatusDefRow } from "@/lib/data/repositories";

/**
 * Configurable-status board derivation (ADR-0065 B5, #613). Pure shaping over the
 * resolved status_def set — no DOM, no pg. Covers: lanes carry key/label/color in
 * ordinal order; a card buckets by its status_def key when set else the legacy
 * status; the union de-dupes shared defaults while surfacing per-type customs;
 * a dropped key resolves back to its status_def id.
 */

function def(over: Partial<StatusDefRow> & { key: string }): StatusDefRow {
  return {
    id: `sd-${over.key}`,
    scope: "global",
    projectTypeId: null,
    context: "project",
    label: over.key,
    color: null,
    category: "todo",
    ordinal: 0,
    wipLimit: null,
    ...over,
  };
}

const GLOBAL_PROJECT: StatusDefRow[] = [
  def({ key: "not_started", label: "Not Started", color: "#8A93A6", ordinal: 0 }),
  def({ key: "in_progress", label: "In Progress", color: "#5B8DEF", ordinal: 1, category: "in_progress" }),
  def({ key: "blocked", label: "Blocked", color: "#E2615A", ordinal: 2, category: "in_progress" }),
  def({ key: "complete", label: "Complete", color: "#3FBF8F", ordinal: 3, category: "done" }),
];

describe("statusLanes", () => {
  it("maps a status_def set to lanes carrying key, label and color, preserving order", () => {
    const lanes = statusLanes(GLOBAL_PROJECT);
    expect(lanes.map((l) => l.key)).toEqual(["not_started", "in_progress", "blocked", "complete"]);
    expect(lanes[0]).toEqual({ key: "not_started", label: "Not Started", color: "#8A93A6" });
    // A null color maps to undefined (no inline style) rather than "null".
    expect(statusLanes([def({ key: "x", label: "X", color: null })])[0].color).toBeUndefined();
  });
});

describe("statusLaneOf", () => {
  it("buckets by the resolved status_def key when the FK is set", () => {
    expect(statusLaneOf({ status: "in_progress", statusDefKey: "waiting_on_client" })).toBe(
      "waiting_on_client",
    );
  });

  it("falls back to the legacy status when no FK key is present", () => {
    expect(statusLaneOf({ status: "blocked", statusDefKey: null })).toBe("blocked");
    expect(statusLaneOf({ status: "open" })).toBe("open");
  });
});

describe("unionStatusDefs", () => {
  it("de-dupes shared default columns while surfacing a per-type custom status as its own column", () => {
    // Onboarding's typed set: the global defaults PLUS a custom "Waiting on client"
    // (acceptance #613). listStatusDefs returns typed-over-global, so for a type that
    // ADDS a status the typed set carries every default key plus the new one.
    const onboardingTyped: StatusDefRow[] = [
      ...GLOBAL_PROJECT.map((d) => ({
        ...d,
        scope: "project_type",
        projectTypeId: "pt-onboarding",
        id: `pt-${d.key}`,
      })),
      def({
        key: "waiting_on_client",
        label: "Waiting on client",
        color: "#E0A33E",
        category: "in_progress",
        ordinal: 2,
        scope: "project_type",
        projectTypeId: "pt-onboarding",
      }),
    ];
    const union = unionStatusDefs([GLOBAL_PROJECT, onboardingTyped]);
    // The custom status appears exactly once as its own column…
    expect(union.filter((d) => d.key === "waiting_on_client")).toHaveLength(1);
    // …and shared defaults are not duplicated despite appearing in both sets.
    expect(union.filter((d) => d.key === "in_progress")).toHaveLength(1);
    // Ordered by ordinal: the custom (ordinal 2) sorts among the in_progress/blocked band.
    expect(union.map((d) => d.key)).toEqual([
      "not_started",
      "in_progress",
      "blocked",
      "waiting_on_client",
      "complete",
    ]);
  });

  it("is a no-op shape over a single global set", () => {
    expect(unionStatusDefs([GLOBAL_PROJECT]).map((d) => d.key)).toEqual([
      "not_started",
      "in_progress",
      "blocked",
      "complete",
    ]);
  });
});

describe("statusDefIdForKey", () => {
  it("resolves a dropped lane key back to its status_def id", () => {
    expect(statusDefIdForKey(GLOBAL_PROJECT, "complete")).toBe("sd-complete");
  });

  it("returns null for an unknown (forged/stale) key", () => {
    expect(statusDefIdForKey(GLOBAL_PROJECT, "nope")).toBeNull();
  });
});
