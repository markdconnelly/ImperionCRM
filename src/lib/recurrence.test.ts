import { describe, expect, it } from "vitest";
import { formatRRule, parseRRule, nextOccurrence, describeRRule } from "./recurrence";

describe("recurrence helper (ADR-0070 E2, #353)", () => {
  describe("formatRRule / parseRRule round-trip", () => {
    it("serialises a rule to the RRULE subset", () => {
      expect(formatRRule({ freq: "WEEKLY", interval: 2 })).toBe("FREQ=WEEKLY;INTERVAL=2");
      expect(formatRRule({ freq: "DAILY", interval: 1 })).toBe("FREQ=DAILY;INTERVAL=1");
    });

    it("floors interval to ≥ 1 on format", () => {
      expect(formatRRule({ freq: "MONTHLY", interval: 0 })).toBe("FREQ=MONTHLY;INTERVAL=1");
    });

    it("parses back, tolerant of order/whitespace/case", () => {
      expect(parseRRule("FREQ=WEEKLY;INTERVAL=2")).toEqual({ freq: "WEEKLY", interval: 2 });
      expect(parseRRule(" interval=3 ; freq=monthly ")).toEqual({ freq: "MONTHLY", interval: 3 });
    });

    it("defaults a missing INTERVAL to 1", () => {
      expect(parseRRule("FREQ=DAILY")).toEqual({ freq: "DAILY", interval: 1 });
    });

    it("returns null for missing/unsupported FREQ or empty input", () => {
      expect(parseRRule(null)).toBeNull();
      expect(parseRRule("")).toBeNull();
      expect(parseRRule("INTERVAL=2")).toBeNull();
      expect(parseRRule("FREQ=YEARLY;INTERVAL=1")).toBeNull();
    });
  });

  describe("nextOccurrence", () => {
    it("adds interval days for DAILY", () => {
      expect(nextOccurrence({ freq: "DAILY", interval: 1 }, "2026-06-15")).toBe("2026-06-16");
      expect(nextOccurrence({ freq: "DAILY", interval: 5 }, "2026-06-15")).toBe("2026-06-20");
    });

    it("adds interval weeks for WEEKLY (the #353 acceptance)", () => {
      expect(nextOccurrence({ freq: "WEEKLY", interval: 1 }, "2026-06-15")).toBe("2026-06-22");
      expect(nextOccurrence({ freq: "WEEKLY", interval: 2 }, "2026-06-15")).toBe("2026-06-29");
    });

    it("crosses month/year boundaries cleanly (DST-safe UTC math)", () => {
      expect(nextOccurrence({ freq: "DAILY", interval: 1 }, "2026-12-31")).toBe("2027-01-01");
      expect(nextOccurrence({ freq: "WEEKLY", interval: 1 }, "2026-03-26")).toBe("2026-04-02");
    });

    it("adds interval months for MONTHLY", () => {
      expect(nextOccurrence({ freq: "MONTHLY", interval: 1 }, "2026-06-15")).toBe("2026-07-15");
      expect(nextOccurrence({ freq: "MONTHLY", interval: 3 }, "2026-06-15")).toBe("2026-09-15");
    });

    it("clamps the day to the target month's last day", () => {
      // Jan 31 + 1 month → Feb 28 (2026 not a leap year)
      expect(nextOccurrence({ freq: "MONTHLY", interval: 1 }, "2026-01-31")).toBe("2026-02-28");
      // Jan 31 + 1 month → Feb 29 (2028 leap year)
      expect(nextOccurrence({ freq: "MONTHLY", interval: 1 }, "2028-01-31")).toBe("2028-02-29");
    });

    it("rolls MONTHLY across the year boundary", () => {
      expect(nextOccurrence({ freq: "MONTHLY", interval: 2 }, "2026-11-15")).toBe("2027-01-15");
    });

    it("throws on a malformed date", () => {
      expect(() => nextOccurrence({ freq: "DAILY", interval: 1 }, "nope")).toThrow();
    });
  });

  describe("describeRRule", () => {
    it("uses the singular word at interval 1", () => {
      expect(describeRRule({ freq: "DAILY", interval: 1 })).toBe("Daily");
      expect(describeRRule({ freq: "WEEKLY", interval: 1 })).toBe("Weekly");
      expect(describeRRule({ freq: "MONTHLY", interval: 1 })).toBe("Monthly");
    });

    it("pluralises with the interval", () => {
      expect(describeRRule({ freq: "WEEKLY", interval: 2 })).toBe("Every 2 weeks");
      expect(describeRRule({ freq: "DAILY", interval: 3 })).toBe("Every 3 days");
    });
  });
});
