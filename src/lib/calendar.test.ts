import { describe, expect, it } from "vitest";
import { buildMonth, bucketByDay, buildWeek, parseMonth, weekSpans } from "./calendar";

/**
 * Tests for the month-calendar layout (ADR-0066 C2, #342). All UTC / ISO-string
 * based, so these are stable regardless of the runner's local timezone.
 */
describe("buildMonth", () => {
  it("produces a stable 6×7 grid starting on the Sunday on/before the 1st", () => {
    // June 2026: the 1st is a Monday, so week 0 starts Sunday May 31.
    const m = buildMonth(2026, 6, "2026-06-14");
    expect(m.weeks).toHaveLength(6);
    expect(m.weeks.every((w) => w.length === 7)).toBe(true);
    expect(m.weeks[0][0].date).toBe("2026-05-31");
    expect(m.weeks[0][0].inMonth).toBe(false);
    expect(m.weeks[0][1].date).toBe("2026-06-01");
    expect(m.weeks[0][1].inMonth).toBe(true);
  });

  it("labels the month and flags today", () => {
    const m = buildMonth(2026, 6, "2026-06-14");
    expect(m.label).toBe("June 2026");
    const today = m.weeks.flat().find((d) => d.isToday);
    expect(today?.date).toBe("2026-06-14");
    expect(today?.day).toBe(14);
  });

  it("computes prev/next across year boundaries", () => {
    expect(buildMonth(2026, 1, "2026-01-10").prev).toBe("2025-12");
    expect(buildMonth(2026, 12, "2026-12-10").next).toBe("2027-01");
    expect(buildMonth(2026, 6, "2026-06-10").prev).toBe("2026-05");
    expect(buildMonth(2026, 6, "2026-06-10").next).toBe("2026-07");
  });

  it("has no today when today is outside the displayed month grid", () => {
    const m = buildMonth(2026, 6, "2026-09-01");
    expect(m.weeks.flat().some((d) => d.isToday)).toBe(false);
  });
});

describe("parseMonth", () => {
  it("parses yyyy-mm and yyyy-mm-dd", () => {
    expect(parseMonth("2026-03", "2026-06-14")).toEqual({ year: 2026, month: 3 });
    expect(parseMonth("2026-03-09", "2026-06-14")).toEqual({ year: 2026, month: 3 });
  });

  it("falls back to today's month when missing or malformed", () => {
    expect(parseMonth(undefined, "2026-06-14")).toEqual({ year: 2026, month: 6 });
    expect(parseMonth("garbage", "2026-06-14")).toEqual({ year: 2026, month: 6 });
  });

  it("clamps an out-of-range month rather than throwing", () => {
    expect(parseMonth("2026-13", "2026-06-14")).toEqual({ year: 2026, month: 12 });
    expect(parseMonth("2026-00", "2026-06-14")).toEqual({ year: 2026, month: 1 });
  });
});

describe("bucketByDay", () => {
  const tasks = [
    { id: "a", due: "2026-06-14" },
    { id: "b", due: "2026-06-14" },
    { id: "c", due: "2026-06-20" },
    { id: "d", due: null },
  ];

  it("groups by ISO day and drops items with no due date", () => {
    const by = bucketByDay(tasks, (t) => t.due);
    expect(by.get("2026-06-14")?.map((t) => t.id)).toEqual(["a", "b"]);
    expect(by.get("2026-06-20")?.map((t) => t.id)).toEqual(["c"]);
    expect([...by.keys()]).not.toContain("");
    expect(by.size).toBe(2);
  });

  it("preserves input order within a day", () => {
    const by = bucketByDay(tasks, (t) => t.due);
    expect(by.get("2026-06-14")?.map((t) => t.id)).toEqual(["a", "b"]);
  });
});

/**
 * Tests for the week view + span placement (#628). UTC / ISO-string based, so
 * stable regardless of the runner's local timezone.
 */
describe("buildWeek", () => {
  it("snaps an anchor to the Sunday-start week that contains it", () => {
    // 2026-06-15 is a Monday → its week starts Sunday 2026-06-14.
    const w = buildWeek("2026-06-15", "2026-06-15");
    expect(w.start).toBe("2026-06-14");
    expect(w.end).toBe("2026-06-20");
    expect(w.days).toHaveLength(7);
    expect(w.days[0].date).toBe("2026-06-14");
    expect(w.days[6].date).toBe("2026-06-20");
  });

  it("flags today and computes prev/next week anchors", () => {
    const w = buildWeek("2026-06-15", "2026-06-15");
    expect(w.days.find((d) => d.isToday)?.date).toBe("2026-06-15");
    expect(w.prev).toBe("2026-06-07");
    expect(w.next).toBe("2026-06-21");
  });

  it("falls back to today's week when the anchor is missing/malformed", () => {
    expect(buildWeek(undefined, "2026-06-15").start).toBe("2026-06-14");
    expect(buildWeek("garbage", "2026-06-15").start).toBe("2026-06-14");
  });

  it("labels a single-month week and a month-spanning week", () => {
    expect(buildWeek("2026-06-15", "2026-06-15").label).toBe("Jun 14 – 20, 2026");
    // Week of 2026-06-29 (Sun) runs Jun 28 → Jul 4.
    expect(buildWeek("2026-06-29", "2026-06-29").label).toBe("Jun 28 – Jul 4, 2026");
  });
});

describe("weekSpans", () => {
  const week = buildWeek("2026-06-15", "2026-06-15"); // Sun 06-14 .. Sat 06-20
  const startOf = (t: { start: string | null }) => t.start;
  const dueOf = (t: { due: string | null }) => t.due;

  it("places a start→due span on its columns", () => {
    const [s] = weekSpans(
      [{ id: "a", start: "2026-06-15", due: "2026-06-17", status: "open" }],
      week,
      startOf,
      dueOf,
    );
    expect(s.startCol).toBe(1); // Mon
    expect(s.endCol).toBe(3); // Wed
    expect(s.clippedStart).toBe(false);
    expect(s.clippedEnd).toBe(false);
  });

  it("collapses a no-start task to a point on its due date", () => {
    const [s] = weekSpans(
      [{ id: "a", start: null, due: "2026-06-16", status: "open" }],
      week,
      startOf,
      dueOf,
    );
    expect(s.startCol).toBe(2);
    expect(s.endCol).toBe(2);
  });

  it("clips a span that overruns the week edges and flags both sides", () => {
    const [s] = weekSpans(
      [{ id: "a", start: "2026-06-10", due: "2026-06-25", status: "open" }],
      week,
      startOf,
      dueOf,
    );
    expect(s.startCol).toBe(0); // clamped to Sunday
    expect(s.endCol).toBe(6); // clamped to Saturday
    expect(s.clippedStart).toBe(true);
    expect(s.clippedEnd).toBe(true);
  });

  it("excludes undated tasks and tasks that don't overlap the week", () => {
    const spans = weekSpans(
      [
        { id: "a", start: null, due: null, status: "open" }, // no due
        { id: "b", start: "2026-07-01", due: "2026-07-03", status: "open" }, // after week
        { id: "c", start: "2026-06-01", due: "2026-06-05", status: "open" }, // before week
      ],
      week,
      startOf,
      dueOf,
    );
    expect(spans).toHaveLength(0);
  });

  it("clamps a backwards (start-after-due) task to a point on its due date", () => {
    const [s] = weekSpans(
      [{ id: "a", start: "2026-06-18", due: "2026-06-16", status: "open" }],
      week,
      startOf,
      dueOf,
    );
    expect(s.startCol).toBe(2); // due column
    expect(s.endCol).toBe(2);
  });
});
