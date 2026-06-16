import { describe, expect, it } from "vitest";
import {
  isAtRisk,
  isBreached,
  slaUrgencyRank,
  sortByUrgency,
  summarizeBreach,
} from "./sla-breach";
import type { TicketSlaBreachRow } from "@/types";

// A breach-row factory — an OK, open ticket by default.
function row(over: Partial<TicketSlaBreachRow> = {}): TicketSlaBreachRow {
  return {
    ticketId: "t1",
    accountId: null,
    number: "T-1",
    status: "open",
    priority: "medium",
    openedAt: "2026-06-15T00:00:00Z",
    closedAt: null,
    slaApplies: false,
    slaId: null,
    isOpen: true,
    firstResponseDueAt: "2026-06-15T04:00:00Z",
    resolutionDueAt: "2026-06-16T00:00:00Z",
    firstResponseBreached: false,
    resolutionBreached: false,
    resolutionTimeRemaining: "1 day",
    slaState: "ok",
    ...over,
  };
}

describe("isBreached", () => {
  it("is true when either SLA leg is breached", () => {
    expect(isBreached(row())).toBe(false);
    expect(isBreached(row({ firstResponseBreached: true }))).toBe(true);
    expect(isBreached(row({ resolutionBreached: true }))).toBe(true);
  });
});

describe("isAtRisk", () => {
  it("tracks the view's at_risk bucket", () => {
    expect(isAtRisk(row({ slaState: "at_risk" }))).toBe(true);
    expect(isAtRisk(row({ slaState: "ok" }))).toBe(false);
    expect(isAtRisk(row({ slaState: "breached" }))).toBe(false);
  });
});

describe("slaUrgencyRank", () => {
  it("orders breached < at_risk < ok < unknown", () => {
    expect(slaUrgencyRank("breached")).toBeLessThan(slaUrgencyRank("at_risk"));
    expect(slaUrgencyRank("at_risk")).toBeLessThan(slaUrgencyRank("ok"));
    expect(slaUrgencyRank("ok")).toBeLessThan(slaUrgencyRank("unknown"));
  });
});

describe("sortByUrgency", () => {
  it("puts breached first, then at_risk, then ok, oldest-opened breaking ties", () => {
    const input = [
      row({ ticketId: "ok", slaState: "ok" }),
      row({ ticketId: "br-new", slaState: "breached", openedAt: "2026-06-10T00:00:00Z" }),
      row({ ticketId: "br-old", slaState: "breached", openedAt: "2026-06-01T00:00:00Z" }),
      row({ ticketId: "risk", slaState: "at_risk" }),
    ];
    expect(sortByUrgency(input).map((r) => r.ticketId)).toEqual([
      "br-old", // breached, oldest opened
      "br-new", // breached, newer
      "risk", // at_risk
      "ok", // ok
    ]);
  });

  it("does not mutate the input array", () => {
    const input = [row({ ticketId: "a", slaState: "ok" }), row({ ticketId: "b", slaState: "breached" })];
    const before = input.map((r) => r.ticketId);
    sortByUrgency(input);
    expect(input.map((r) => r.ticketId)).toEqual(before);
  });
});

describe("summarizeBreach", () => {
  it("returns a zeroed summary (no NaN) for an empty set", () => {
    expect(summarizeBreach([])).toEqual({
      total: 0,
      breached: 0,
      atRisk: 0,
      ok: 0,
      breachRate: 0,
    });
  });

  it("counts buckets and computes the breach rate", () => {
    const rows = [
      row({ slaState: "breached", resolutionBreached: true }),
      row({ slaState: "breached", resolutionBreached: true }),
      row({ slaState: "at_risk" }),
      row({ slaState: "ok" }),
    ];
    const s = summarizeBreach(rows);
    expect(s.total).toBe(4);
    expect(s.breached).toBe(2);
    expect(s.atRisk).toBe(1);
    expect(s.ok).toBe(1);
    expect(s.breachRate).toBe(0.5);
  });

  it("is pure — same input gives the same summary", () => {
    const rows = [row({ slaState: "breached" })];
    expect(summarizeBreach(rows)).toEqual(summarizeBreach(rows));
  });
});
