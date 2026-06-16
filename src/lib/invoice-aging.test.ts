import { describe, expect, it } from "vitest";
import {
  agingUrgencyRank,
  isOverdue,
  sortByAging,
  summarizeAging,
} from "./invoice-aging";
import type { InvoiceMirrorRow } from "@/types";

// A mirror-row factory — an OPEN, not-yet-due ("current") invoice by default.
function row(over: Partial<InvoiceMirrorRow> = {}): InvoiceMirrorRow {
  return {
    qboInvoiceId: "inv1",
    docNumber: "1001",
    qboCustomerId: "c1",
    qboCustomerName: "Acme",
    accountId: null,
    accountName: null,
    txnDate: "2026-06-01",
    dueDate: "2026-07-01",
    totalAmount: "1200.00",
    balance: "1200.00",
    currency: "USD",
    emailStatus: "EmailSent",
    isOpen: true,
    daysOverdue: null,
    agingBucket: "current",
    ...over,
  };
}

describe("isOverdue", () => {
  it("is true only for an open invoice in a past-due bucket", () => {
    expect(isOverdue(row())).toBe(false); // open + current
    expect(isOverdue(row({ agingBucket: "1-30", daysOverdue: 10 }))).toBe(true);
    expect(isOverdue(row({ agingBucket: "90+", daysOverdue: 120 }))).toBe(true);
    // a settled invoice is never overdue even if its bucket somehow disagrees
    expect(isOverdue(row({ isOpen: false, agingBucket: "paid", balance: "0.00" }))).toBe(false);
  });
});

describe("agingUrgencyRank", () => {
  it("orders oldest debt first (90+ < 61-90 < 31-60 < 1-30 < current < paid)", () => {
    expect(agingUrgencyRank("90+")).toBeLessThan(agingUrgencyRank("61-90"));
    expect(agingUrgencyRank("61-90")).toBeLessThan(agingUrgencyRank("31-60"));
    expect(agingUrgencyRank("31-60")).toBeLessThan(agingUrgencyRank("1-30"));
    expect(agingUrgencyRank("1-30")).toBeLessThan(agingUrgencyRank("current"));
    expect(agingUrgencyRank("current")).toBeLessThan(agingUrgencyRank("paid"));
  });
});

describe("sortByAging", () => {
  it("puts the most-overdue first, larger open balance breaking ties", () => {
    const input = [
      row({ qboInvoiceId: "cur", agingBucket: "current" }),
      row({ qboInvoiceId: "old-small", agingBucket: "90+", balance: "100.00", daysOverdue: 100 }),
      row({ qboInvoiceId: "old-big", agingBucket: "90+", balance: "5000.00", daysOverdue: 100 }),
      row({ qboInvoiceId: "mid", agingBucket: "31-60", balance: "900.00", daysOverdue: 45 }),
    ];
    expect(sortByAging(input).map((r) => r.qboInvoiceId)).toEqual([
      "old-big", // 90+, bigger balance
      "old-small", // 90+, smaller balance
      "mid", // 31-60
      "cur", // current
    ]);
  });

  it("does not mutate the input array", () => {
    const input = [row({ qboInvoiceId: "a" }), row({ qboInvoiceId: "b", agingBucket: "90+" })];
    const before = input.map((r) => r.qboInvoiceId);
    sortByAging(input);
    expect(input.map((r) => r.qboInvoiceId)).toEqual(before);
  });
});

describe("summarizeAging", () => {
  it("returns a zeroed summary (no NaN) for an empty set", () => {
    const s = summarizeAging([]);
    expect(s.openCount).toBe(0);
    expect(s.overdueCount).toBe(0);
    expect(s.openBalance).toBe("0.00");
    expect(s.overdueBalance).toBe("0.00");
    expect(s.buckets.every((b) => b.count === 0 && b.balance === "0.00")).toBe(true);
  });

  it("counts open/overdue and sums balances in exact 2dp money", () => {
    const rows = [
      row({ agingBucket: "current", balance: "100.50" }), // open, not overdue
      row({ agingBucket: "1-30", balance: "200.25", daysOverdue: 10 }), // overdue
      row({ agingBucket: "90+", balance: "300.00", daysOverdue: 100 }), // overdue
      row({ isOpen: false, agingBucket: "paid", balance: "0.00" }), // settled — excluded
    ];
    const s = summarizeAging(rows);
    expect(s.openCount).toBe(3);
    expect(s.overdueCount).toBe(2);
    expect(s.openBalance).toBe("600.75"); // 100.50 + 200.25 + 300.00 — no float drift
    expect(s.overdueBalance).toBe("500.25"); // 200.25 + 300.00
  });

  it("breaks the open balance down per bucket in worklist order (paid excluded)", () => {
    const rows = [
      row({ agingBucket: "current", balance: "10.00" }),
      row({ agingBucket: "current", balance: "5.00" }),
      row({ agingBucket: "90+", balance: "99.99", daysOverdue: 120 }),
      row({ isOpen: false, agingBucket: "paid", balance: "0.00" }),
    ];
    const s = summarizeAging(rows);
    expect(s.buckets.map((b) => b.bucket)).toEqual(["current", "1-30", "31-60", "61-90", "90+"]);
    const current = s.buckets.find((b) => b.bucket === "current")!;
    expect(current).toEqual({ bucket: "current", count: 2, balance: "15.00" });
    const ninety = s.buckets.find((b) => b.bucket === "90+")!;
    expect(ninety).toEqual({ bucket: "90+", count: 1, balance: "99.99" });
  });

  it("is pure — same input gives the same summary", () => {
    const rows = [row({ agingBucket: "1-30", daysOverdue: 5 })];
    expect(summarizeAging(rows)).toEqual(summarizeAging(rows));
  });
});
