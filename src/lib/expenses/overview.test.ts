import { describe, expect, test } from "vitest";

import {
  buildAttentionMonths,
  buildLifecycleLedger,
  parsePeriod,
  periodKey,
  periodLabel,
  periodOf,
  fmtUsd,
  type Period,
} from "@/lib/expenses/overview";
import type { ExpenseReportRow, ExpenseReportState } from "@/types";

/** Build a report row for a "YYYY-MM" period + state, with sensible defaults. */
function row(
  period: string,
  state: ExpenseReportState,
  overrides: Partial<ExpenseReportRow> = {},
): ExpenseReportRow {
  const p = parsePeriod(period)!;
  return {
    id: `${period}-${state}`,
    employeeId: "emp-1",
    periodYear: p.year,
    periodMonth: p.month,
    state,
    itemCount: 2,
    totalAmount: 100,
    reimbursableAmount: 80,
    attestedAt: state === "open" ? null : "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("period helpers", () => {
  test("periodKey / periodLabel / periodOf round-trip", () => {
    const p: Period = { year: 2026, month: 6 };
    expect(periodKey(p)).toBe("2026-06");
    expect(periodLabel(p)).toBe("June 2026");
    expect(periodOf("2026-06-14T12:00:00.000Z")).toEqual(p);
  });

  test("parsePeriod accepts YYYY-MM and rejects junk / out-of-range months", () => {
    expect(parsePeriod("2026-06")).toEqual({ year: 2026, month: 6 });
    expect(parsePeriod("2026-13")).toBeNull();
    expect(parsePeriod("2026-00")).toBeNull();
    expect(parsePeriod("nope")).toBeNull();
  });
});

describe("buildAttentionMonths", () => {
  const today = "2026-06-14"; // June 2026

  test("always surfaces the current month, even with no report (lazy start)", () => {
    const months = buildAttentionMonths(today, []);
    expect(months).toHaveLength(1);
    expect(months[0]).toMatchObject({ key: "2026-06", isCurrent: true, report: null });
  });

  test("attaches the current month's existing report", () => {
    const r = row("2026-06", "open");
    const months = buildAttentionMonths(today, [r]);
    expect(months[0].report).toBe(r);
  });

  test("surfaces past Open and Rejected reports (need attention), newest first", () => {
    const rows = [row("2026-04", "open"), row("2026-05", "rejected")];
    const months = buildAttentionMonths(today, rows);
    expect(months.map((m) => m.key)).toEqual(["2026-06", "2026-05", "2026-04"]);
  });

  test("does NOT surface past reports already in the pipeline (submitted+)", () => {
    const rows = [row("2026-05", "submitted"), row("2026-04", "reimbursed")];
    const months = buildAttentionMonths(today, rows);
    expect(months.map((m) => m.key)).toEqual(["2026-06"]);
  });
});

describe("buildLifecycleLedger", () => {
  test("includes attested reports, newest month first, with the stage index", () => {
    const rows = [
      row("2026-04", "reimbursed"),
      row("2026-05", "submitted"),
      row("2026-06", "approved"),
    ];
    const ledger = buildLifecycleLedger(rows);
    expect(ledger.map((r) => r.periodMonth)).toEqual([6, 5, 4]);
    expect(ledger.find((r) => r.periodMonth === 6)!.stageIndex).toBe(1); // approved
    expect(ledger.find((r) => r.periodMonth === 4)!.stageIndex).toBe(3); // reimbursed
  });

  test("excludes Open and Rejected reports (those live in the attention strip)", () => {
    const rows = [row("2026-06", "open"), row("2026-05", "rejected")];
    expect(buildLifecycleLedger(rows)).toEqual([]);
  });
});

describe("fmtUsd", () => {
  test("formats dollars and guards non-finite input", () => {
    expect(fmtUsd(80)).toBe("$80.00");
    expect(fmtUsd(1234.5)).toBe("$1,234.50");
    expect(fmtUsd(Number.NaN)).toBe("$0.00");
  });
});
