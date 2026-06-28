import { describe, expect, it } from "vitest";
import { formatRRule, parseRRule, nextOccurrence, describeRRule, type RecurrenceRule } from "./recurrence";

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

describe("recurrence richer subset (#636)", () => {
  describe("WEEKLY BYDAY", () => {
    it("serialises + parses, sorting Mon-first and tolerating case/dupes/junk", () => {
      expect(formatRRule({ freq: "WEEKLY", interval: 1, byDay: ["MO", "WE", "FR"] }))
        .toBe("FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR");
      expect(formatRRule({ freq: "WEEKLY", interval: 2, byDay: ["FR", "MO"] }))
        .toBe("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,FR");
      expect(parseRRule("FREQ=WEEKLY;INTERVAL=1;BYDAY=mo,we,fr"))
        .toEqual({ freq: "WEEKLY", interval: 1, byDay: ["MO", "WE", "FR"] });
      expect(parseRRule("FREQ=WEEKLY;BYDAY=MO,MO,WE"))
        .toEqual({ freq: "WEEKLY", interval: 1, byDay: ["MO", "WE"] });
      // All-junk BYDAY degrades to a plain weekly rule (no byDay key).
      expect(parseRRule("FREQ=WEEKLY;BYDAY=XX,ZZ")).toEqual({ freq: "WEEKLY", interval: 1 });
      // One junk token is filtered, the valid one kept.
      expect(parseRRule("FREQ=WEEKLY;BYDAY=XX,MO"))
        .toEqual({ freq: "WEEKLY", interval: 1, byDay: ["MO"] });
    });

    it("advances to the next listed weekday within the week, then jumps interval weeks", () => {
      // 2026-06-15 is a Monday. byDay Mon/Wed/Fri.
      const r: RecurrenceRule = { freq: "WEEKLY", interval: 1, byDay: ["MO", "WE", "FR"] };
      expect(nextOccurrence(r, "2026-06-15")).toBe("2026-06-17"); // Mon → Wed
      expect(nextOccurrence(r, "2026-06-17")).toBe("2026-06-19"); // Wed → Fri
      expect(nextOccurrence(r, "2026-06-19")).toBe("2026-06-22"); // Fri → next Mon
    });

    it("honours the week interval when jumping", () => {
      const r: RecurrenceRule = { freq: "WEEKLY", interval: 2, byDay: ["MO", "WE", "FR"] };
      expect(nextOccurrence(r, "2026-06-19")).toBe("2026-06-29"); // Fri → Mon two weeks on
    });

    it("a single-weekday BYDAY behaves like plain weekly", () => {
      expect(nextOccurrence({ freq: "WEEKLY", interval: 1, byDay: ["MO"] }, "2026-06-15"))
        .toBe("2026-06-22");
    });
  });

  describe("MONTHLY BYMONTHDAY", () => {
    it("serialises + parses, dropping out-of-range days", () => {
      expect(formatRRule({ freq: "MONTHLY", interval: 1, byMonthDay: 15 }))
        .toBe("FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=15");
      expect(parseRRule("FREQ=MONTHLY;BYMONTHDAY=15"))
        .toEqual({ freq: "MONTHLY", interval: 1, byMonthDay: 15 });
      expect(parseRRule("FREQ=MONTHLY;BYMONTHDAY=40")).toEqual({ freq: "MONTHLY", interval: 1 });
    });

    it("lands on the day-of-month, clamping to month length, honouring interval", () => {
      const r = { freq: "MONTHLY" as const, interval: 1, byMonthDay: 15 };
      expect(nextOccurrence(r, "2026-06-10")).toBe("2026-06-15"); // same month, later day
      expect(nextOccurrence(r, "2026-06-15")).toBe("2026-07-15"); // on the day → next month
      // Day 31 clamps to Feb 28 (2026 not a leap year).
      expect(nextOccurrence({ freq: "MONTHLY", interval: 1, byMonthDay: 31 }, "2026-01-31"))
        .toBe("2026-02-28");
      expect(nextOccurrence({ freq: "MONTHLY", interval: 3, byMonthDay: 15 }, "2026-06-15"))
        .toBe("2026-09-15");
    });
  });

  describe("MONTHLY nth-weekday (BYDAY=2TU / -1FR)", () => {
    it("serialises + parses the ordinal-weekday form", () => {
      expect(formatRRule({ freq: "MONTHLY", interval: 1, nthWeekday: { nth: 2, weekday: "TU" } }))
        .toBe("FREQ=MONTHLY;INTERVAL=1;BYDAY=2TU");
      expect(formatRRule({ freq: "MONTHLY", interval: 1, nthWeekday: { nth: -1, weekday: "FR" } }))
        .toBe("FREQ=MONTHLY;INTERVAL=1;BYDAY=-1FR");
      expect(parseRRule("FREQ=MONTHLY;BYDAY=2TU"))
        .toEqual({ freq: "MONTHLY", interval: 1, nthWeekday: { nth: 2, weekday: "TU" } });
      expect(parseRRule("FREQ=MONTHLY;BYDAY=-1FR"))
        .toEqual({ freq: "MONTHLY", interval: 1, nthWeekday: { nth: -1, weekday: "FR" } });
      // Ordinal out of the supported 1..5/-1 range degrades to a plain monthly rule.
      expect(parseRRule("FREQ=MONTHLY;BYDAY=9MO")).toEqual({ freq: "MONTHLY", interval: 1 });
    });

    it("lands on the nth weekday of the month", () => {
      // 2nd Tuesday: June 2026 = the 9th; from mid-month rolls to July's 2nd Tue (the 14th).
      const r = { freq: "MONTHLY" as const, interval: 1, nthWeekday: { nth: 2, weekday: "TU" as const } };
      expect(nextOccurrence(r, "2026-06-01")).toBe("2026-06-09");
      expect(nextOccurrence(r, "2026-06-15")).toBe("2026-07-14");
    });

    it("supports the last weekday (nth = -1)", () => {
      const r = { freq: "MONTHLY" as const, interval: 1, nthWeekday: { nth: -1, weekday: "FR" as const } };
      expect(nextOccurrence(r, "2026-06-01")).toBe("2026-06-26"); // last Friday of June 2026
    });

    it("skips a month that lacks the nth weekday (no 5th Friday in June 2026)", () => {
      const r = { freq: "MONTHLY" as const, interval: 1, nthWeekday: { nth: 5, weekday: "FR" as const } };
      expect(nextOccurrence(r, "2026-06-01")).toBe("2026-07-31"); // July has a 5th Friday
    });
  });

  describe("describeRRule for the richer subset", () => {
    it("describes weekday lists, month-days and nth-weekdays", () => {
      expect(describeRRule({ freq: "WEEKLY", interval: 1, byDay: ["MO", "WE", "FR"] }))
        .toBe("Weekly on Mon, Wed, Fri");
      expect(describeRRule({ freq: "WEEKLY", interval: 2, byDay: ["MO", "WE"] }))
        .toBe("Every 2 weeks on Mon, Wed");
      expect(describeRRule({ freq: "MONTHLY", interval: 1, byMonthDay: 15 }))
        .toBe("Monthly on day 15");
      expect(describeRRule({ freq: "MONTHLY", interval: 3, byMonthDay: 1 }))
        .toBe("Every 3 months on day 1");
      expect(describeRRule({ freq: "MONTHLY", interval: 1, nthWeekday: { nth: 2, weekday: "TU" } }))
        .toBe("Monthly on the 2nd Tue");
      expect(describeRRule({ freq: "MONTHLY", interval: 2, nthWeekday: { nth: -1, weekday: "FR" } }))
        .toBe("Every 2 months on the last Fri");
    });
  });

  describe("format → parse round-trips", () => {
    it("round-trips every richer variant", () => {
      const rules = [
        { freq: "WEEKLY" as const, interval: 1, byDay: ["MO", "WE", "FR"] as ("MO" | "WE" | "FR")[] },
        { freq: "MONTHLY" as const, interval: 2, byMonthDay: 15 },
        { freq: "MONTHLY" as const, interval: 1, nthWeekday: { nth: 2, weekday: "TU" as const } },
        { freq: "MONTHLY" as const, interval: 1, nthWeekday: { nth: -1, weekday: "FR" as const } },
      ];
      for (const r of rules) {
        expect(parseRRule(formatRRule(r))).toEqual(r);
      }
    });
  });
});
