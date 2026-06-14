import { describe, expect, it } from "vitest";
import { diffAgainstSnapshot } from "./corrections";
import type { TimeEntryRow } from "@/types";

function entry(over: Partial<TimeEntryRow> & { id: string }): TimeEntryRow {
  return {
    id: over.id,
    workDate: over.workDate ?? "2026-06-08",
    startedAt: over.startedAt ?? "2026-06-08T09:00:00.000Z",
    endedAt: over.endedAt ?? "2026-06-08T12:00:00.000Z",
    minutes: over.minutes ?? 180,
    category: over.category ?? "billable",
    ancillaryTicketRef: over.ancillaryTicketRef ?? null,
    notes: over.notes ?? null,
  };
}

describe("diffAgainstSnapshot (ADR-0082 #477)", () => {
  it("flags nothing when the live sheet equals the attested original", () => {
    const a = entry({ id: "e-1" });
    const b = entry({ id: "e-2", startedAt: "2026-06-08T13:00:00.000Z", endedAt: "2026-06-08T14:00:00.000Z" });
    const d = diffAgainstSnapshot([a, b], [a, b]);
    expect(d.changed).toBe(false);
    expect(d.removed).toHaveLength(0);
    expect(d.status.get("e-1")).toBe("unchanged");
    expect(d.status.get("e-2")).toBe("unchanged");
  });

  it("ignores derived `minutes` — only the editable fields drive the diff", () => {
    const orig = entry({ id: "e-1", minutes: 180 });
    const live = entry({ id: "e-1", minutes: 999 }); // same start/end, stale minutes
    const d = diffAgainstSnapshot([live], [orig]);
    expect(d.status.get("e-1")).toBe("unchanged");
    expect(d.changed).toBe(false);
  });

  it("marks an entry edited when an editable field changed", () => {
    const orig = entry({ id: "e-1", category: "billable" });
    const live = entry({ id: "e-1", category: "internal" });
    const d = diffAgainstSnapshot([live], [orig]);
    expect(d.status.get("e-1")).toBe("edited");
    expect(d.changed).toBe(true);
  });

  it("marks a new entry added", () => {
    const orig = entry({ id: "e-1" });
    const fresh = entry({ id: "e-2" });
    const d = diffAgainstSnapshot([orig, fresh], [orig]);
    expect(d.status.get("e-1")).toBe("unchanged");
    expect(d.status.get("e-2")).toBe("added");
    expect(d.changed).toBe(true);
  });

  it("collects removed entries (present in the attest, gone from the live sheet)", () => {
    const kept = entry({ id: "e-1" });
    const gone = entry({ id: "e-2" });
    const d = diffAgainstSnapshot([kept], [kept, gone]);
    expect(d.removed.map((e) => e.id)).toEqual(["e-2"]);
    expect(d.changed).toBe(true);
  });

  it("a null snapshot yields an all-unchanged diff with no removals", () => {
    const a = entry({ id: "e-1" });
    const d = diffAgainstSnapshot([a], null);
    expect(d.changed).toBe(false);
    expect(d.removed).toHaveLength(0);
    expect(d.status.get("e-1")).toBe("unchanged");
  });
});
