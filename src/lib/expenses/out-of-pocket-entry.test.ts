import { describe, expect, it } from "vitest";
import { validateOutOfPocketEntry, type RawOutOfPocketEntry } from "./out-of-pocket-entry";

const valid: RawOutOfPocketEntry = {
  itemDate: "2026-06-17",
  amount: 24.5,
  categoryId: "c1",
  billable: false,
  autotaskCompanyId: null,
};

describe("validateOutOfPocketEntry", () => {
  it("accepts a non-billable categorized item", () => {
    expect(validateOutOfPocketEntry(valid)).toBeNull();
  });

  it("requires a date", () => {
    expect(validateOutOfPocketEntry({ ...valid, itemDate: "" })).toBe("date");
  });

  it("requires a positive amount", () => {
    expect(validateOutOfPocketEntry({ ...valid, amount: 0 })).toBe("amount");
    expect(validateOutOfPocketEntry({ ...valid, amount: -5 })).toBe("amount");
    expect(validateOutOfPocketEntry({ ...valid, amount: Number.NaN })).toBe("amount");
  });

  it("requires a category", () => {
    expect(validateOutOfPocketEntry({ ...valid, categoryId: null })).toBe("category-required");
  });

  it("requires a company only when billable", () => {
    expect(validateOutOfPocketEntry({ ...valid, billable: true, autotaskCompanyId: null })).toBe(
      "company-required",
    );
    // Same item, internal: company not required.
    expect(validateOutOfPocketEntry({ ...valid, billable: false })).toBeNull();
  });

  it("accepts a fully-specified billable item", () => {
    expect(
      validateOutOfPocketEntry({ ...valid, billable: true, autotaskCompanyId: 42 }),
    ).toBeNull();
  });
});
