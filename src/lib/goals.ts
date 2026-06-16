/**
 * Goal / OKR rollup math (ADR-0069 D3, #348) — pure, DB-free, unit-tested.
 *
 * A goal's progress is EITHER manual (the owner's `current` vs `target`) OR rolled
 * up from the linked work's completion (projects AND tasks, issue #621). This module
 * derives both percents from raw figures so the repository (mock + postgres) and any
 * future caller share one definition, and the acceptance ("a goal shows rolled-up
 * progress from its linked work") is covered by a test, not just SQL.
 */

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
 * A linked task's own completion percent (0–100). A task is binary: 100 when its
 * status is the terminal `done`, 0 otherwise (a task has no sub-milestones, unlike a
 * project). Extends the rollup to task links (issue #621) without changing the
 * weighted-average math — a task just feeds its own percent into the same average.
 */
export function taskPercentComplete(status: string): number {
  return status === "done" ? 100 : 0;
}

/**
 * The shape the weighted rollup needs from any linked work object (project OR task,
 * issue #621): its `weight` (its share of the average) and its own `percentComplete`.
 * Both `GoalLinkedProject` and `GoalLinkedTask` satisfy this.
 */
export interface WeightedLink {
  weight: number;
  percentComplete: number;
}

/**
 * The weight-weighted average of ALL linked work's completion (projects AND tasks,
 * issue #621), or null when nothing is linked (the caller falls back to the manual
 * percent). Links with a non-positive weight are ignored (the schema forbids them,
 * but be defensive). Project and task links share one weighted pool — a 3×-weighted
 * task contributes exactly like a 3×-weighted project.
 */
export function rolledUpPercent(links: readonly WeightedLink[]): number | null {
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
