import { describe, expect, it } from "vitest";
import { mapTuningCandidateRow, statusTone } from "./tuning-candidates";

/** Pure DB-shape → render-row mapper behind the tuning-candidate cockpit (#1037, ADR-0119). */
describe("mapTuningCandidateRow", () => {
  const base = {
    id: "tc-1",
    kind: "prompt",
    module: "sales",
    title: "Tighten refusal",
    rationale: "eval scored 0.61 < 0.75",
    status: "open",
    external_ref: null,
    created_at: "2026-06-21T09:00:00Z",
  };

  it("maps a candidate and normalizes the timestamp to ISO", () => {
    expect(mapTuningCandidateRow(base)).toEqual({
      id: "tc-1",
      kind: "prompt",
      module: "sales",
      title: "Tighten refusal",
      rationale: "eval scored 0.61 < 0.75",
      status: "open",
      externalRef: null,
      createdAt: "2026-06-21T09:00:00.000Z",
    });
  });

  it("fails safe on an unknown kind/status enum", () => {
    const r = mapTuningCandidateRow({ ...base, kind: "weird", status: "bogus" });
    expect(r.kind).toBe("prompt");
    expect(r.status).toBe("open");
  });
});

describe("statusTone", () => {
  it("greens applied/accepted, ambers open, dims rejected", () => {
    expect(statusTone("applied")).toBe("text-green");
    expect(statusTone("accepted")).toBe("text-green");
    expect(statusTone("open")).toBe("text-amber");
    expect(statusTone("rejected")).toBe("text-dim");
  });
});
