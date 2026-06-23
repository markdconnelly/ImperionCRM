import { describe, expect, it } from "vitest";
import {
  draftSubtotal,
  generateDueDrafts,
  isScheduleDue,
  type RecurringInvoiceSchedule,
} from "./recurring-invoice";

/** A baseline active monthly schedule starting 2026-01-15, net-30, two line items. */
function makeSchedule(over: Partial<RecurringInvoiceSchedule> = {}): RecurringInvoiceSchedule {
  return {
    id: "sched-1",
    tenantId: "tenant-1",
    accountId: "acct-1",
    rrule: "FREQ=MONTHLY;INTERVAL=1",
    lineItems: [
      { description: "Managed services retainer", quantity: 1, unitAmount: "1200.00" },
      { description: "Backup add-on", quantity: 3, unitAmount: "25.00" },
    ],
    currency: "USD",
    netTermsDays: 30,
    status: "active",
    startOn: "2026-01-15",
    endOn: null,
    nextRunOn: "2026-01-15",
    lastGeneratedPeriod: null,
    ...over,
  };
}

describe("recurring-invoice generation (#1095, epic #1045; ADR-0085 QBO read-only)", () => {
  describe("draftSubtotal", () => {
    it("sums qty×unitAmount in cents, 2dp string", () => {
      // 1×1200.00 + 3×25.00 = 1275.00
      expect(draftSubtotal(makeSchedule().lineItems)).toBe("1275.00");
    });

    it("defaults absent/invalid quantity to 1 and tolerates bad amounts", () => {
      expect(
        draftSubtotal([
          { description: "a", quantity: 0, unitAmount: "10.00" }, // qty→1
          { description: "b", quantity: NaN, unitAmount: "5.50" }, // qty→1
          { description: "c", quantity: 2, unitAmount: "oops" }, // amount→0
        ]),
      ).toBe("15.50");
    });

    it("avoids float drift on repeated cents", () => {
      expect(draftSubtotal([{ description: "x", quantity: 3, unitAmount: "0.10" }])).toBe("0.30");
    });
  });

  describe("generateDueDrafts", () => {
    it("emits one draft for a single due period with correct txn/due dates", () => {
      const r = generateDueDrafts(makeSchedule(), "2026-01-20");
      expect(r.drafts).toHaveLength(1);
      const d = r.drafts[0];
      expect(d.periodKey).toBe("2026-01-15");
      expect(d.txnDate).toBe("2026-01-15");
      expect(d.dueDate).toBe("2026-02-14"); // +30 days
      expect(d.totalAmount).toBe("1275.00");
      expect(r.nextRunOn).toBe("2026-02-15");
      expect(r.lastGeneratedPeriod).toBe("2026-01-15");
      expect(r.ended).toBe(false);
    });

    it("catches up multiple missed periods deterministically", () => {
      // As-of 3 months on: Jan/Feb/Mar occurrences are all due.
      const r = generateDueDrafts(makeSchedule(), "2026-03-20");
      expect(r.drafts.map((d) => d.periodKey)).toEqual(["2026-01-15", "2026-02-15", "2026-03-15"]);
      expect(r.nextRunOn).toBe("2026-04-15");
    });

    it("is idempotent — a period at or before lastGeneratedPeriod is skipped", () => {
      const r = generateDueDrafts(
        makeSchedule({ nextRunOn: "2026-02-15", lastGeneratedPeriod: "2026-01-15" }),
        "2026-02-20",
      );
      expect(r.drafts.map((d) => d.periodKey)).toEqual(["2026-02-15"]);
    });

    it("re-running over an already-generated range produces no drafts", () => {
      const r = generateDueDrafts(
        makeSchedule({ nextRunOn: "2026-02-15", lastGeneratedPeriod: "2026-01-15" }),
        "2026-01-20", // asOf before the next run
      );
      expect(r.drafts).toHaveLength(0);
      expect(r.nextRunOn).toBe("2026-02-15"); // unchanged
    });

    it("does not generate for a paused or ended schedule", () => {
      expect(generateDueDrafts(makeSchedule({ status: "paused" }), "2026-06-01").drafts).toHaveLength(0);
      expect(generateDueDrafts(makeSchedule({ status: "ended" }), "2026-06-01").drafts).toHaveLength(0);
    });

    it("stops at endOn and flags ended", () => {
      const r = generateDueDrafts(
        makeSchedule({ endOn: "2026-02-01" }), // closes before the Feb 15 occurrence
        "2026-06-01",
      );
      expect(r.drafts.map((d) => d.periodKey)).toEqual(["2026-01-15"]);
      expect(r.ended).toBe(true);
    });

    it("treats a malformed RRULE as inert (no drafts, no throw)", () => {
      const r = generateDueDrafts(makeSchedule({ rrule: "NONSENSE" }), "2026-06-01");
      expect(r.drafts).toHaveLength(0);
      expect(r.ended).toBe(false);
    });

    it("honors the maxPeriods safety cap on a stale schedule", () => {
      const r = generateDueDrafts(
        makeSchedule({ rrule: "FREQ=DAILY;INTERVAL=1" }),
        "2030-01-01", // years of daily occurrences
        5,
      );
      expect(r.drafts).toHaveLength(5);
      // cursor advanced exactly 5 days from the start seed.
      expect(r.nextRunOn).toBe("2026-01-20");
    });

    it("clamps a negative net-terms to a same-day due date", () => {
      const r = generateDueDrafts(makeSchedule({ netTermsDays: -5 }), "2026-01-20");
      expect(r.drafts[0].dueDate).toBe("2026-01-15");
    });

    it("throws on a malformed asOf (the caller holds a real date)", () => {
      expect(() => generateDueDrafts(makeSchedule(), "nope")).toThrow();
    });
  });

  describe("isScheduleDue", () => {
    it("is due when active and next run is on/before asOf", () => {
      expect(isScheduleDue(makeSchedule({ nextRunOn: "2026-01-15" }), "2026-01-15")).toBe(true);
    });
    it("is not due before next run, when paused, or past close", () => {
      expect(isScheduleDue(makeSchedule({ nextRunOn: "2026-02-15" }), "2026-01-15")).toBe(false);
      expect(isScheduleDue(makeSchedule({ status: "paused" }), "2026-06-01")).toBe(false);
      expect(
        isScheduleDue(makeSchedule({ nextRunOn: "2026-03-15", endOn: "2026-02-01" }), "2026-06-01"),
      ).toBe(false);
    });
  });
});
