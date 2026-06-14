import { describe, expect, it } from "vitest";

import {
  buildActiveUpcoming,
  buildLifecycleLedger,
  fmtMinutes,
  LIFECYCLE_STAGES,
} from "./overview";
import type { TimesheetRow, TimesheetState } from "@/types";

function row(weekStart: string, state: TimesheetState, over: Partial<TimesheetRow> = {}): TimesheetRow {
  return {
    id: `ts-${weekStart}`,
    employeeId: "emp-1",
    weekStart,
    weekEnd: "", // not asserted here
    state,
    entryCount: 0,
    totalMinutes: 0,
    attestedAt: state === "open" ? null : `${weekStart}T12:00:00.000Z`,
    ...over,
  };
}

// 2026-06-10 is a Wednesday → its Monday is 2026-06-08.
const TODAY = "2026-06-10";
const CURRENT = "2026-06-08";
const NEXT = "2026-06-15";
const PREV = "2026-06-01";

describe("buildActiveUpcoming", () => {
  it("always offers the current week and the next week, even with no sheets", () => {
    const weeks = buildActiveUpcoming(TODAY, []);
    expect(weeks.map((w) => w.weekStart)).toEqual([CURRENT, NEXT]);
    expect(weeks[0].isCurrent).toBe(true);
    expect(weeks[1].isCurrent).toBe(false);
    expect(weeks.every((w) => w.sheet === null)).toBe(true);
    expect(weeks[0].weekEnd).toBe("2026-06-14"); // Sunday of the current week
  });

  it("annotates a week with its existing sheet when one was started", () => {
    const sheet = row(CURRENT, "open", { entryCount: 3, totalMinutes: 480 });
    const weeks = buildActiveUpcoming(TODAY, [sheet]);
    expect(weeks[0].sheet).toBe(sheet);
    expect(weeks[1].sheet).toBeNull();
  });

  it("surfaces a PAST week still open (needs attention) ahead of the current week", () => {
    const stale = row(PREV, "open");
    const weeks = buildActiveUpcoming(TODAY, [stale]);
    expect(weeks.map((w) => w.weekStart)).toEqual([PREV, CURRENT, NEXT]);
    expect(weeks[0].sheet).toBe(stale);
  });

  it("does NOT surface a past week that was already attested", () => {
    const weeks = buildActiveUpcoming(TODAY, [row(PREV, "submitted")]);
    expect(weeks.map((w) => w.weekStart)).toEqual([CURRENT, NEXT]);
  });

  it("respects the `ahead` count", () => {
    const weeks = buildActiveUpcoming(TODAY, [], 2);
    expect(weeks.map((w) => w.weekStart)).toEqual([CURRENT, NEXT, "2026-06-22"]);
  });
});

describe("buildLifecycleLedger", () => {
  it("includes only attested sheets, newest week first, with the stage index", () => {
    const rows = [
      row(CURRENT, "open"),
      row(PREV, "submitted"),
      row("2026-05-25", "paid"),
      row("2026-05-18", "payroll_approved"),
    ];
    const ledger = buildLifecycleLedger(rows);
    expect(ledger.map((r) => r.weekStart)).toEqual(["2026-06-01", "2026-05-25", "2026-05-18"]);
    expect(ledger.find((r) => r.weekStart === PREV)!.stageIndex).toBe(0);
    expect(ledger.find((r) => r.weekStart === "2026-05-25")!.stageIndex).toBe(3);
    expect(ledger.every((r) => r.state !== "open")).toBe(true);
  });

  it("is empty when nothing has been attested", () => {
    expect(buildLifecycleLedger([row(CURRENT, "open")])).toEqual([]);
  });

  it("orders the lifecycle stages submitted → paid", () => {
    expect(LIFECYCLE_STAGES).toEqual(["submitted", "approved", "payroll_approved", "paid"]);
  });
});

describe("fmtMinutes", () => {
  it("formats hours and minutes", () => {
    expect(fmtMinutes(0)).toBe("0h 0m");
    expect(fmtMinutes(485)).toBe("8h 5m");
  });
});
