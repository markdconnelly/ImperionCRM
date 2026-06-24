import { describe, expect, it } from "vitest";
import { toDate, fmtDate, fmtIso, fmtDateTime } from "./date-format";

// The regression (#1299): a `text` timestamp column (LP bronze `collected_at text`, migration
// 0038) reaches these formatters as a STRING, not a Date. The old `d.toISOString()` threw on a
// string and blanked the whole account page. These must coerce, never throw.
const TEXT_TS = "2026-06-24T14:21:18.807Z"; // exactly how account_related_bronze.last_seen_at arrives
const REAL_DATE = new Date("2026-06-24T14:21:18.807Z");

describe("date formatters tolerate text timestamps (#1299)", () => {
  it("fmtDateTime formats a TEXT timestamp instead of throwing", () => {
    expect(() => fmtDateTime(TEXT_TS)).not.toThrow();
    expect(fmtDateTime(TEXT_TS)).toBe("2026-06-24 14:21");
  });

  it("fmtDate / fmtIso also accept a text timestamp", () => {
    expect(fmtDate(TEXT_TS)).toBe("2026-06-24");
    expect(fmtIso(TEXT_TS)).toBe("2026-06-24T14:21:18.807Z");
  });

  it("real Date inputs are unchanged", () => {
    expect(fmtDate(REAL_DATE)).toBe("2026-06-24");
    expect(fmtIso(REAL_DATE)).toBe("2026-06-24T14:21:18.807Z");
    expect(fmtDateTime(REAL_DATE)).toBe("2026-06-24 14:21");
  });

  it("null and unparseable values become null (never throw)", () => {
    expect(fmtDate(null)).toBeNull();
    expect(fmtIso(null)).toBeNull();
    expect(fmtDateTime(null)).toBeNull();
    expect(fmtDateTime("not a date")).toBeNull();
    expect(() => fmtDateTime("not a date")).not.toThrow();
  });

  it("toDate coerces text, passes Date, nulls the rest", () => {
    expect(toDate(TEXT_TS)).toEqual(REAL_DATE);
    expect(toDate(REAL_DATE)).toBe(REAL_DATE);
    expect(toDate(null)).toBeNull();
    expect(toDate("garbage")).toBeNull();
  });
});
