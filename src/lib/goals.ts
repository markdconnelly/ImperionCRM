/**
 * Goal / OKR rollup math (ADR-0069 D3, #348) — pure, DB-free, unit-tested.
 *
 * A goal's progress is EITHER manual (the owner's `current` vs `target`) OR rolled
 * up from the linked projects' completion. This module derives both percents from
 * raw figures so the repository (mock + postgres) and any future caller share one
 * definition, and the acceptance ("a goal shows rolled-up progress from its linked
 * projects") is covered by a test, not just SQL.
 */
import type { GoalLinkedProject } from "@/types";

/** Clamp a number to the 0–100 percent range, rounding to a whole percent. */
export function clampPercent(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(100, Math.round(value));
}

/**
 * A project's own completion percent (0–100): milestone completion when it has
 * milestones, else 100 if the project status is 'complete', otherwise 0. Mirrors
 * the portfolio rollup's "done/total" intent (ADR-0069 D5) at the project grain.
 */
export function projectPercentComplete(args: {
  status: string;
  milestoneTotal: number;
  milestoneDone: number;
}): number {
  const { status, milestoneTotal, milestoneDone } = args;
  if (milestoneTotal > 0) return clampPercent((milestoneDone / milestoneTotal) * 100);
  return status === "complete" ? 100 : 0;
}

/**
 * Manual progress as a percent of target (current/target × 100), clamped 0–100. A
 * non-positive target yields 0 (avoid divide-by-zero / nonsense percents).
 */
export function manualPercent(current: number, target: number): number {
  if (!Number.isFinite(target) || target <= 0) return 0;
  return clampPercent((current / target) * 100);
}

/**
 * The weight-weighted average of the linked projects' completion, or null when no
 * projects are linked (the caller falls back to the manual percent). Links with a
 * non-positive weight are ignored (the schema forbids them, but be defensive).
 */
export function rolledUpPercent(links: GoalLinkedProject[]): number | null {
  let weightSum = 0;
  let weighted = 0;
  for (const l of links) {
    if (!(l.weight > 0)) continue;
    weightSum += l.weight;
    weighted += l.weight * l.percentComplete;
  }
  if (weightSum === 0) return null;
  return clampPercent(weighted / weightSum);
}

/**
 * Resolve the percent a goal should DISPLAY: the rollup when the goal is in
 * 'rollup' mode and has at least one linked project, otherwise the manual percent.
 */
export function displayPercent(args: {
  progressMode: "manual" | "rollup";
  manual: number;
  rolledUp: number | null;
}): number {
  if (args.progressMode === "rollup" && args.rolledUp !== null) return args.rolledUp;
  return args.manual;
}
