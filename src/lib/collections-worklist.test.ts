import { describe, expect, it } from "vitest";
import {
  buildWorklist,
  filterWorklist,
  worklistAccountOptions,
  WORKLIST_BUCKETS,
  type CollectionsWorklistRow,
} from "./collections-worklist";
import type { CollectionsActivity, InvoiceAgingBucket, InvoiceMirrorRow } from "@/types";

const invoice = (over: Partial<InvoiceMirrorRow> = {}): InvoiceMirrorRow => ({
  qboInvoiceId: "inv-1",
  docNumber: "1001",
  qboCustomerId: "c-1",
  qboCustomerName: "Acme Co",
  accountId: "acct-1",
  accountName: "Acme",
  txnDate: "2026-01-01",
  dueDate: "2026-02-01",
  totalAmount: "1000.00",
  balance: "1000.00",
  currency: "USD",
  emailStatus: null,
  isOpen: true,
  daysOverdue: 45,
  agingBucket: "31-60",
  ...over,
});

const activity = (over: Partial<CollectionsActivity> = {}): CollectionsActivity => ({
  id: "a-1",
  qboInvoiceId: "inv-1",
  status: "reminded",
  escalationLevel: 1,
  assigneeUserId: null,
  reminders: [],
  notes: null,
  createdAt: "2026-06-01T00:00:00Z",
  updatedAt: "2026-06-10T00:00:00Z",
  ...over,
});

describe("buildWorklist", () => {
  it("keeps only open & overdue invoices (drops paid / current)", () => {
    const rows = buildWorklist(
      [
        invoice({ qboInvoiceId: "overdue", agingBucket: "90+", daysOverdue: 120 }),
        invoice({ qboInvoiceId: "current", agingBucket: "current", daysOverdue: null }),
        invoice({ qboInvoiceId: "paid", agingBucket: "paid", isOpen: false, daysOverdue: null }),
      ],
      {},
    );
    expect(rows.map((r) => r.invoice.qboInvoiceId)).toEqual(["overdue"]);
  });

  it("attaches the real overlay when present, else the empty not-yet-worked overlay", () => {
    const rows = buildWorklist(
      [
        invoice({ qboInvoiceId: "worked", agingBucket: "31-60" }),
        invoice({ qboInvoiceId: "fresh", agingBucket: "1-30", daysOverdue: 10 }),
      ],
      { worked: activity({ qboInvoiceId: "worked", status: "escalated", escalationLevel: 2 }) },
    );
    const worked = rows.find((r) => r.invoice.qboInvoiceId === "worked")!;
    const fresh = rows.find((r) => r.invoice.qboInvoiceId === "fresh")!;
    expect(worked.activity.status).toBe("escalated");
    expect(worked.activity.escalationLevel).toBe(2);
    // never-worked invoice → implicit empty overlay (status none, level 0)
    expect(fresh.activity.status).toBe("none");
    expect(fresh.activity.escalationLevel).toBe(0);
    expect(fresh.activity.reminders).toEqual([]);
  });

  it("preserves input order (mirror is pre-sorted oldest-overdue first)", () => {
    const rows = buildWorklist(
      [
        invoice({ qboInvoiceId: "a", agingBucket: "90+", daysOverdue: 100 }),
        invoice({ qboInvoiceId: "b", agingBucket: "1-30", daysOverdue: 5 }),
      ],
      {},
    );
    expect(rows.map((r) => r.invoice.qboInvoiceId)).toEqual(["a", "b"]);
  });

  it("degrades to an empty worklist on no invoices (honest empty state)", () => {
    expect(buildWorklist([], {})).toEqual([]);
  });
});

const worklist = (): CollectionsWorklistRow[] =>
  buildWorklist(
    [
      invoice({ qboInvoiceId: "a", accountId: "acct-1", accountName: "Acme", agingBucket: "90+", daysOverdue: 100 }),
      invoice({ qboInvoiceId: "b", accountId: "acct-2", accountName: "Beta", agingBucket: "1-30", daysOverdue: 10 }),
      invoice({ qboInvoiceId: "c", accountId: "acct-1", accountName: "Acme", agingBucket: "1-30", daysOverdue: 12 }),
    ],
    {
      a: activity({ qboInvoiceId: "a", status: "escalated" }),
      b: activity({ qboInvoiceId: "b", status: "promised" }),
    },
  );

describe("filterWorklist", () => {
  it("no filter matches everything", () => {
    expect(filterWorklist(worklist(), {})).toHaveLength(3);
  });

  it("filters by account", () => {
    const rows = filterWorklist(worklist(), { accountId: "acct-1" });
    expect(rows.map((r) => r.invoice.qboInvoiceId).sort()).toEqual(["a", "c"]);
  });

  it("filters by aging bucket", () => {
    const rows = filterWorklist(worklist(), { bucket: "1-30" });
    expect(rows.map((r) => r.invoice.qboInvoiceId).sort()).toEqual(["b", "c"]);
  });

  it("filters by dunning status (none for a never-worked invoice)", () => {
    const escalated = filterWorklist(worklist(), { status: "escalated" });
    expect(escalated.map((r) => r.invoice.qboInvoiceId)).toEqual(["a"]);
    const none = filterWorklist(worklist(), { status: "none" });
    expect(none.map((r) => r.invoice.qboInvoiceId)).toEqual(["c"]);
  });

  it("combines axes (AND)", () => {
    const rows = filterWorklist(worklist(), { accountId: "acct-1", bucket: "90+" });
    expect(rows.map((r) => r.invoice.qboInvoiceId)).toEqual(["a"]);
  });
});

describe("worklistAccountOptions", () => {
  it("returns distinct resolved accounts, name-sorted", () => {
    const opts = worklistAccountOptions(worklist());
    expect(opts).toEqual([
      { id: "acct-1", name: "Acme" },
      { id: "acct-2", name: "Beta" },
    ]);
  });

  it("excludes invoices with no resolved account", () => {
    const rows = buildWorklist(
      [invoice({ qboInvoiceId: "x", accountId: null, accountName: null, agingBucket: "90+", daysOverdue: 99 })],
      {},
    );
    expect(worklistAccountOptions(rows)).toEqual([]);
  });
});

describe("WORKLIST_BUCKETS", () => {
  it("is the four overdue buckets in escalating order", () => {
    expect(WORKLIST_BUCKETS).toEqual<readonly InvoiceAgingBucket[]>(["1-30", "31-60", "61-90", "90+"]);
  });
});
