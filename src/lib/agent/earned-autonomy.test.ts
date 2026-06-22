import { describe, expect, it } from "vitest";
import {
  applyOutcome,
  clampCeilingForClass,
  earnedExecutesInline,
  emptyEarnedRecord,
  maxTier,
  nextTierUp,
  summarizeTrackRecord,
  DEFAULT_PROMOTE_THRESHOLD,
  type EarnedRecord,
  type RunOutcome,
} from "./earned-autonomy";

/**
 * Pins the earned / graduated autonomy engine (#1036, ADR-01XX): promote on a clean record,
 * INSTANT demote on a miss, and the HARD CEILING invariant — an always-gate class (#1034 /
 * ADR-0118) NEVER receives the earned raise regardless of track record. The backend mirrors
 * this pure logic (repos don't share code, ADR-0042); the two must agree.
 */

const rec = (over: Partial<EarnedRecord> = {}): EarnedRecord => ({
  ...emptyEarnedRecord("sales", "update_ticket"),
  ...over,
});

const clean: RunOutcome = { miss: false, approved: true, evalScore: 0.9, at: "2026-06-22T00:00:00Z" };
const missOutcome: RunOutcome = { miss: true, approved: false, at: "2026-06-22T00:00:00Z" };

describe("tier math", () => {
  it("nextTierUp steps one tier, null starts below T0", () => {
    expect(nextTierUp(null)).toBe("T0");
    expect(nextTierUp("T0")).toBe("T1");
    expect(nextTierUp("T2")).toBe("T3");
    expect(nextTierUp("T3")).toBeNull(); // already at the top
  });
  it("maxTier never lowers (null treated as below T0)", () => {
    expect(maxTier("T2", null)).toBe("T2");
    expect(maxTier(null, "T1")).toBe("T1");
    expect(maxTier("T0", "T3")).toBe("T3");
    expect(maxTier(null, null)).toBeNull();
  });
});

describe("promotion on a clean record", () => {
  it("advances the streak without promoting until the threshold is met", () => {
    let r = rec();
    for (let i = 1; i < DEFAULT_PROMOTE_THRESHOLD; i++) {
      r = applyOutcome(r, clean);
      expect(r.earnedTier).toBeNull();
      expect(r.cleanStreak).toBe(i);
    }
    // The Nth clean approval steps up one tier and resets the streak.
    r = applyOutcome(r, clean);
    expect(r.earnedTier).toBe("T0");
    expect(r.cleanStreak).toBe(0);
    expect(r.lastTransition?.kind).toBe("promote");
    expect(r.lastTransition?.to).toBe("T0");
  });

  it("steps up one tier at a time across thresholds (T0 → T1)", () => {
    let r = rec({ promoteThreshold: 2 });
    r = applyOutcome(applyOutcome(r, clean), clean); // → T0
    expect(r.earnedTier).toBe("T0");
    r = applyOutcome(applyOutcome(r, clean), clean); // → T1
    expect(r.earnedTier).toBe("T1");
    expect(r.lastTransition?.from).toBe("T0");
    expect(r.lastTransition?.to).toBe("T1");
  });

  it("a low-scored approval does NOT advance the streak (no progress, no demote)", () => {
    const r = applyOutcome(rec(), { miss: false, approved: true, evalScore: 0.6 });
    expect(r.cleanStreak).toBe(0);
    expect(r.earnedTier).toBeNull();
    expect(r.lastTransition).toBeNull();
  });

  it("an unscored approval does NOT advance the streak", () => {
    const r = applyOutcome(rec(), { miss: false, approved: true });
    expect(r.cleanStreak).toBe(0);
  });

  it("does not promote above T3 and stops ledgering noise at the top", () => {
    let r = rec({ earnedTier: "T3", promoteThreshold: 1 });
    r = applyOutcome(r, clean);
    expect(r.earnedTier).toBe("T3");
    expect(r.lastTransition).toBeNull(); // no spurious promote transition at the ceiling
  });
});

describe("INSTANT demotion on a miss", () => {
  it("a single miss resets a built-up earned tier to the dial floor", () => {
    const r = applyOutcome(rec({ earnedTier: "T2", cleanStreak: 3 }), missOutcome);
    expect(r.earnedTier).toBeNull();
    expect(r.cleanStreak).toBe(0);
    expect(r.lastTransition?.kind).toBe("demote");
    expect(r.lastTransition?.from).toBe("T2");
    expect(r.lastTransition?.to).toBeNull();
  });

  it("a miss at the floor is a no-op (no ledger noise)", () => {
    const r = applyOutcome(rec(), missOutcome);
    expect(r.earnedTier).toBeNull();
    expect(r.lastTransition).toBeNull();
  });

  it("a miss wins even if the run was somehow also 'approved'", () => {
    const r = applyOutcome(rec({ earnedTier: "T1" }), { miss: true, approved: true, evalScore: 0.99 });
    expect(r.earnedTier).toBeNull();
    expect(r.lastTransition?.kind).toBe("demote");
  });
});

describe("HARD CEILING invariant — always-gate classes never receive the earned raise", () => {
  it("discards the earned raise for financial / security_credentials / client_pii", () => {
    for (const cls of ["financial", "security_credentials", "client_pii"]) {
      const { effectiveCeiling, hardGated } = clampCeilingForClass({
        dialCeiling: "T0",
        earnedTier: "T3", // a maxed-out track record
        dataClass: cls,
      });
      expect(hardGated).toBe(true);
      expect(effectiveCeiling).toBe("T0"); // earned T3 DISCARDED — dial floor alone
    }
  });

  it("RAISES the ceiling for a non-always-gate class (operational)", () => {
    const { effectiveCeiling, hardGated } = clampCeilingForClass({
      dialCeiling: "T0",
      earnedTier: "T2",
      dataClass: "operational",
    });
    expect(hardGated).toBe(false);
    expect(effectiveCeiling).toBe("T2"); // earned raise applied
  });

  it("treats an UNKNOWN class as hard-gated (fail-closed — no earned raise)", () => {
    const { effectiveCeiling, hardGated } = clampCeilingForClass({
      dialCeiling: "T0",
      earnedTier: "T3",
      dataClass: "totally_unknown_class",
    });
    expect(hardGated).toBe(true);
    expect(effectiveCeiling).toBe("T0");
  });

  it("summarizeTrackRecord renders a PII-free cockpit line (#1014)", () => {
    expect(summarizeTrackRecord(rec())).toContain("Dial floor");
    const promoted = applyOutcome(
      applyOutcome(rec({ promoteThreshold: 2 }), clean),
      clean,
    );
    const line = summarizeTrackRecord(promoted);
    expect(line).toContain("Earned T0");
    expect(line).toContain("toward next");
    expect(line).toContain("promote");
  });

  it("earnedExecutesInline honors the effective ceiling (hard ceiling already baked in)", () => {
    // A T2 always-gate action with dial T0: earned raise discarded → effective T0 → cannot run.
    const gated = clampCeilingForClass({ dialCeiling: "T0", earnedTier: "T3", dataClass: "client_pii" });
    expect(earnedExecutesInline({ tier: "T2", ...gated })).toBe(false);
    // A T2 operational action with dial T0 + earned T2: effective T2 → runs.
    const open = clampCeilingForClass({ dialCeiling: "T0", earnedTier: "T2", dataClass: "operational" });
    expect(earnedExecutesInline({ tier: "T2", ...open })).toBe(true);
  });
});
