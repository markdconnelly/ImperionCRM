import { describe, expect, it } from "vitest";
import { buildMonth, bucketByDay, parseMonth } from "./calendar";

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
