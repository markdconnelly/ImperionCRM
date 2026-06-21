import { describe, expect, it } from "vitest";
import { mapEvalRunRow } from "./eval-runs";

/** Pure DB-shape → render-row mapper behind the eval dashboard (#986). */
describe("mapEvalRunRow", () => {
  const base = {
    id: "run-1",
    suite: "sales",
    status: "passed",
    case_count: 3,
    aggregate_score: 0.91,
    triggered_by: "ci",
    started_at: "2026-06-20T06:00:00Z",
    finished_at: "2026-06-20T06:01:00Z",
  };

  it("maps a completed run and normalizes timestamps to ISO", () => {
    const r = mapEvalRunRow(base);
    expect(r).toEqual({
      id: "run-1",
      suite: "sales",
      status: "passed",
      caseCount: 3,
      aggregateScore: 0.91,
      triggeredBy: "ci",
      startedAt: "2026-06-20T06:00:00.000Z",
      finishedAt: "2026-06-20T06:01:00.000Z",
    });
  });

  it("coerces numeric strings (pg numeric/bigint come back as strings)", () => {
    const r = mapEvalRunRow({ ...base, case_count: "5", aggregate_score: "0.42" });
    expect(r.caseCount).toBe(5);
    expect(r.aggregateScore).toBeCloseTo(0.42);
  });

  it("keeps a null aggregate/finished for an in-flight run", () => {
    const r = mapEvalRunRow({ ...base, status: "running", aggregate_score: null, finished_at: null });
    expect(r.aggregateScore).toBeNull();
    expect(r.finishedAt).toBeNull();
  });

  it("treats an unparseable score as null rather than NaN", () => {
    const r = mapEvalRunRow({ ...base, aggregate_score: "not-a-number" });
    expect(r.aggregateScore).toBeNull();
  });
});
