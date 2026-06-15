import { describe, expect, it } from "vitest";
import {
  DEFAULT_WIN_PROBABILITY,
  FORECAST_CATEGORIES,
  effectiveCategory,
  effectiveWinProbability,
  summariseForecast,
  weightedValue,
} from "./forecast";
import type { OpportunityForecastRow } from "@/types";

// A forecast row factory — only the fields the roll-up reads need be realistic.
function row(over: Partial<OpportunityForecastRow>): OpportunityForecastRow {
  return {
    id: "o",
    name: "Deal",
    account: "Acme",
    stage: "qualified",
    dealValue: 1000,
    expectedCloseDate: "2026-07-15",
    winProbability: 0.3,
    forecastCategory: null,
    weighted: 300,
    ...over,
  };
}

describe("effectiveWinProbability (ADR-0072 decision 1)", () => {
  it("uses the per-stage default when there is no override", () => {
    expect(effectiveWinProbability("lead", null)).toBe(DEFAULT_WIN_PROBABILITY.lead);
    expect(effectiveWinProbability("proposal", undefined)).toBe(0.6);
  });

  it("prefers the owner override over the stage default", () => {
    expect(effectiveWinProbability("lead", 0.85)).toBe(0.85);
  });

  it("clamps an out-of-range override to [0,1]", () => {
    expect(effectiveWinProbability("lead", 1.4)).toBe(1);
    expect(effectiveWinProbability("lead", -0.2)).toBe(0);
  });

  it("falls back for an unrecognised (user-defined) stage", () => {
    expect(effectiveWinProbability("custom-stage", null)).toBe(0.1);
  });
});

describe("weightedValue", () => {
  it("multiplies deal value by probability", () => {
    expect(weightedValue(2000, 0.6)).toBe(1200);
  });
});

describe("effectiveCategory", () => {
  it("treats NULL as pipeline (conservative default)", () => {
    expect(effectiveCategory(null)).toBe("pipeline");
    expect(effectiveCategory(undefined)).toBe("pipeline");
  });
  it("passes an explicit category through", () => {
    expect(effectiveCategory("commit")).toBe("commit");
  });
  it("lists the four ADR-0072 categories", () => {
    expect(FORECAST_CATEGORIES).toEqual(["commit", "best_case", "pipeline", "omitted"]);
  });
});

describe("summariseForecast (ADR-0072 decisions 3 + 4)", () => {
  it("weights open deals, buckets by category, and counts the realised floor", () => {
    const rows: OpportunityForecastRow[] = [
      row({ id: "c", forecastCategory: "commit", dealValue: 1000, winProbability: 0.9, weighted: 900 }),
      row({ id: "b", forecastCategory: "best_case", dealValue: 2000, winProbability: 0.5, weighted: 1000 }),
      row({ id: "p", forecastCategory: null, dealValue: 500, winProbability: 0.3, weighted: 150 }), // null → pipeline
      row({ id: "w", stage: "won", dealValue: 3000 }), // realised floor
    ];
    const s = summariseForecast(rows, 10000);
    expect(s.commitTotal).toBe(1000);
    expect(s.bestCaseTotal).toBe(2000);
    expect(s.pipelineTotal).toBe(500);
    expect(s.weighted).toBe(0.9 * 1000 + 0.5 * 2000 + 0.3 * 500); // 2050
    expect(s.closedWon).toBe(3000);
    expect(s.openCount).toBe(3);
    expect(s.quota).toBe(10000);
    expect(s.attainment).toBeCloseTo(0.3); // 3000 / 10000
  });

  it("excludes omitted and lost deals from the forecast entirely", () => {
    const rows: OpportunityForecastRow[] = [
      row({ id: "o", forecastCategory: "omitted", dealValue: 9999, weighted: 9999 }),
      row({ id: "l", stage: "lost", dealValue: 8888 }),
      row({ id: "p", forecastCategory: "pipeline", dealValue: 100, winProbability: 0.3, weighted: 30 }),
    ];
    const s = summariseForecast(rows);
    expect(s.weighted).toBe(30);
    expect(s.pipelineTotal).toBe(100);
    expect(s.commitTotal).toBe(0);
    expect(s.closedWon).toBe(0);
    expect(s.openCount).toBe(1);
  });

  it("returns null attainment when there is no quota (or a zero quota)", () => {
    const rows = [row({ stage: "won", dealValue: 500 })];
    expect(summariseForecast(rows, null).attainment).toBeNull();
    expect(summariseForecast(rows, 0).attainment).toBeNull();
  });
});
