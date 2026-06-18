import { describe, expect, it } from "vitest";
import { diffAgainstSnapshot } from "./snapshot-diff";

interface Row {
  id: string;
  v: string;
}
const sig = (r: Row): string => r.v;

describe("diffAgainstSnapshot (generic)", () => {
  it("treats a null snapshot as all-unchanged with no removals", () => {
    const rows: Row[] = [
      { id: "a", v: "1" },
      { id: "b", v: "2" },
    ];
    const diff = diffAgainstSnapshot(rows, null, sig);
    expect(diff.changed).toBe(false);
    expect(diff.removed).toEqual([]);
    expect([...diff.status.values()]).toEqual(["unchanged", "unchanged"]);
  });

  it("flags added rows (present live, absent in snapshot)", () => {
    const snapshot: Row[] = [{ id: "a", v: "1" }];
    const rows: Row[] = [
      { id: "a", v: "1" },
      { id: "b", v: "2" },
    ];
    const diff = diffAgainstSnapshot(rows, snapshot, sig);
    expect(diff.status.get("a")).toBe("unchanged");
    expect(diff.status.get("b")).toBe("added");
    expect(diff.changed).toBe(true);
    expect(diff.removed).toEqual([]);
  });

  it("flags edited rows (same id, different sig)", () => {
    const snapshot: Row[] = [{ id: "a", v: "1" }];
    const rows: Row[] = [{ id: "a", v: "1-edited" }];
    const diff = diffAgainstSnapshot(rows, snapshot, sig);
    expect(diff.status.get("a")).toBe("edited");
    expect(diff.changed).toBe(true);
  });

  it("collects removed rows (in snapshot, absent live) and marks changed", () => {
    const snapshot: Row[] = [
      { id: "a", v: "1" },
      { id: "b", v: "2" },
    ];
    const rows: Row[] = [{ id: "a", v: "1" }];
    const diff = diffAgainstSnapshot(rows, snapshot, sig);
    expect(diff.removed).toEqual([{ id: "b", v: "2" }]);
    expect(diff.changed).toBe(true);
  });

  it("reports unchanged when live matches snapshot exactly", () => {
    const snapshot: Row[] = [
      { id: "a", v: "1" },
      { id: "b", v: "2" },
    ];
    const rows: Row[] = [
      { id: "a", v: "1" },
      { id: "b", v: "2" },
    ];
    const diff = diffAgainstSnapshot(rows, snapshot, sig);
    expect(diff.changed).toBe(false);
    expect(diff.removed).toEqual([]);
    expect([...diff.status.values()]).toEqual(["unchanged", "unchanged"]);
  });
});
