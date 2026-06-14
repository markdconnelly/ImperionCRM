import { describe, expect, it } from "vitest";

import {
  adminStateCounts,
  filterSortAdminTimesheets,
  STATE_ORDER,
} from "./admin-overview";
import type { AdminTimesheetRow, TimesheetState } from "@/types";

function row(
  name: string,
  weekStart: string,
  state: TimesheetState,
  attendedMinutes = 0,
): AdminTimesheetRow {
  return {
    id: `${name}-${weekStart}`,
    employeeId: `emp-${name}`,
    employeeName: name,
    weekStart,
    weekEnd: "",
    state,
    entryCount: 0,
    attendedMinutes,
    approvedMinutes: state === "open" || state === "submitted" ? 0 : attendedMinutes,
    attestedAt: state === "open" ? null : `${weekStart}T12:00:00.000Z`,
    payrollApprovedAt: null,
    paidAt: null,
    qbPaymentRef: null,
  };
}

const ROWS: AdminTimesheetRow[] = [
  row("Bob", "2026-06-08", "submitted", 600),
  row("Alice", "2026-06-08", "approved", 480),
  row("Alice", "2026-06-01", "paid", 2400),
  row("Carol", "2026-05-25", "open", 120),
];

describe("filterSortAdminTimesheets", () => {
  it("defaults to newest week first (week desc)", () => {
    const out = filterSortAdminTimesheets(ROWS);
    expect(out.map((r) => r.weekStart)).toEqual([
      "2026-06-08",
      "2026-06-08",
      "2026-06-01",
      "2026-05-25",
    ]);
    // Stable secondary sort by employee name within the same week.
    expect(out.slice(0, 2).map((r) => r.employeeName)).toEqual(["Bob", "Alice"]);
  });

  it("filters by employee name (case-insensitive substring)", () => {
    const out = filterSortAdminTimesheets(ROWS, { q: "ali" });
    expect(out.every((r) => r.employeeName === "Alice")).toBe(true);
    expect(out).toHaveLength(2);
  });

  it("filters by lifecycle state", () => {
    const out = filterSortAdminTimesheets(ROWS, { state: "paid" });
    expect(out.map((r) => r.id)).toEqual(["Alice-2026-06-01"]);
  });

  it("filters by week range (inclusive)", () => {
    const out = filterSortAdminTimesheets(ROWS, { from: "2026-06-01", to: "2026-06-08" });
    expect(out.map((r) => r.weekStart).every((w) => w >= "2026-06-01" && w <= "2026-06-08")).toBe(
      true,
    );
    expect(out).toHaveLength(3);
  });

  it("sorts by state ascending along the lifecycle order", () => {
    const out = filterSortAdminTimesheets(ROWS, { sort: "state", dir: "asc" });
    expect(out.map((r) => r.state)).toEqual(["open", "submitted", "approved", "paid"]);
  });

  it("sorts by attended minutes descending", () => {
    const out = filterSortAdminTimesheets(ROWS, { sort: "attended", dir: "desc" });
    expect(out.map((r) => r.attendedMinutes)).toEqual([2400, 600, 480, 120]);
  });

  it("sorts by employee name ascending", () => {
    const out = filterSortAdminTimesheets(ROWS, { sort: "employee", dir: "asc" });
    expect(out.map((r) => r.employeeName)).toEqual(["Alice", "Alice", "Bob", "Carol"]);
  });

  it("does not mutate the input", () => {
    const copy = [...ROWS];
    filterSortAdminTimesheets(ROWS, { sort: "attended", dir: "asc" });
    expect(ROWS).toEqual(copy);
  });

  it("combines filter + sort", () => {
    const out = filterSortAdminTimesheets(ROWS, { q: "alice", sort: "week", dir: "asc" });
    expect(out.map((r) => r.weekStart)).toEqual(["2026-06-01", "2026-06-08"]);
  });
});

describe("adminStateCounts", () => {
  it("counts per state plus an all total", () => {
    const c = adminStateCounts(ROWS);
    expect(c.all).toBe(4);
    expect(c.open).toBe(1);
    expect(c.submitted).toBe(1);
    expect(c.approved).toBe(1);
    expect(c.paid).toBe(1);
    expect(c.payroll_approved).toBe(0);
  });
});

describe("STATE_ORDER", () => {
  it("is the canonical lifecycle order", () => {
    expect(STATE_ORDER).toEqual(["open", "submitted", "approved", "payroll_approved", "paid"]);
  });
});
