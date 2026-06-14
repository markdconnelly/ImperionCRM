import { describe, expect, it } from "vitest";
import { addDays, mondayOf, weekDays, weekLabel, weekdayName } from "@/lib/week";

describe("week helpers (ADR-0082)", () => {
  it("mondayOf snaps any weekday to its Monday", () => {
    // 2026-06-13 is a Saturday → Monday is 2026-06-08.
    expect(mondayOf("2026-06-13")).toBe("2026-06-08");
    expect(mondayOf("2026-06-08")).toBe("2026-06-08"); // a Monday is its own week start
    expect(mondayOf("2026-06-14")).toBe("2026-06-08"); // Sunday belongs to the prior Monday
    expect(mondayOf("2026-06-15")).toBe("2026-06-15"); // next Monday rolls over
  });

  it("addDays crosses month boundaries", () => {
    expect(addDays("2026-06-08", 7)).toBe("2026-06-15");
    expect(addDays("2026-06-28", 5)).toBe("2026-07-03");
    expect(addDays("2026-06-08", -1)).toBe("2026-06-07");
  });

  it("weekDays yields Mon→Sun", () => {
    expect(weekDays("2026-06-08")).toEqual([
      "2026-06-08",
      "2026-06-09",
      "2026-06-10",
      "2026-06-11",
      "2026-06-12",
      "2026-06-13",
      "2026-06-14",
    ]);
  });

  it("labels and names the week in UTC", () => {
    expect(weekLabel("2026-06-08")).toBe("Jun 8 – Jun 14, 2026");
    expect(weekdayName("2026-06-08")).toBe("Monday");
    expect(weekdayName("2026-06-14")).toBe("Sunday");
  });
});
