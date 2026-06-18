import { describe, expect, test } from "vitest";

import {
  capsFromCategories,
  hardViolationItemIds,
  hasHardViolation,
  itemHasHardViolation,
  type CategoryHardCaps,
  type ReportPeriod,
} from "@/lib/expenses/policy";
import type { ExpenseItemRow } from "@/types";

const PERIOD: ReportPeriod = { year: 2026, month: 6 };

/** A clean out-of-pocket item in-period with a receipt, with overridable fields. */
function oop(overrides: Partial<ExpenseItemRow> = {}): ExpenseItemRow {
  return {
    id: "i-1",
    source: "website",
    kind: "out_of_pocket",
    itemDate: "2026-06-10",
    categoryName: "Meals",
    amount: 25,
    miles: null,
    reimbursable: true,
    billable: false,
    merchant: "Cafe",
    hasReceipt: true,
    notes: null,
    ...overrides,
  };
}

/** A clean mileage item in-period (receipt-exempt). */
function mileage(overrides: Partial<ExpenseItemRow> = {}): ExpenseItemRow {
  return {
    id: "m-1",
    source: "mileiq",
    kind: "mileage",
    itemDate: "2026-06-12",
    categoryName: null,
    amount: 0,
    miles: 30,
    reimbursable: true,
    billable: false,
    merchant: null,
    hasReceipt: false,
    notes: null,
    ...overrides,
  };
}

describe("itemHasHardViolation (ADR-0083 #486)", () => {
  test("a clean in-period out-of-pocket item with a receipt is fine", () => {
    expect(itemHasHardViolation(oop(), PERIOD)).toBe(false);
  });

  test("missing receipt on an out-of-pocket item is HARD", () => {
    expect(itemHasHardViolation(oop({ hasReceipt: false }), PERIOD)).toBe(true);
  });

  test("mileage is receipt-EXEMPT (no receipt is fine)", () => {
    expect(itemHasHardViolation(mileage({ hasReceipt: false }), PERIOD)).toBe(false);
  });

  test("dated outside the report month is HARD", () => {
    expect(itemHasHardViolation(oop({ itemDate: "2026-05-31" }), PERIOD)).toBe(true);
    expect(itemHasHardViolation(oop({ itemDate: "2026-07-01" }), PERIOD)).toBe(true);
  });

  test("a future date (still outside the month) is HARD", () => {
    expect(itemHasHardViolation(oop({ itemDate: "2026-12-25" }), PERIOD)).toBe(true);
  });

  test("over the category hard cap is HARD; at/under the cap is fine", () => {
    const caps: CategoryHardCaps = new Map([["Meals", 50]]);
    expect(itemHasHardViolation(oop({ amount: 75 }), PERIOD, caps)).toBe(true);
    expect(itemHasHardViolation(oop({ amount: 50 }), PERIOD, caps)).toBe(false);
  });

  test("no cap configured for the category → amount never trips the cap rule", () => {
    expect(itemHasHardViolation(oop({ amount: 9999 }), PERIOD, new Map())).toBe(false);
  });

  test("the cap rule does not apply to mileage (only out-of-pocket)", () => {
    const caps: CategoryHardCaps = new Map([["Mileage", 1]]);
    expect(itemHasHardViolation(mileage({ categoryName: "Mileage" }), PERIOD, caps)).toBe(false);
  });
});

describe("hasHardViolation (report attest gate, ADR-0083 #486)", () => {
  test("an empty report is clean (nothing blocks attest)", () => {
    expect(hasHardViolation([], PERIOD)).toBe(false);
  });

  test("all-clean items → attestable", () => {
    expect(hasHardViolation([oop(), mileage()], PERIOD)).toBe(false);
  });

  test("any single hard item blocks the whole report", () => {
    const items = [oop(), oop({ id: "i-2", hasReceipt: false })];
    expect(hasHardViolation(items, PERIOD)).toBe(true);
  });

  test("over-cap item blocks the report when a cap is supplied", () => {
    const caps: CategoryHardCaps = new Map([["Meals", 20]]);
    expect(hasHardViolation([oop({ amount: 21 })], PERIOD, caps)).toBe(true);
  });
});

describe("hardViolationItemIds (surface highlighting, #895)", () => {
  test("returns only the ids of the offending items", () => {
    const items = [
      oop({ id: "clean" }),
      oop({ id: "no-receipt", hasReceipt: false }),
      mileage({ id: "ok-mileage" }),
      oop({ id: "outside", itemDate: "2026-05-30" }),
    ];
    expect(hardViolationItemIds(items, PERIOD)).toEqual(new Set(["no-receipt", "outside"]));
  });

  test("a clean report yields an empty set", () => {
    expect(hardViolationItemIds([oop(), mileage()], PERIOD).size).toBe(0);
  });
});

describe("capsFromCategories (#895)", () => {
  test("keys the hard caps by displayName (what ExpenseItemRow.categoryName carries)", () => {
    const caps = capsFromCategories([
      { displayName: "Meals", hardCap: 50 },
      { displayName: "Lodging", hardCap: null },
    ]);
    expect(caps.get("Meals")).toBe(50);
    expect(caps.get("Lodging")).toBeNull();
    // Resolves against an item's categoryName end-to-end.
    expect(itemHasHardViolation(oop({ amount: 60 }), PERIOD, caps)).toBe(true);
  });
});
