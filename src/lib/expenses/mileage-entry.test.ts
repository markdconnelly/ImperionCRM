import { describe, expect, it } from "vitest";
import { validateMileageEntry, type RawMileageEntry } from "./mileage-entry";

const valid: RawMileageEntry = {
  itemDate: "2026-06-17",
  miles: 12.4,
  billable: false,
  ticketRef: null,
  autotaskCompanyId: null,
};

describe("validateMileageEntry", () => {
  it("accepts a non-billable drive with no ticket", () => {
    expect(validateMileageEntry(valid)).toBeNull();
  });

  it("requires a date", () => {
    expect(validateMileageEntry({ ...valid, itemDate: "" })).toBe("date");
  });

  it("requires positive miles", () => {
    expect(validateMileageEntry({ ...valid, miles: 0 })).toBe("miles");
    expect(validateMileageEntry({ ...valid, miles: -3 })).toBe("miles");
    expect(validateMileageEntry({ ...valid, miles: Number.NaN })).toBe("miles");
  });

  it("requires a ticket only when billable", () => {
    expect(validateMileageEntry({ ...valid, billable: true, autotaskCompanyId: 42 })).toBe(
      "ticket-required",
    );
    // Same drive, internal: ticket not required.
    expect(validateMileageEntry({ ...valid, billable: false })).toBeNull();
  });

  it("requires a company when billable", () => {
    expect(
      validateMileageEntry({ ...valid, billable: true, ticketRef: "T-1024", autotaskCompanyId: null }),
    ).toBe("company-required");
  });

  it("accepts a fully-specified billable drive", () => {
    expect(
      validateMileageEntry({ ...valid, billable: true, ticketRef: "T-1024", autotaskCompanyId: 42 }),
    ).toBeNull();
  });
});
