import { describe, expect, it } from "vitest";
import { buildForecastView, forecastableCount, CATEGORY_LABEL } from "./forecast-view";
import type { OpportunityForecastRow, QuotaRow } from "@/types";

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

function quota(over: Partial<QuotaRow>): QuotaRow {
  return {
    id: "q",
    ownerUserId: null,
    ownerName: null,
    team: "Sales",
    periodStart: "2026-07-01",
    periodEnd: "2026-09-30",
    amount: 10000,
    ...over,
  };
}

describe("buildForecastView — category rollup (ADR-0072 decision 3)", () => {
  const rows: OpportunityForecastRow[] = [
    row({ id: "c1", forecastCategory: "commit", dealValue: 1000, winProbability: 0.9, weighted: 900 }),
    row({ id: "c2", forecastCategory: "commit", dealValue: 500, winProbability: 0.8, weighted: 400 }),
    row({ id: "b", forecastCategory: "best_case", dealValue: 2000, winProbability: 0.5, weighted: 1000 }),
    row({ id: "p", forecastCategory: null, dealValue: 800, winProbability: 0.3, weighted: 240 }), // → pipeline
  ];

  it("counts deals and sums per band", () => {
    const view = buildForecastView(rows, []);
    const [commit, bestCase, pipeline] = view.rollup;
    expect(commit.dealCount).toBe(2);
    expect(commit.total).toBe(1500);
    expect(bestCase.dealCount).toBe(1);
    expect(bestCase.total).toBe(2000);
    expect(pipeline.dealCount).toBe(1);
    expect(pipeline.total).toBe(800);
  });

  it("builds the cumulative ladder commit ⊆ +best_case ⊆ +pipeline", () => {
    const view = buildForecastView(rows, []);
    expect(view.rollup[0].cumulative).toBe(1500); // commit
    expect(view.rollup[1].cumulative).toBe(3500); // + best_case
    expect(view.rollup[2].cumulative).toBe(4300); // + pipeline
  });

  it("labels the bands for display", () => {
    const view = buildForecastView(rows, []);
    expect(view.rollup.map((b) => b.label)).toEqual(["Commit", "Best case", "Pipeline"]);
    expect(CATEGORY_LABEL.omitted).toBe("Omitted");
  });
});

describe("buildForecastView — omitted + closed deals", () => {
  it("tallies omitted separately and excludes lost/won from the bands", () => {
    const view = buildForecastView(
      [
        row({ id: "om", forecastCategory: "omitted", dealValue: 5000 }),
        row({ id: "lost", stage: "lost", dealValue: 9999 }),
        row({ id: "won", stage: "won", dealValue: 3000 }),
        row({ id: "p", forecastCategory: "pipeline", dealValue: 200, winProbability: 0.3, weighted: 60 }),
      ],
      [],
    );
    expect(view.omittedCount).toBe(1);
    expect(view.omittedValue).toBe(5000);
    expect(view.summary.closedWon).toBe(3000);
    expect(view.rollup.find((b) => b.category === "pipeline")?.total).toBe(200);
    // omitted/lost/won contribute nothing to the bands
    expect(view.rollup.find((b) => b.category === "commit")?.total).toBe(0);
  });
});

describe("buildForecastView — attainment vs quota (ADR-0072 decision 4)", () => {
  it("computes attainment per quota target from closed-won", () => {
    const rows = [row({ id: "won", stage: "won", dealValue: 4000 })];
    const view = buildForecastView(rows, [
      quota({ id: "qa", amount: 10000, team: "Sales" }),
      quota({ id: "qb", amount: 0, team: "SMB" }),
    ]);
    expect(view.totalQuota).toBe(10000);
    const a = view.attainment.find((r) => r.quotaId === "qa")!;
    expect(a.scope).toBe("team");
    expect(a.closedWon).toBe(4000);
    expect(a.attainment).toBeCloseTo(0.4);
    // zero-quota target → null attainment, never a divide-by-zero
    expect(view.attainment.find((r) => r.quotaId === "qb")?.attainment).toBeNull();
  });

  it("uses the owner name as the target for an owner-scoped quota", () => {
    const view = buildForecastView(
      [],
      [quota({ id: "qo", team: null, ownerUserId: "u1", ownerName: "Avery Chen", amount: 5000 })],
    );
    expect(view.attainment[0].scope).toBe("owner");
    expect(view.attainment[0].target).toBe("Avery Chen");
  });

  it("headline attainment uses the summed quota", () => {
    const rows = [row({ id: "won", stage: "won", dealValue: 6000 })];
    const view = buildForecastView(rows, [
      quota({ id: "q1", amount: 8000 }),
      quota({ id: "q2", amount: 4000 }),
    ]);
    expect(view.summary.quota).toBe(12000);
    expect(view.summary.attainment).toBeCloseTo(0.5);
  });
});

describe("forecastableCount", () => {
  it("counts open, non-omitted deals only", () => {
    const rows = [
      row({ id: "a", forecastCategory: "commit" }),
      row({ id: "b", forecastCategory: "omitted" }),
      row({ id: "w", stage: "won" }),
      row({ id: "l", stage: "lost" }),
      row({ id: "p", forecastCategory: null }),
    ];
    expect(forecastableCount(rows)).toBe(2); // commit + null(→pipeline)
  });
});
