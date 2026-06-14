import { describe, expect, test } from "vitest";

import {
  bucketCounts,
  expenseLegStatus,
  filterSortClose,
  fmtHours,
  fmtUsd,
  hasException,
  hasOpenObligation,
  isSettled,
  periodKey,
  periodLabel,
  timeLegStatus,
} from "@/lib/monthly-close/overview";
import type { AdminMonthlyCloseRow } from "@/types";

/** Build a monthly-close feed row with sensible (nothing-owed) defaults. */
function row(
  employeeName: string,
  period: string,
  over: Partial<AdminMonthlyCloseRow> = {},
): AdminMonthlyCloseRow {
  const [y, m] = period.split("-").map(Number);
  return {
    appUserId: `${employeeName}-id`,
    employeeName,
    periodYear: y,
    periodMonth: m,
    expenseReportId: null,
    expenseState: null,
    reimbursableTotal: 0,
    reimbursementVerdict: "pending",
    qbPaymentRef: null,
    approvedTimeMinutes: 0,
    timesheetCount: 0,
    paidCount: 0,
    expenseObligationOpen: false,
    timeObligationOpen: false,
    ...over,
  };
}

describe("formatting helpers", () => {
  test("periodKey / periodLabel", () => {
    expect(periodKey(2026, 6)).toBe("2026-06");
    expect(periodLabel(2026, 6)).toBe("June 2026");
  });
  test("fmtHours converts minutes to decimal hours", () => {
    expect(fmtHours(90)).toBe("1.50h");
    expect(fmtHours(0)).toBe("0.00h");
    expect(fmtHours(Number.NaN)).toBe("0.00h");
  });
  test("fmtUsd is defensive against non-finite input", () => {
    expect(fmtUsd(120)).toBe("$120.00");
    expect(fmtUsd(Number.POSITIVE_INFINITY)).toBe("$0.00");
  });
});

describe("timeLegStatus", () => {
  test("no timesheet → none", () => {
    expect(timeLegStatus(row("A", "2026-06"))).toBe("none");
  });
  test("all timesheets paid → settled", () => {
    expect(timeLegStatus(row("A", "2026-06", { timesheetCount: 2, paidCount: 2 }))).toBe("settled");
  });
  test("outstanding obligation → open", () => {
    expect(
      timeLegStatus(
        row("A", "2026-06", { timesheetCount: 2, paidCount: 1, timeObligationOpen: true }),
      ),
    ).toBe("open");
  });
  test("work exists but not yet finance-approved → pending", () => {
    expect(timeLegStatus(row("A", "2026-06", { timesheetCount: 1, paidCount: 0 }))).toBe("pending");
  });
});

describe("expenseLegStatus", () => {
  test("no report → none", () => {
    expect(expenseLegStatus(row("A", "2026-06"))).toBe("none");
  });
  test("reimbursed → settled", () => {
    expect(
      expenseLegStatus(row("A", "2026-06", { expenseReportId: "r1", expenseState: "reimbursed" })),
    ).toBe("settled");
  });
  test("recon mismatch → mismatch (blocks auto-flip) even when finance-approved", () => {
    expect(
      expenseLegStatus(
        row("A", "2026-06", {
          expenseReportId: "r1",
          expenseState: "finance_approved",
          reimbursementVerdict: "mismatch",
          expenseObligationOpen: true,
        }),
      ),
    ).toBe("mismatch");
  });
  test("finance-approved + open obligation → open", () => {
    expect(
      expenseLegStatus(
        row("A", "2026-06", {
          expenseReportId: "r1",
          expenseState: "finance_approved",
          expenseObligationOpen: true,
        }),
      ),
    ).toBe("open");
  });
  test("submitted/approved (pre finance) → pending", () => {
    expect(
      expenseLegStatus(row("A", "2026-06", { expenseReportId: "r1", expenseState: "approved" })),
    ).toBe("pending");
  });
});

