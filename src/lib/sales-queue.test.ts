import { describe, expect, test } from "vitest";
import { dueBucket, groupByDueBucket, splitByOwner } from "@/lib/sales-queue";
import type { SalesTaskRow } from "@/types";

const TODAY = "2026-06-11";

function task(over: Partial<SalesTaskRow>): SalesTaskRow {
  return {
    id: "t1",
    title: "Call back",
    status: "open",
    due: null,
    dueAt: null,
    account: null,
    opportunity: null,
    ownerUserId: null,
    owner: null,
    ...over,
  };
}

describe("dueBucket (ADR-0052 §6 — grouped by due date)", () => {
  test("null due date is no_due", () => {
    expect(dueBucket(null, TODAY)).toBe("no_due");
  });
  test("before today is overdue", () => {
    expect(dueBucket("2026-06-10", TODAY)).toBe("overdue");
    expect(dueBucket("2025-01-01", TODAY)).toBe("overdue");
  });
  test("today is today", () => {
    expect(dueBucket("2026-06-11", TODAY)).toBe("today");
  });
  test("within 6 days is this_week, beyond is later", () => {
    expect(dueBucket("2026-06-12", TODAY)).toBe("this_week");
    expect(dueBucket("2026-06-17", TODAY)).toBe("this_week");
    expect(dueBucket("2026-06-18", TODAY)).toBe("later");
  });
  test("handles month boundaries (rolling window, not calendar week)", () => {
    expect(dueBucket("2026-07-01", "2026-06-30")).toBe("this_week");
  });
});

describe("groupByDueBucket", () => {
  test("groups in bucket order and omits empty buckets", () => {
    const groups = groupByDueBucket(
      [
        task({ id: "a", dueAt: "2026-06-20" }),
        task({ id: "b", dueAt: "2026-06-10" }),
        task({ id: "c", dueAt: null }),
      ],
      TODAY,
    );
    expect(groups.map((g) => g.bucket)).toEqual(["overdue", "later", "no_due"]);
    expect(groups[0].tasks.map((t) => t.id)).toEqual(["b"]);
  });
});

describe("splitByOwner", () => {
  test("current user's tasks come out as mine; others grouped by owner, unassigned last", () => {
    const { mine, others } = splitByOwner(
      [
        task({ id: "a", ownerUserId: "me", owner: "Mark" }),
        task({ id: "b", ownerUserId: "u2", owner: "Zoe" }),
        task({ id: "c", ownerUserId: null, owner: null }),
        task({ id: "d", ownerUserId: "u3", owner: "Alice" }),
      ],
      "me",
    );
    expect(mine.map((t) => t.id)).toEqual(["a"]);
    expect(others.map((g) => g.owner)).toEqual(["Alice", "Zoe", "Unassigned"]);
  });
  test("null current user puts everything in others", () => {
    const { mine, others } = splitByOwner([task({ id: "a", ownerUserId: "me" })], null);
    expect(mine).toEqual([]);
    expect(others).toHaveLength(1);
  });
});
