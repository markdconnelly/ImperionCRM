import { describe, it, expect } from "vitest";
import {
  clampPercent,
  projectPercentComplete,
  taskPercentComplete,
  manualPercent,
  rolledUpPercent,
  displayPercent,
} from "@/lib/goals";
import type { GoalLinkedProject } from "@/types";

const link = (weight: number, percentComplete: number): GoalLinkedProject => ({
  projectId: "p",
  name: "P",
  account: "A",
  status: "in_progress",
  weight,
  percentComplete,
});

describe("clampPercent", () => {
  it("clamps to 0–100 and rounds", () => {
    expect(clampPercent(-5)).toBe(0);
    expect(clampPercent(150)).toBe(100);
    expect(clampPercent(49.6)).toBe(50);
    expect(clampPercent(Number.NaN)).toBe(0);
  });
});

describe("projectPercentComplete", () => {
  it("uses milestone completion when milestones exist", () => {
    expect(projectPercentComplete({ status: "in_progress", milestoneTotal: 4, milestoneDone: 1 })).toBe(25);
    expect(projectPercentComplete({ status: "in_progress", milestoneTotal: 2, milestoneDone: 2 })).toBe(100);
  });
  it("falls back to status when there are no milestones", () => {
    expect(projectPercentComplete({ status: "complete", milestoneTotal: 0, milestoneDone: 0 })).toBe(100);
    expect(projectPercentComplete({ status: "in_progress", milestoneTotal: 0, milestoneDone: 0 })).toBe(0);
  });
});

describe("taskPercentComplete", () => {
  it("is 100 only when the task is done (binary, #621)", () => {
    expect(taskPercentComplete("done")).toBe(100);
    expect(taskPercentComplete("open")).toBe(0);
    expect(taskPercentComplete("in_progress")).toBe(0);
  });
});

describe("manualPercent", () => {
  it("is current/target as a percent, clamped", () => {
    expect(manualPercent(3, 4)).toBe(75);
    expect(manualPercent(8, 4)).toBe(100); // over target clamps
    expect(manualPercent(1, 0)).toBe(0); // non-positive target
  });
});

describe("rolledUpPercent", () => {
  it("is null with no links", () => {
    expect(rolledUpPercent([])).toBeNull();
  });
  it("is the weighted average of linked project completion (the #348 acceptance)", () => {
    // Two equally-weighted projects at 100% and 0% → 50%.
    expect(rolledUpPercent([link(1, 100), link(1, 0)])).toBe(50);
    // Weight skews it: a 3×-weighted done project + a 1× not-started → 75%.
    expect(rolledUpPercent([link(3, 100), link(1, 0)])).toBe(75);
  });
  it("ignores non-positive weights defensively", () => {
    expect(rolledUpPercent([link(0, 100), link(2, 50)])).toBe(50);
  });
  it("rolls up projects AND tasks in one weighted pool (#621)", () => {
    // A done project (100, weight 1) + a not-done task (0, weight 1) → 50%.
    const taskLink = { weight: 1, percentComplete: taskPercentComplete("open") };
    expect(rolledUpPercent([link(1, 100), taskLink])).toBe(50);
    // A done task is weighted exactly like a done project.
    const doneTask = { weight: 3, percentComplete: taskPercentComplete("done") };
    expect(rolledUpPercent([link(1, 0), doneTask])).toBe(75);
  });
});

describe("displayPercent", () => {
  it("prefers the rollup in rollup mode when links exist", () => {
    expect(displayPercent({ progressMode: "rollup", manual: 10, rolledUp: 80 })).toBe(80);
  });
  it("falls back to manual in rollup mode with no links", () => {
    expect(displayPercent({ progressMode: "rollup", manual: 10, rolledUp: null })).toBe(10);
  });
  it("uses manual in manual mode even when a rollup exists", () => {
    expect(displayPercent({ progressMode: "manual", manual: 10, rolledUp: 80 })).toBe(10);
  });
});
