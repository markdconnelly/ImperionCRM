import { describe, expect, it } from "vitest";
import {
  DEFAULT_DQ_SLA,
  evaluateDqGate,
  gateDispatchOnDataQuality,
  slaForClass,
  type DqSla,
  type RecordDataQuality,
} from "./data-quality-gate";
import type { DispatchResolution } from "./action-dispatch";

/**
 * Pins the DQ-SLA autonomy gate (#1113, epic #1049 pillar 3): a stale/incomplete record can only
 * ever ROUTE an action to the human cockpit, never raise autonomy. Mirrors the SQL
 * `entity_dq_gate()` (migration 0194) + `gateDispatchOnDataQuality` as the third dispatch gate.
 * The backend enforces; this is the FE half — the two must agree.
 */

/** A measured-quality builder so cases read as data. */
function quality(ageSeconds: number | null, completeness: number | null): RecordDataQuality {
  return { ageSeconds, completeness };
}

/** A minimal DispatchResolution stub carrying just the fields the DQ gate composes with. */
function resolution(actionClass: string, decision: DispatchResolution["decision"]): DispatchResolution {
  return {
    agentKey: "felix",
    actionClass,
    tier: "T2",
    cataloged: true,
    resolvedLevel: 3,
    resolvedCeiling: "T2",
    earnedTier: null,
    effectiveCeiling: "T2",
    hardGated: false,
    matchedDial: null,
    decision,
    routesToCockpit: decision === "cockpit",
  };
}

describe("slaForClass — resolution + fail-closed unknown", () => {
  it("resolves the seeded SLA for a known class", () => {
    expect(slaForClass("operational")).toEqual(DEFAULT_DQ_SLA.operational);
  });
  it("returns null for an unknown class (fail-closed)", () => {
    expect(slaForClass("not_a_class")).toBeNull();
  });
  it("uses an injected SLA map over the default", () => {
    const map: Record<string, DqSla> = { operational: { maxAgeSeconds: 10, minCompleteness: 0.5 } };
    expect(slaForClass("operational", map)?.maxAgeSeconds).toBe(10);
  });
});

describe("evaluateDqGate — freshness + completeness thresholds", () => {
  it("passes a fresh, complete operational record", () => {
    const r = evaluateDqGate("operational", quality(100, 1.0));
    expect(r.meetsSla).toBe(true);
    expect(r.reason).toBe("fresh_and_complete");
  });

  it("passes exactly at the boundary (age == max, completeness == min)", () => {
    const sla = DEFAULT_DQ_SLA.operational;
    const r = evaluateDqGate("operational", quality(sla.maxAgeSeconds, sla.minCompleteness));
    expect(r.meetsSla).toBe(true);
  });

  it("fails a stale record (age over the SLA) and names 'stale'", () => {
    const r = evaluateDqGate("operational", quality(DEFAULT_DQ_SLA.operational.maxAgeSeconds + 1, 1.0));
    expect(r.meetsSla).toBe(false);
    expect(r.reason).toBe("stale");
  });

  it("fails an incomplete record (completeness below the SLA) and names 'incomplete'", () => {
    const r = evaluateDqGate("operational", quality(10, 0.5));
    expect(r.meetsSla).toBe(false);
    expect(r.reason).toBe("incomplete");
  });

  it("reports staleness before incompleteness when both breach (deterministic reason)", () => {
    const r = evaluateDqGate("operational", quality(DEFAULT_DQ_SLA.operational.maxAgeSeconds + 1, 0.0));
    expect(r.reason).toBe("stale");
  });

  it("fails closed on an unknown class", () => {
    const r = evaluateDqGate("not_a_class", quality(0, 1.0));
    expect(r.meetsSla).toBe(false);
    expect(r.reason).toBe("unknown");
    expect(r.sla).toBeNull();
  });

  it("fails closed on a null age (unknown freshness)", () => {
    const r = evaluateDqGate("operational", quality(null, 1.0));
    expect(r.meetsSla).toBe(false);
    expect(r.reason).toBe("unknown");
  });

  it("fails closed on a null completeness", () => {
    const r = evaluateDqGate("operational", quality(10, null));
    expect(r.meetsSla).toBe(false);
    expect(r.reason).toBe("unknown");
  });

  it("always-gate classes carry the tightest SLA (full completeness, short freshness)", () => {
    // 1.0 completeness demanded — 0.999 is a breach for financial.
    expect(evaluateDqGate("financial", quality(10, 0.999)).meetsSla).toBe(false);
    expect(evaluateDqGate("financial", quality(10, 1.0)).meetsSla).toBe(true);
    // 1h freshness — 2h-old financial data is stale.
    expect(evaluateDqGate("financial", quality(7200, 1.0)).reason).toBe("stale");
  });
});

describe("gateDispatchOnDataQuality — the third dispatch gate (one-way clamp to cockpit)", () => {
  it("forces cockpit when the action class is unknown (fail-closed), even DQ-clean", () => {
    // An action whose class is not a known data_class has no SLA → fail-closed → cockpit.
    const r = gateDispatchOnDataQuality(resolution("update_ticket", "execute"), quality(10, 1.0));
    expect(r.dq.reason).toBe("unknown");
    expect(r.gatedDecision).toBe("cockpit");
    expect(r.dqRoutedToCockpit).toBe(true);
  });

  it("keeps 'execute' when the class is known and the record meets SLA", () => {
    const r = gateDispatchOnDataQuality(resolution("operational", "execute"), quality(10, 1.0));
    expect(r.dq.meetsSla).toBe(true);
    expect(r.gatedDecision).toBe("execute");
    expect(r.dqRoutedToCockpit).toBe(false);
  });

  it("downgrades 'execute' to 'cockpit' on a stale record", () => {
    const r = gateDispatchOnDataQuality(
      resolution("operational", "execute"),
      quality(DEFAULT_DQ_SLA.operational.maxAgeSeconds + 1, 1.0),
    );
    expect(r.gatedDecision).toBe("cockpit");
    expect(r.dqRoutedToCockpit).toBe(true);
    expect(r.dq.reason).toBe("stale");
  });

  it("downgrades 'execute_notify' to 'cockpit' on an incomplete record", () => {
    const r = gateDispatchOnDataQuality(resolution("operational", "execute_notify"), quality(10, 0.1));
    expect(r.gatedDecision).toBe("cockpit");
    expect(r.dqRoutedToCockpit).toBe(true);
  });

  it("never RAISES autonomy: an already-cockpit decision stays cockpit even when DQ-clean", () => {
    const r = gateDispatchOnDataQuality(resolution("operational", "cockpit"), quality(10, 1.0));
    expect(r.gatedDecision).toBe("cockpit");
    // It was already cockpit for non-DQ reasons, so the DQ gate did not do the routing.
    expect(r.dqRoutedToCockpit).toBe(false);
  });

  it("preserves the underlying resolution fields (additive composition)", () => {
    const base = resolution("operational", "execute");
    const r = gateDispatchOnDataQuality(base, quality(10, 1.0));
    expect(r.agentKey).toBe(base.agentKey);
    expect(r.tier).toBe(base.tier);
    expect(r.resolvedLevel).toBe(base.resolvedLevel);
    expect(r.decision).toBe(base.decision); // inner decision untouched
  });
});
