import { describe, expect, test } from "vitest";

import {
  adminStateCounts,
  filterSortAdminExpenses,
  type AdminFilters,
} from "@/lib/expenses/admin-overview";
import type { AdminExpenseRow, ExpenseReportState } from "@/types";

/** Build an admin feed row for a "YYYY-MM" period with sensible defaults. */
function row(
  employeeName: string,
  period: string,
  state: ExpenseReportState,
  totalAmount = 100,
): AdminExpenseRow {
  const [y, m] = period.split("-").map(Number);
  return {
    id: `${employeeName}-${period}`,
    employeeId: employeeName,
    employeeName,
    periodYear: y,
    periodMonth: m,
    state,
    itemCount: 1,
    totalAmount,
    reimbursableAmount: totalAmount,
    attestedAt: state === "open" ? null : "2026-06-01T00:00:00.000Z",
    financeApprovedAt: null,
    reimbursedAt: null,
    qbPaymentRef: null,
  };
}

const FEED: AdminExpenseRow[] = [
  row("Bob", "2026-05", "submitted", 50),
  row("Alice", "2026-06", "approved", 300),
  row("Alice", "2026-04", "reimbursed", 120),
  row("Carol", "2026-06", "open", 0),
];

describe("filterSortAdminExpenses", () => {
  test("defaults to newest period first (period desc); the secondary name key flips with dir", () => {
    // dir=desc negates the whole comparison incl. the name tiebreak (mirrors the timesheet
    // admin feed), so within a period names run Z→A.
    const out = filterSortAdminExpenses(FEED);
    expect(out.map((r) => `${r.employeeName}:${r.periodYear}-${r.periodMonth}`)).toEqual([
      "Carol:2026-6",
      "Alice:2026-6",
      "Bob:2026-5",
      "Alice:2026-4",
    ]);
  });

  test("filters by employee name (case-insensitive substring)", () => {
    const out = filterSortAdminExpenses(FEED, { q: "ali" });
    expect(out.every((r) => r.employeeName === "Alice")).toBe(true);
    expect(out).toHaveLength(2);
  });

  test("filters by state", () => {
    const out = filterSortAdminExpenses(FEED, { state: "approved" });
    expect(out.map((r) => r.id)).toEqual(["Alice-2026-06"]);
  });

  test("filters by inclusive period range", () => {
    const out = filterSortAdminExpenses(FEED, { from: "2026-05", to: "2026-06" });
    expect(out.map((r) => r.id).sort()).toEqual([
      "Alice-2026-06",
      "Bob-2026-05",
      "Carol-2026-06",
    ]);
  });

  test("sorts by total (asc) and by employee (asc)", () => {
    const byTotal = filterSortAdminExpenses(FEED, { sort: "total", dir: "asc" });
    expect(byTotal.map((r) => r.totalAmount)).toEqual([0, 50, 120, 300]);
    const byName = filterSortAdminExpenses(FEED, { sort: "employee", dir: "asc" });
    expect(byName[0].employeeName).toBe("Alice");
    expect(byName.at(-1)!.employeeName).toBe("Carol");
  });

  test("does not mutate the input array", () => {
    const copy = [...FEED];
    filterSortAdminExpenses(FEED, { sort: "total", dir: "asc" });
    expect(FEED).toEqual(copy);
  });

  test("combines filter + sort", () => {
    const filters: AdminFilters = { q: "alice", sort: "period", dir: "asc" };
    const out = filterSortAdminExpenses(FEED, filters);
    expect(out.map((r) => r.periodMonth)).toEqual([4, 6]);
  });
});

describe("adminStateCounts", () => {
  test("counts per state + all", () => {
    const c = adminStateCounts(FEED);
    expect(c.all).toBe(4);
    expect(c.submitted).toBe(1);
    expect(c.approved).toBe(1);
    expect(c.reimbursed).toBe(1);
    expect(c.open).toBe(1);
    expect(c.rejected).toBe(0);
    expect(c.finance_approved).toBe(0);
  });
});
