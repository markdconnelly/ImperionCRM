import { describe, expect, it } from "vitest";
import {
  AGENT_PRESETS,
  PRESET_META,
  PRESET_MODELS,
  budgetProgress,
  formatUsd,
  isAgentPreset,
  modelShortName,
  parseBudgetInput,
} from "./settings";

describe("isAgentPreset", () => {
  it("accepts the three presets", () => {
    for (const p of AGENT_PRESETS) expect(isAgentPreset(p)).toBe(true);
  });
  it("rejects everything else", () => {
    expect(isAgentPreset("turbo")).toBe(false);
    expect(isAgentPreset("")).toBe(false);
    expect(isAgentPreset(undefined)).toBe(false);
    expect(isAgentPreset(42)).toBe(false);
  });
});

describe("preset catalog", () => {
  it("has models and meta for every preset", () => {
    for (const p of AGENT_PRESETS) {
      expect(PRESET_MODELS[p].cheap).toMatch(/^claude-/);
      expect(PRESET_MODELS[p].premium).toMatch(/^claude-/);
      expect(PRESET_META[p].label.length).toBeGreaterThan(0);
    }
  });
});

describe("modelShortName", () => {
  it("shortens dated and undated claude ids", () => {
    expect(modelShortName("claude-haiku-4-5-20251001")).toBe("Haiku 4.5");
    expect(modelShortName("claude-sonnet-4-6")).toBe("Sonnet 4.6");
    expect(modelShortName("claude-opus-4-8")).toBe("Opus 4.8");
  });
  it("passes through unknown ids", () => {
    expect(modelShortName("gpt-x")).toBe("gpt-x");
  });
});

describe("parseBudgetInput", () => {
  it("blank means no cap (null)", () => {
    expect(parseBudgetInput("")).toEqual({ ok: true, value: null });
    expect(parseBudgetInput("   ")).toEqual({ ok: true, value: null });
  });
  it("parses plain and money-formatted amounts, rounding to cents", () => {
    expect(parseBudgetInput("250")).toEqual({ ok: true, value: 250 });
    expect(parseBudgetInput("$1,250.505")).toEqual({ ok: true, value: 1250.51 });
    expect(parseBudgetInput("0")).toEqual({ ok: true, value: 0 });
  });
  it("rejects negatives and non-numbers", () => {
    expect(parseBudgetInput("-5").ok).toBe(false);
    expect(parseBudgetInput("abc").ok).toBe(false);
    expect(parseBudgetInput("1e999").ok).toBe(false); // Infinity
  });
});

describe("budgetProgress", () => {
  it("null pct when no budget is set or budget is zero", () => {
    expect(budgetProgress(10, null)).toEqual({ pct: null, tone: "green" });
    expect(budgetProgress(10, 0)).toEqual({ pct: null, tone: "green" });
  });
  it("green below 80%, amber from 80%, red at the ceiling", () => {
    expect(budgetProgress(10, 100)).toEqual({ pct: 10, tone: "green" });
    expect(budgetProgress(80, 100)).toEqual({ pct: 80, tone: "amber" });
    expect(budgetProgress(100, 100)).toEqual({ pct: 100, tone: "red" });
    expect(budgetProgress(150, 100)).toEqual({ pct: 100, tone: "red" }); // clamped
  });
  it("clamps negative spend to 0%", () => {
    expect(budgetProgress(-5, 100)).toEqual({ pct: 0, tone: "green" });
  });
});

describe("formatUsd", () => {
  it("formats with two decimals and grouping", () => {
    expect(formatUsd(0)).toBe("$0.00");
    expect(formatUsd(1234.5)).toBe("$1,234.50");
  });
  it("shows movement for sub-cent spend", () => {
    expect(formatUsd(0.004)).toBe("<$0.01");
  });
});
