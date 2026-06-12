import { describe, expect, it } from "vitest";
import {
  entityHref,
  formatTokens,
  monthLabel,
  parseMonthParam,
  previousMonth,
  processEntityNoun,
  processLabel,
} from "./cost-rollup";

/** Pure presentation helpers behind the cost-rollup card (#184). */

describe("processLabel / processEntityNoun", () => {
  it("maps the metered processes the backend ships today", () => {
    expect(processLabel("agent.turn")).toBe("Orchestrator turns");
    expect(processLabel("board.conclude")).toBe("Board sessions");
    expect(processEntityNoun("agent.turn", "agent_conversation")).toBe("conversation");
    expect(processEntityNoun("board.conclude", "board_session")).toBe("board session");
  });

  it("renders unknown future processes as-is — new executors appear without a code change", () => {
    expect(processLabel("workflow.execute")).toBe("workflow.execute");
    expect(processEntityNoun("workflow.execute", "workflow_enrollment")).toBe(
      "workflow_enrollment",
    );
    expect(processEntityNoun("workflow.execute", null)).toBe("entity");
  });
});

describe("entityHref", () => {
  it("links board sessions to their transcript page", () => {
    expect(entityHref("board_session", "abc-123")).toBe("/board/abc-123");
  });

  it("returns null for entity kinds without a page", () => {
    expect(entityHref("agent_conversation", "c1")).toBeNull();
    expect(entityHref(null, "x")).toBeNull();
  });
});

describe("formatTokens", () => {
  it("compacts token counts", () => {
    expect(formatTokens(0)).toBe("0");
    expect(formatTokens(999)).toBe("999");
    expect(formatTokens(12_400)).toBe("12.4k");
    expect(formatTokens(1_000)).toBe("1k");
    expect(formatTokens(2_500_000)).toBe("2.5M");
  });

  it("never renders garbage for bad input", () => {
    expect(formatTokens(Number.NaN)).toBe("0");
    expect(formatTokens(-5)).toBe("0");
  });
});

describe("month helpers", () => {
  it("accepts only YYYY-MM query values", () => {
    expect(parseMonthParam("2026-06")).toBe("2026-06");
    expect(parseMonthParam("2026-13")).toBeUndefined();
    expect(parseMonthParam("06-2026")).toBeUndefined();
    expect(parseMonthParam(["2026-06"])).toBeUndefined();
    expect(parseMonthParam(undefined)).toBeUndefined();
  });

  it("steps back a month, across year boundaries", () => {
    expect(previousMonth("2026-06")).toBe("2026-05");
    expect(previousMonth("2026-01")).toBe("2025-12");
  });

  it("labels months for humans", () => {
    expect(monthLabel("2026-06")).toBe("June 2026");
    expect(monthLabel("2025-12")).toBe("December 2025");
  });
});
