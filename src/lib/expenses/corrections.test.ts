import { describe, expect, it } from "vitest";
import { diffAgainstSnapshot } from "./corrections";
import type { ExpenseItemRow } from "@/types";

function item(over: Partial<ExpenseItemRow> & { id: string }): ExpenseItemRow {
  return {
    id: over.id,
    source: over.source ?? "website",
    kind: over.kind ?? "out_of_pocket",
    itemDate: over.itemDate ?? "2026-06-08",
    categoryName: over.categoryName ?? "Software",
    amount: over.amount ?? 42.5,
    miles: over.miles ?? null,
    reimbursable: over.reimbursable ?? true,
    billable: over.billable ?? false,
    merchant: over.merchant ?? "Acme",
    hasReceipt: over.hasReceipt ?? false,
    notes: over.notes ?? null,
  };
}

describe("diffAgainstSnapshot (ADR-0083 #488)", () => {
  it("flags nothing when the live report equals the attested original", () => {
    const a = item({ id: "i-1" });
    const b = item({ id: "i-2", amount: 10, merchant: "Other" });
    const d = diffAgainstSnapshot([a, b], [a, b]);
    expect(d.changed).toBe(false);
    expect(d.removed).toHaveLength(0);
    expect(d.status.get("i-1")).toBe("unchanged");
    expect(d.status.get("i-2")).toBe("unchanged");
  });

  it("treats equal amounts that differ only in float precision as unchanged", () => {
    const orig = item({ id: "i-1", amount: 42.5 });
    const live = item({ id: "i-1", amount: 42.5000001 }); // rounds to the same cents
    const d = diffAgainstSnapshot([live], [orig]);
    expect(d.status.get("i-1")).toBe("unchanged");
    expect(d.changed).toBe(false);
  });

  it("marks an item edited when an editable field changed", () => {
    const orig = item({ id: "i-1", amount: 42.5 });
    const live = item({ id: "i-1", amount: 99.0 });
    const d = diffAgainstSnapshot([live], [orig]);
    expect(d.status.get("i-1")).toBe("edited");
    expect(d.changed).toBe(true);
  });

  it("marks the reimbursable/billable legs as an edit", () => {
    const orig = item({ id: "i-1", reimbursable: true, billable: false });
    const live = item({ id: "i-1", reimbursable: true, billable: true });
    const d = diffAgainstSnapshot([live], [orig]);
    expect(d.status.get("i-1")).toBe("edited");
  });

  it("marks a new item added", () => {
    const orig = item({ id: "i-1" });
    const fresh = item({ id: "i-2" });
    const d = diffAgainstSnapshot([orig, fresh], [orig]);
    expect(d.status.get("i-1")).toBe("unchanged");
    expect(d.status.get("i-2")).toBe("added");
    expect(d.changed).toBe(true);
  });

  it("collects removed items (present in the attest, gone from the live report)", () => {
    const kept = item({ id: "i-1" });
    const gone = item({ id: "i-2" });
    const d = diffAgainstSnapshot([kept], [kept, gone]);
    expect(d.removed.map((i) => i.id)).toEqual(["i-2"]);
    expect(d.changed).toBe(true);
  });

  it("a null snapshot yields an all-unchanged diff with no removals", () => {
    const a = item({ id: "i-1" });
    const d = diffAgainstSnapshot([a], null);
    expect(d.changed).toBe(false);
    expect(d.removed).toHaveLength(0);
    expect(d.status.get("i-1")).toBe("unchanged");
  });
});
