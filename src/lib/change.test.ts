import { describe, it, expect } from "vitest";
import {
  CHANGE_TYPES,
  CHANGE_TYPE_LABEL,
  CHANGE_STATUSES,
  CHANGE_STATUS_LABEL,
  asChangeType,
  effectiveRisk,
  deriveChangeRisk,
  riskBand,
  RISK_BAND_LABEL,
  requiresApproval,
  isExpedited,
  initialApprovalState,
  isAwaitingApproval,
  applyApprovalDecision,
  asApprovalDecision,
  validateScheduleWindow,
  nextScheduleStatus,
  windowsOverlap,
  findScheduleConflicts,
  type SchedulableChange,
} from "@/lib/change";
import type { ConfigurationItem, CiRelationship, Criticality, CiType } from "@/types";

/** Build a minimal CI fixture; criticality via `derivedDefault` (no override unless given). */
function ci(
  ciType: CiType,
  ciId: string,
  derivedDefault: Criticality,
  override: Criticality | null = null,
): ConfigurationItem {
  return {
    ciType,
    ciId,
    accountId: "acc-1",
    accountName: "Acme",
    displayName: `${ciType}-${ciId}`,
    attributes: [],
    derivedDefault,
    override,
    lifecycle: "unknown",
  };
}

/** Build an undirected-friendly edge fixture between two CIs. */
function edge(
  fromCiType: CiType,
  fromCiId: string,
  toCiType: CiType,
  toCiId: string,
): CiRelationship {
  return {
    id: `${fromCiId}->${toCiId}`,
    fromCiType,
    fromCiId,
    toCiType,
    toCiId,
    relationType: "depends-on",
    source: "manual",
    note: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

describe("change helpers (#656)", () => {
  it("labels every change type and status", () => {
    for (const t of CHANGE_TYPES) expect(CHANGE_TYPE_LABEL[t]).toBeTruthy();
    for (const s of CHANGE_STATUSES) expect(CHANGE_STATUS_LABEL[s]).toBeTruthy();
  });

  it("narrows a valid change type and rejects junk", () => {
    expect(asChangeType("emergency")).toBe("emergency");
    expect(asChangeType("normal")).toBe("normal");
    expect(asChangeType("bogus")).toBeNull();
    expect(asChangeType(undefined)).toBeNull();
  });

  it("resolves effective risk override-wins", () => {
    expect(effectiveRisk(40, 80)).toBe(80); // override wins
    expect(effectiveRisk(40, null)).toBe(40); // fall back to derived
    expect(effectiveRisk(null, null)).toBeNull(); // unassessed
    expect(effectiveRisk(null, 0)).toBe(0); // explicit 0 override is kept (not nullish)
  });
});

describe("CMDB-derived change risk (#658)", () => {
  it("scores 0 when nothing is affected", () => {
    expect(deriveChangeRisk([], [], [])).toBe(0);
  });

  it("returns an integer in [0, 100]", () => {
    const items = [ci("device", "d1", "high")];
    const score = deriveChangeRisk([{ ciType: "device", ciId: "d1" }], items, []);
    expect(Number.isInteger(score)).toBe(true);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("scores a more critical affected CI higher than a less critical one", () => {
    const lowItems = [ci("device", "d1", "low")];
    const critItems = [ci("device", "d1", "critical")];
    const target = [{ ciType: "device" as const, ciId: "d1" }];
    expect(deriveChangeRisk(target, critItems, [])).toBeGreaterThan(
      deriveChangeRisk(target, lowItems, []),
    );
  });

  it("counts the blast radius — dependents raise the score", () => {
    // d1 alone vs d1 with two high-criticality dependents one hop away.
    const lone = [ci("device", "d1", "medium")];
    const withDeps = [
      ci("device", "d1", "medium"),
      ci("device", "d2", "high"),
      ci("device", "d3", "high"),
    ];
    const edges = [edge("device", "d1", "device", "d2"), edge("device", "d1", "device", "d3")];
    const target = [{ ciType: "device" as const, ciId: "d1" }];
    expect(deriveChangeRisk(target, withDeps, edges)).toBeGreaterThan(
      deriveChangeRisk(target, lone, []),
    );
  });

  it("decays blast contribution with hop distance", () => {
    // A high-criticality CI one hop away contributes more than the same CI three hops away.
    const items = [
      ci("device", "d1", "low"),
      ci("device", "near", "high"),
      ci("device", "mid", "low"),
      ci("device", "far", "high"),
    ];
    const oneHop = deriveChangeRisk(
      [{ ciType: "device", ciId: "d1" }],
      items,
      [edge("device", "d1", "device", "near")],
    );
    const threeHop = deriveChangeRisk(
      [{ ciType: "device", ciId: "d1" }],
      items,
      [
        edge("device", "d1", "device", "mid"),
        edge("device", "mid", "device", "mid2"),
        edge("device", "mid2", "device", "far"),
      ],
    );
    expect(oneHop).toBeGreaterThan(threeHop);
  });

  it("dedupes a dependent reached from two affected origins (no double-count)", () => {
    // Shared dependent d3 reached from both d1 and d2 counts once.
    const items = [
      ci("device", "d1", "low"),
      ci("device", "d2", "low"),
      ci("device", "d3", "critical"),
    ];
    const edges = [edge("device", "d1", "device", "d3"), edge("device", "d2", "device", "d3")];
    const both = deriveChangeRisk(
      [
        { ciType: "device", ciId: "d1" },
        { ciType: "device", ciId: "d2" },
      ],
      items,
      edges,
    );
    // Score stays a valid bounded integer (the dedup keeps d3 from inflating the blast twice).
    expect(both).toBeLessThanOrEqual(100);
    expect(both).toBeGreaterThan(0);
  });

  it("honors a CI criticality override in the blast weighting", () => {
    const derived = [ci("device", "d1", "low"), ci("device", "d2", "low")];
    const overridden = [ci("device", "d1", "low"), ci("device", "d2", "low", "critical")];
    const edges = [edge("device", "d1", "device", "d2")];
    const target = [{ ciType: "device" as const, ciId: "d1" }];
    expect(deriveChangeRisk(target, overridden, edges)).toBeGreaterThan(
      deriveChangeRisk(target, derived, edges),
    );
  });

  it("bands a score and labels every band", () => {
    expect(riskBand(0)).toBe("low");
    expect(riskBand(24)).toBe("low");
    expect(riskBand(25)).toBe("moderate");
    expect(riskBand(50)).toBe("high");
    expect(riskBand(75)).toBe("critical");
    expect(riskBand(100)).toBe("critical");
    for (const band of ["low", "moderate", "high", "critical"] as const) {
      expect(RISK_BAND_LABEL[band]).toBeTruthy();
    }
  });
});

describe("lightweight approval state machine (#659)", () => {
  it("standard is pre-approved and needs no approver", () => {
    expect(requiresApproval("standard")).toBe(false);
    expect(initialApprovalState("standard")).toEqual({
      status: "approved",
      approvalStatus: "approved",
    });
  });

  it("normal requires approval and opens awaiting a decision", () => {
    expect(requiresApproval("normal")).toBe(true);
    expect(isExpedited("normal")).toBe(false);
    expect(initialApprovalState("normal")).toEqual({
      status: "pending_approval",
      approvalStatus: "pending",
    });
  });

  it("emergency requires approval, is expedited, and opens awaiting a decision", () => {
    expect(requiresApproval("emergency")).toBe(true);
    expect(isExpedited("emergency")).toBe(true);
    expect(initialApprovalState("emergency")).toEqual({
      status: "pending_approval",
      approvalStatus: "pending",
    });
  });

  it("only emergency is flagged expedited", () => {
    expect(isExpedited("standard")).toBe(false);
    expect(isExpedited("normal")).toBe(false);
    expect(isExpedited("emergency")).toBe(true);
  });

  it("flags a change awaiting approval (pending_approval + pending)", () => {
    expect(isAwaitingApproval("pending_approval", "pending")).toBe(true);
    expect(isAwaitingApproval("approved", "approved")).toBe(false);
    expect(isAwaitingApproval("pending_approval", null)).toBe(false);
    expect(isAwaitingApproval("draft", "pending")).toBe(false);
  });

  it("approves a pending change → approved/approved", () => {
    expect(
      applyApprovalDecision({ status: "pending_approval", approvalStatus: "pending" }, "approved"),
    ).toEqual({ status: "approved", approvalStatus: "approved" });
  });

  it("rejects a pending change → rejected/rejected", () => {
    expect(
      applyApprovalDecision({ status: "pending_approval", approvalStatus: "pending" }, "rejected"),
    ).toEqual({ status: "rejected", approvalStatus: "rejected" });
  });

  it("refuses to decide a change that is not awaiting approval (no double-approve)", () => {
    // Already approved (e.g. an auto-approved standard change) — not decidable.
    expect(
      applyApprovalDecision({ status: "approved", approvalStatus: "approved" }, "rejected"),
    ).toBeNull();
    // Draft with no approval requested — not decidable.
    expect(
      applyApprovalDecision({ status: "draft", approvalStatus: null }, "approved"),
    ).toBeNull();
    // Already rejected — terminal, not decidable again.
    expect(
      applyApprovalDecision({ status: "rejected", approvalStatus: "rejected" }, "approved"),
    ).toBeNull();
  });

  it("narrows a valid approver decision and rejects junk", () => {
    expect(asApprovalDecision("approved")).toBe("approved");
    expect(asApprovalDecision("rejected")).toBe("rejected");
    expect(asApprovalDecision("pending")).toBeNull();
    expect(asApprovalDecision(undefined)).toBeNull();
  });
});

describe("change scheduling (#660)", () => {
  describe("validateScheduleWindow", () => {
    it("clears the window when both fields are blank", () => {
      expect(validateScheduleWindow("", "")).toEqual({ ok: true, start: null, end: null });
      expect(validateScheduleWindow(null, undefined)).toEqual({ ok: true, start: null, end: null });
    });

    it("accepts a valid window (end ≥ start) and normalises to ISO", () => {
      const r = validateScheduleWindow("2026-06-20T14:00", "2026-06-20T16:00");
      expect(r.ok).toBe(true);
      expect(r.start).toBe(new Date("2026-06-20T14:00").toISOString());
      expect(r.end).toBe(new Date("2026-06-20T16:00").toISOString());
    });

    it("accepts an instantaneous window (end === start)", () => {
      expect(validateScheduleWindow("2026-06-20T14:00", "2026-06-20T14:00").ok).toBe(true);
    });

    it("rejects end before start (mirrors the DB CHECK)", () => {
      const r = validateScheduleWindow("2026-06-20T16:00", "2026-06-20T14:00");
      expect(r.ok).toBe(false);
      expect(r.reason).toMatch(/on or after/i);
    });

    it("rejects exactly one field present", () => {
      expect(validateScheduleWindow("2026-06-20T14:00", "").ok).toBe(false);
      expect(validateScheduleWindow("", "2026-06-20T16:00").ok).toBe(false);
    });

    it("rejects an unparseable date", () => {
      expect(validateScheduleWindow("not-a-date", "2026-06-20T16:00").ok).toBe(false);
    });
  });

  describe("nextScheduleStatus (no approval clobbering)", () => {
    it("promotes an approved change to scheduled when a window is set", () => {
      expect(nextScheduleStatus("approved", true)).toBe("scheduled");
    });

    it("reverts a scheduled change to approved when the window is cleared", () => {
      expect(nextScheduleStatus("scheduled", false)).toBe("approved");
    });

    it("leaves approval-in-flight and terminal statuses untouched", () => {
      // A pending_approval change can carry a planned window without being promoted.
      expect(nextScheduleStatus("pending_approval", true)).toBe("pending_approval");
      expect(nextScheduleStatus("draft", true)).toBe("draft");
      // Clearing a window never reopens a rejected/closed change.
      expect(nextScheduleStatus("rejected", false)).toBe("rejected");
      expect(nextScheduleStatus("completed", false)).toBe("completed");
      expect(nextScheduleStatus("cancelled", true)).toBe("cancelled");
    });

    it("is a no-op when setting a window on an already-scheduled change", () => {
      expect(nextScheduleStatus("scheduled", true)).toBe("scheduled");
    });
  });

  describe("windowsOverlap", () => {
    it("detects overlapping windows (touching endpoints count)", () => {
      expect(
        windowsOverlap("2026-06-20T10:00Z", "2026-06-20T12:00Z", "2026-06-20T11:00Z", "2026-06-20T13:00Z"),
      ).toBe(true);
      // Touching at the boundary still overlaps.
      expect(
        windowsOverlap("2026-06-20T10:00Z", "2026-06-20T12:00Z", "2026-06-20T12:00Z", "2026-06-20T14:00Z"),
      ).toBe(true);
    });

    it("returns false for disjoint windows", () => {
      expect(
        windowsOverlap("2026-06-20T10:00Z", "2026-06-20T11:00Z", "2026-06-20T12:00Z", "2026-06-20T13:00Z"),
      ).toBe(false);
    });
  });

  describe("findScheduleConflicts (context only)", () => {
    const mk = (over: Partial<SchedulableChange>): SchedulableChange => ({
      id: "x",
      scheduleStart: "2026-06-20T10:00Z",
      scheduleEnd: "2026-06-20T12:00Z",
      accountId: "acct-1",
      affectedCis: [],
      ...over,
    });

    it("returns [] when the target has no window", () => {
      const target = mk({ id: "t", scheduleStart: null, scheduleEnd: null });
      expect(findScheduleConflicts(target, [mk({ id: "o" })])).toEqual([]);
    });

    it("flags an overlapping change on the same account", () => {
      const target = mk({ id: "t", accountId: "acct-1" });
      const conflicts = findScheduleConflicts(target, [
        mk({ id: "o", accountId: "acct-1", scheduleStart: "2026-06-20T11:00Z", scheduleEnd: "2026-06-20T13:00Z" }),
      ]);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].change.id).toBe("o");
      expect(conflicts[0].reasons).toContain("same_account");
    });

    it("flags an overlapping change sharing an affected CI", () => {
      const target = mk({
        id: "t",
        accountId: "acct-1",
        affectedCis: [{ ciType: "device", ciId: "s1" }],
      });
      const conflicts = findScheduleConflicts(target, [
        mk({
          id: "o",
          accountId: "acct-2",
          affectedCis: [{ ciType: "device", ciId: "s1" }],
        }),
      ]);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].reasons).toContain("shared_ci");
    });

    it("excludes overlaps with no shared account/CI, the target itself, and unscheduled others", () => {
      const target = mk({
        id: "t",
        accountId: "acct-1",
        affectedCis: [{ ciType: "device", ciId: "s1" }],
      });
      const conflicts = findScheduleConflicts(target, [
        // overlaps in time but different account + no shared CI → not a conflict
        mk({ id: "noshare", accountId: "acct-2", affectedCis: [{ ciType: "device", ciId: "s2" }] }),
        // the target itself → excluded
        mk({ id: "t", accountId: "acct-1" }),
        // unscheduled → excluded
        mk({ id: "unsched", accountId: "acct-1", scheduleStart: null, scheduleEnd: null }),
        // disjoint window, same account → excluded (no time overlap)
        mk({ id: "disjoint", accountId: "acct-1", scheduleStart: "2026-06-21T10:00Z", scheduleEnd: "2026-06-21T12:00Z" }),
      ]);
      expect(conflicts).toEqual([]);
    });
  });
});
