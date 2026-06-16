import { describe, expect, it } from "vitest";
import {
  appendReminder,
  emptyCollectionsActivity,
  isCollectionsWorked,
  isDunningStatus,
} from "./collections";
import { DUNNING_STATUSES, type CollectionsReminder } from "@/types";

const reminder = (over: Partial<CollectionsReminder> = {}): CollectionsReminder => ({
  at: "2026-06-16T12:00:00Z",
  channel: "email",
  kind: "courtesy",
  note: null,
  ...over,
});

describe("isDunningStatus", () => {
  it("accepts every member of the enum vocabulary", () => {
    for (const s of DUNNING_STATUSES) expect(isDunningStatus(s)).toBe(true);
  });

  it("rejects unknown / wrong-typed values (fail closed)", () => {
    for (const bad of ["", "REMINDED", "paid", "open", 0, null, undefined, {}]) {
      expect(isDunningStatus(bad)).toBe(false);
    }
  });

  it("covers exactly the six documented statuses", () => {
    expect([...DUNNING_STATUSES].sort()).toEqual(
      ["disputed", "escalated", "none", "paused", "promised", "reminded"].sort(),
    );
  });
});

describe("appendReminder", () => {
  it("appends oldest-first without mutating the input", () => {
    const log = [reminder({ kind: "courtesy" })];
    const next = appendReminder(log, reminder({ kind: "demand" }));
    expect(next).toHaveLength(2);
    expect(next[0].kind).toBe("courtesy");
    expect(next[1].kind).toBe("demand");
    // input untouched (matches the DB's non-rewriting `||` append)
    expect(log).toHaveLength(1);
  });

  it("appends onto an empty log", () => {
    expect(appendReminder([], reminder())).toHaveLength(1);
  });
});

describe("emptyCollectionsActivity", () => {
  it("is a not-yet-worked overlay: none / level 0 / no reminders", () => {
    const a = emptyCollectionsActivity("inv-1");
    expect(a.qboInvoiceId).toBe("inv-1");
    expect(a.status).toBe("none");
    expect(a.escalationLevel).toBe(0);
    expect(a.assigneeUserId).toBeNull();
    expect(a.reminders).toEqual([]);
  });
});

describe("isCollectionsWorked", () => {
  it("null (no overlay row) is not worked", () => {
    expect(isCollectionsWorked(null)).toBe(false);
  });

  it("the empty/none overlay is not worked", () => {
    expect(isCollectionsWorked(emptyCollectionsActivity("inv-1"))).toBe(false);
  });

  it("a moved status OR a logged reminder counts as worked", () => {
    const reminded = { ...emptyCollectionsActivity("inv-1"), status: "reminded" as const };
    expect(isCollectionsWorked(reminded)).toBe(true);
    const logged = {
      ...emptyCollectionsActivity("inv-2"),
      reminders: [reminder()],
    };
    expect(isCollectionsWorked(logged)).toBe(true);
  });

  it("paused / disputed count as worked-but-suspended", () => {
    for (const status of ["paused", "disputed"] as const) {
      expect(isCollectionsWorked({ ...emptyCollectionsActivity("x"), status })).toBe(true);
    }
  });
});
