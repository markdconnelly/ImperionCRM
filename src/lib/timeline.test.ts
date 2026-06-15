import { describe, expect, it } from "vitest";
import { layoutTimeline, type TimelineDependencyEdge, type TimelineTask } from "./timeline";

/**
 * Tests for the timeline/Gantt layout (ADR-0066 C3, #343). All UTC / ISO-string
 * based, so these are stable regardless of the runner's local timezone. Bars are
 * point-anchored on due_at (start_at span is FE #580, not modelled yet).
 */
const tasks: TimelineTask[] = [
  { id: "a", title: "Kickoff", status: "open", due: "2026-06-01" },
  { id: "b", title: "Build", status: "in_progress", due: "2026-06-15" },
  { id: "c", title: "Launch", status: "open", due: "2026-07-01" },
  { id: "d", title: "Undated", status: "open", due: null },
];

describe("layoutTimeline", () => {
  it("pads the axis around the earliest and latest due date", () => {
    const t = layoutTimeline(tasks, [], 2);
    expect(t.start).toBe("2026-05-30"); // 2026-06-01 − 2
    expect(t.end).toBe("2026-07-03"); // 2026-07-01 + 2
  });

  it("excludes undated tasks from the axis and counts them", () => {
    const t = layoutTimeline(tasks, []);
    expect(t.bars.map((b) => b.id)).toEqual(["a", "b", "c"]);
    expect(t.undatedCount).toBe(1);
  });

  it("orders bars by due then title and assigns sequential rows", () => {
    const t = layoutTimeline(
      [
        { id: "z", title: "Zeta", status: "open", due: "2026-06-10" },
        { id: "y", title: "Alpha", status: "open", due: "2026-06-10" },
        { id: "x", title: "Early", status: "open", due: "2026-06-01" },
      ],
      [],
    );
    expect(t.bars.map((b) => b.id)).toEqual(["x", "y", "z"]); // due, then title
    expect(t.bars.map((b) => b.row)).toEqual([0, 1, 2]);
  });

  it("places fractions monotonically increasing with due date, within 0..1", () => {
    const t = layoutTimeline(tasks, []);
    const fr = t.bars.map((b) => b.fraction);
    expect(fr[0]).toBeGreaterThan(0);
    expect(fr[fr.length - 1]).toBeLessThan(1);
    expect(fr[0]).toBeLessThan(fr[1]);
    expect(fr[1]).toBeLessThan(fr[2]);
  });

  it("resolves a dependency edge into a connector between two dated bars", () => {
    const edges: TimelineDependencyEdge[] = [{ predecessorId: "a", successorId: "b" }];
    const t = layoutTimeline(tasks, edges);
    expect(t.connectors).toHaveLength(1);
    expect(t.connectors[0]).toMatchObject({ predecessorId: "a", successorId: "b", outOfOrder: false });
  });

  it("flags an out-of-order edge (successor due on/before predecessor)", () => {
    const edges: TimelineDependencyEdge[] = [{ predecessorId: "c", successorId: "a" }];
    const t = layoutTimeline(tasks, edges);
    expect(t.connectors[0].outOfOrder).toBe(true);
  });

  it("drops a connector whose endpoint is undated or out of project", () => {
    const edges: TimelineDependencyEdge[] = [
      { predecessorId: "a", successorId: "d" }, // d is undated
      { predecessorId: "a", successorId: "nope" }, // not in this project
    ];
    const t = layoutTimeline(tasks, edges);
    expect(t.connectors).toHaveLength(0);
  });

  it("emits a first-of-month tick for each month boundary in range", () => {
    const t = layoutTimeline(tasks, []);
    expect(t.ticks.map((k) => k.date)).toEqual(["2026-06-01", "2026-07-01"]);
    expect(t.ticks.every((k) => k.fraction >= 0 && k.fraction <= 1)).toBe(true);
  });

  it("returns an empty timeline when no task has a due date", () => {
    const t = layoutTimeline([{ id: "d", title: "Undated", status: "open", due: null }], []);
    expect(t.bars).toEqual([]);
    expect(t.start).toBe("");
    expect(t.undatedCount).toBe(1);
  });

  it("still gives a non-zero span when every task shares one due date", () => {
    const t = layoutTimeline(
      [
        { id: "a", title: "A", status: "open", due: "2026-06-10" },
        { id: "b", title: "B", status: "open", due: "2026-06-10" },
      ],
      [],
    );
    expect(t.start).toBe("2026-06-08");
    expect(t.end).toBe("2026-06-12");
    expect(t.bars.every((b) => b.fraction > 0 && b.fraction < 1)).toBe(true);
  });
});
