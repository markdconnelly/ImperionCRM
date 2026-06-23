import { describe, it, expect } from "vitest";
import {
  toCount,
  toActualCounts,
  totalActualCounts,
  sortByEstateSize,
  ACTUAL_COUNT_LABEL,
  type ActualCountAggregate,
  type ActualCountRow,
} from "./actual-count";

describe("toCount", () => {
  it("coerces pg bigint strings to integers", () => {
    expect(toCount("42")).toBe(42);
  });
  it("passes numbers through, truncating", () => {
    expect(toCount(7)).toBe(7);
    expect(toCount(7.9)).toBe(7);
  });
  it("treats null / blank / unparseable / negative as 0", () => {
    expect(toCount(null)).toBe(0);
    expect(toCount(undefined)).toBe(0);
    expect(toCount("")).toBe(0);
    expect(toCount("nope")).toBe(0);
    expect(toCount(-3)).toBe(0);
  });
});

describe("toActualCounts", () => {
  const base: ActualCountAggregate = {
    accountId: "a1",
    accountName: "Acme",
    seats: "10",
    devices: "5",
    backups: "3",
  };

  it("normalises every count to a non-negative integer", () => {
    const [row] = toActualCounts([base]);
    expect(row).toEqual({
      accountId: "a1",
      accountName: "Acme",
      seats: 10,
      devices: 5,
      backups: 3,
    });
  });

  it("defaults a missing account name", () => {
    const [row] = toActualCounts([{ ...base, accountName: null }]);
    expect(row.accountName).toBe("(unnamed account)");
  });

  it("reports 0 for an account with silver inventory but none of a given kind", () => {
    const [row] = toActualCounts([{ ...base, seats: null, backups: "0" }]);
    expect(row.seats).toBe(0);
    expect(row.backups).toBe(0);
    expect(row.devices).toBe(5);
  });

  it("drops rows with no owning account id (the staff/internal exclusion guard)", () => {
    const rows = toActualCounts([
      base,
      { ...base, accountId: "" },
      { ...base, accountId: null as unknown as string },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].accountId).toBe("a1");
  });

  it("does not mutate its input", () => {
    const input = [base];
    toActualCounts(input);
    expect(input).toEqual([base]);
  });
});

describe("totalActualCounts", () => {
  it("sums each kind across accounts and counts accounts", () => {
    const rows: ActualCountRow[] = [
      { accountId: "a", accountName: "A", seats: 10, devices: 5, backups: 3 },
      { accountId: "b", accountName: "B", seats: 4, devices: 2, backups: 2 },
    ];
    expect(totalActualCounts(rows)).toEqual({
      accountCount: 2,
      seats: 14,
      devices: 7,
      backups: 5,
    });
  });

  it("is all-zero for an empty estate", () => {
    expect(totalActualCounts([])).toEqual({
      accountCount: 0,
      seats: 0,
      devices: 0,
      backups: 0,
    });
  });
});

describe("sortByEstateSize", () => {
  it("orders largest estate first (devices, then seats, then name)", () => {
    const rows: ActualCountRow[] = [
      { accountId: "s", accountName: "Small", seats: 1, devices: 1, backups: 0 },
      { accountId: "b", accountName: "Big", seats: 50, devices: 40, backups: 30 },
      { accountId: "m1", accountName: "Mid-Zebra", seats: 9, devices: 10, backups: 5 },
      { accountId: "m2", accountName: "Mid-Apple", seats: 12, devices: 10, backups: 5 },
    ];
    expect(sortByEstateSize(rows).map((r) => r.accountId)).toEqual(["b", "m2", "m1", "s"]);
  });

  it("does not mutate its input", () => {
    const rows: ActualCountRow[] = [
      { accountId: "a", accountName: "A", seats: 1, devices: 1, backups: 1 },
      { accountId: "b", accountName: "B", seats: 2, devices: 2, backups: 2 },
    ];
    const snapshot = [...rows];
    sortByEstateSize(rows);
    expect(rows).toEqual(snapshot);
  });
});

describe("ACTUAL_COUNT_LABEL", () => {
  it("labels every kind", () => {
    expect(ACTUAL_COUNT_LABEL.seats).toBe("Licensed seats");
    expect(ACTUAL_COUNT_LABEL.devices).toBe("Devices");
    expect(ACTUAL_COUNT_LABEL.backups).toBe("Protected devices");
  });
});
