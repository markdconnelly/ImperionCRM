// Pure-logic suite for the eval CI quality gate (ADR-0106, epic #983 slice 4 / #988).
//
// Asserts the gate verdict + suite-selection logic in CI with NO backend. The live HTTP
// runner is guarded on AGENT_EVAL_BASE_URL and not exercised here (same pattern as
// agent-quality-eval.test.mjs).

import { describe, it, expect } from "vitest";
import { evaluateEvalGate, parseSuites, loadBaselines } from "./eval-gate.mjs";

const BASELINES = { tolerance: 0.05, suites: { reporting: 0.75, sales: 0.75, crm: 0.75 } };

describe("evaluateEvalGate", () => {
  it("passes when every suite is at/above baseline", () => {
    const r = evaluateEvalGate({
      results: [
        { suite: "reporting", aggregateScore: 0.9 },
        { suite: "sales", aggregateScore: 0.75 },
      ],
      baselines: BASELINES,
    });
    expect(r.ok).toBe(true);
    expect(r.checked).toBe(2);
    expect(r.failures).toEqual([]);
  });

  it("allows a dip within the tolerance band", () => {
    // 0.71 >= 0.75 - 0.05 → pass
    const r = evaluateEvalGate({ results: [{ suite: "crm", aggregateScore: 0.71 }], baselines: BASELINES });
    expect(r.ok).toBe(true);
  });

  it("fails a regression beyond the tolerance band", () => {
    const r = evaluateEvalGate({ results: [{ suite: "sales", aggregateScore: 0.6 }], baselines: BASELINES });
    expect(r.ok).toBe(false);
    expect(r.failures[0].suite).toBe("sales");
    expect(r.failures[0].reason).toContain("baseline");
  });

  it("fails (never silently passes) a suite with no committed baseline", () => {
    const r = evaluateEvalGate({ results: [{ suite: "mystery", aggregateScore: 0.99 }], baselines: BASELINES });
    expect(r.ok).toBe(false);
    expect(r.failures[0].reason).toBe("no committed baseline");
  });

  it("fails a suite that returned no aggregate score", () => {
    const r = evaluateEvalGate({ results: [{ suite: "reporting", aggregateScore: NaN }], baselines: BASELINES });
    expect(r.ok).toBe(false);
    expect(r.failures[0].reason).toBe("no aggregate score returned");
  });

  it("honors an explicit tolerance override", () => {
    const r = evaluateEvalGate({
      results: [{ suite: "crm", aggregateScore: 0.7 }],
      baselines: BASELINES,
      tolerance: 0,
    });
    expect(r.ok).toBe(false); // 0.70 < 0.75 - 0 → fail
  });
});

describe("parseSuites", () => {
  it("defaults to the baselined suites when env is empty", () => {
    expect(parseSuites(undefined, BASELINES).sort()).toEqual(["crm", "reporting", "sales"]);
  });
  it("splits a comma/space list from env", () => {
    expect(parseSuites("reporting, sales  crm", BASELINES)).toEqual(["reporting", "sales", "crm"]);
  });
});

describe("loadBaselines", () => {
  it("loads the committed eval/baselines.json with the expected shape", () => {
    const b = loadBaselines();
    expect(typeof b.suites).toBe("object");
    expect(typeof b.suites.reporting).toBe("number");
    expect(b.tolerance).toBeGreaterThan(0);
  });
});