describe("derived predicates", () => {
  test("hasException only when expense recon mismatched", () => {
    expect(hasException(row("A", "2026-06"))).toBe(false);
    expect(
      hasException(
        row("A", "2026-06", {
          expenseReportId: "r1",
          expenseState: "finance_approved",
          reimbursementVerdict: "mismatch",
          expenseObligationOpen: true,
        }),
      ),
    ).toBe(true);
  });
  test("hasOpenObligation reflects either leg's open flag", () => {
    expect(hasOpenObligation(row("A", "2026-06"))).toBe(false);
    expect(hasOpenObligation(row("A", "2026-06", { timeObligationOpen: true }))).toBe(true);
    expect(hasOpenObligation(row("A", "2026-06", { expenseObligationOpen: true }))).toBe(true);
  });
  test("isSettled requires every present leg settled AND at least one settled", () => {
    // nothing on either leg — not "settled" (there's nothing to settle)
    expect(isSettled(row("A", "2026-06"))).toBe(false);
    // time paid, no expense leg — settled
    expect(isSettled(row("A", "2026-06", { timesheetCount: 1, paidCount: 1 }))).toBe(true);
    // time paid but expense still open — not settled
    expect(
      isSettled(
        row("A", "2026-06", {
          timesheetCount: 1,
          paidCount: 1,
          expenseReportId: "r1",
          expenseState: "finance_approved",
          expenseObligationOpen: true,
        }),
      ),
    ).toBe(false);
    // both legs settled — settled
    expect(
      isSettled(
        row("A", "2026-06", {
          timesheetCount: 1,
          paidCount: 1,
          expenseReportId: "r1",
          expenseState: "reimbursed",
        }),
      ),
    ).toBe(true);
  });
});

const FEED: AdminMonthlyCloseRow[] = [
  row("Bob", "2026-05", { timesheetCount: 1, paidCount: 0, approvedTimeMinutes: 60 }), // time pending
  row("Alice", "2026-06", {
    expenseReportId: "a6",
    expenseState: "finance_approved",
    reimbursableTotal: 300,
    expenseObligationOpen: true,
  }), // expense open obligation
  row("Alice", "2026-04", {
    timesheetCount: 1,
    paidCount: 1,
    expenseReportId: "a4",
    expenseState: "reimbursed",
    reimbursableTotal: 120,
  }), // settled both legs
  row("Carol", "2026-06", {
    expenseReportId: "c6",
    expenseState: "finance_approved",
    reimbursementVerdict: "mismatch",
    reimbursableTotal: 75,
    expenseObligationOpen: true,
  }), // exception
];

describe("filterSortClose", () => {
  test("defaults to newest month first; name is the descending tiebreak", () => {
    const out = filterSortClose(FEED);
    expect(out.map((r) => `${r.employeeName}:${periodKey(r.periodYear, r.periodMonth)}`)).toEqual([
      "Carol:2026-06",
      "Alice:2026-06",
      "Bob:2026-05",
      "Alice:2026-04",
    ]);
  });

  test("filters by employee name (case-insensitive substring)", () => {
    const out = filterSortClose(FEED, { q: "ali" });
    expect(out).toHaveLength(2);
    expect(out.every((r) => r.employeeName === "Alice")).toBe(true);
  });

  test("bucket=open keeps only rows with an outstanding obligation", () => {
    const out = filterSortClose(FEED, { bucket: "open" });
    expect(out.map((r) => r.employeeName).sort()).toEqual(["Alice", "Carol"]);
  });

  test("bucket=exceptions isolates recon mismatches", () => {
    const out = filterSortClose(FEED, { bucket: "exceptions" });
    expect(out).toHaveLength(1);
    expect(out[0].employeeName).toBe("Carol");
  });

  test("bucket=settled keeps only fully-settled employee-months", () => {
    const out = filterSortClose(FEED, { bucket: "settled" });
    expect(out).toHaveLength(1);
    expect(out[0].periodMonth).toBe(4);
  });

  test("from/to bound the period range inclusively", () => {
    const out = filterSortClose(FEED, { from: "2026-05", to: "2026-06" });
    expect(out.every((r) => r.periodMonth >= 5)).toBe(true);
    expect(out).toHaveLength(3);
  });

  test("does not mutate the input array", () => {
    const copy = [...FEED];
    filterSortClose(FEED, { sort: "expense", dir: "asc" });
    expect(FEED).toEqual(copy);
  });
});

describe("bucketCounts", () => {
  test("counts each coarse bucket across the unfiltered feed", () => {
    const c = bucketCounts(FEED);
    expect(c.all).toBe(4);
    expect(c.open).toBe(2); // Alice 06 + Carol 06
    expect(c.exceptions).toBe(1); // Carol 06
    expect(c.settled).toBe(1); // Alice 04
  });
});
