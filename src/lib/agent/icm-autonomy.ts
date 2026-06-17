/**
 * Pure autonomy-dial vocabulary (#278, ADR-0087) — the rung enum + labels + guard.
 *
 * Split out of `icm-runs.ts` (which is `server-only`, holding the DB reads) so the
 * client components (autonomy dial), the server action validator, and the unit test
 * can all share one typed vocabulary without dragging in `pg`/`node:*`. Mirrors the
 * `autonomy_rung` enum in migration 0123.
 */

export const AUTONOMY_RUNGS = ["L0", "L1", "L2", "L3"] as const;
export type AutonomyRung = (typeof AUTONOMY_RUNGS)[number];

export const RUNG_LABEL: Record<AutonomyRung, string> = {
  L0: "L0 · Observe (read-only)",
  L1: "L1 · Draft (hold for human)",
  L2: "L2 · Act-gated (idempotent write)",
  L3: "L3 · Auto (autonomous)",
};

export function isAutonomyRung(value: string): value is AutonomyRung {
  return (AUTONOMY_RUNGS as readonly string[]).includes(value);
}
