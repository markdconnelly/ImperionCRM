/**
 * `agent_earned_autonomy` + `agent_earned_transition` read layer (#1036, ADR-0121, migration
 * 0182) - the front-end READ surface for earned / graduated autonomy.
 *
 * The earned dimension is BACKEND-OWNED at runtime: the backend dispatcher (BE #250) runs the
 * promotion / demotion engine (`src/lib/agent/earned-autonomy.ts` applyOutcome - the pure
 * mirror) and writes both tables at dispatch. Migration 0182 grants the web identity SELECT
 * only - the front end READS the earned tier, the clean streak, and the last transition to
 * render the cockpit's track-record line (#1014). There is no FE write path (unlike the
 * operator dial 0158, which the slider writes directly).
 *
 * Degrades like the rest of the data layer (ADR-0007/0024): DB unset -> mock sample rows; a
 * query failure on read -> empty list (never a page error).
 *
 * Server-only.
 */
import "server-only";
import { getPool } from "@/lib/db/client";
import type { AutonomyTier } from "@/lib/agent/action-autonomy";
import {
  emptyEarnedRecord,
  type EarnedRecord,
  type EarnedTransition,
} from "@/lib/agent/earned-autonomy";

/** A coerced earned tier or null (anything outside T0-T3 -> null, fail-closed). */
function coerceTier(value: unknown): AutonomyTier | null {
  return value === "T0" || value === "T1" || value === "T2" || value === "T3"
    ? value
    : null;
}

interface EarnedRow {
  agent_key: string;
  action_class: string;
  earned_tier: string | null;
  clean_streak: number;
  promote_threshold: number;
  clean_eval_floor: number | string;
  updated_at: string | Date | null;
}

interface TransitionRow {
  agent_key: string;
  action_class: string;
  kind: string;
  from_tier: string | null;
  to_tier: string | null;
  reason: string;
  created_at: string | Date;
}

/** Composite map key for an (agent, class) pair - a delimiter no key can contain. */
function pairKey(agentKey: string, actionClass: string): string {
  return `${agentKey}::${actionClass}`;
}

function mapTransition(r: TransitionRow): EarnedTransition {
  return {
    kind: r.kind === "demote" ? "demote" : "promote",
    from: coerceTier(r.from_tier),
    to: coerceTier(r.to_tier),
    reason: r.reason,
    at: new Date(r.created_at).toISOString(),
  };
}

function mapRow(r: EarnedRow, lastTransition: EarnedTransition | null): EarnedRecord {
  const floor =
    typeof r.clean_eval_floor === "string" ? Number(r.clean_eval_floor) : r.clean_eval_floor;
  return {
    agentKey: r.agent_key,
    actionClass: r.action_class,
    earnedTier: coerceTier(r.earned_tier),
    cleanStreak: Math.max(0, Math.trunc(r.clean_streak)),
    promoteThreshold: Math.max(1, Math.trunc(r.promote_threshold)),
    cleanEvalFloor: Number.isFinite(floor) ? floor : 0.75,
    lastTransition,
  };
}

const MOCK_EARNED: EarnedRecord[] = [
  {
    agentKey: "technician",
    actionClass: "operational",
    earnedTier: "T2",
    cleanStreak: 2,
    promoteThreshold: 5,
    cleanEvalFloor: 0.75,
    lastTransition: {
      kind: "promote",
      from: "T1",
      to: "T2",
      reason: "5 consecutive clean approvals (eval >= 0.75) on operational",
      at: "2026-06-21T12:00:00Z",
    },
  },
  {
    // An always-gate class: HARD-CAPPED badge surfaces; no earned raise can cross it.
    agentKey: "sales",
    actionClass: "client_pii",
    earnedTier: null,
    cleanStreak: 0,
    promoteThreshold: 5,
    cleanEvalFloor: 0.75,
    lastTransition: null,
  },
  {
    // A class that just demoted on a miss — back at the dial floor.
    agentKey: "finance",
    actionClass: "operational",
    earnedTier: null,
    cleanStreak: 0,
    promoteThreshold: 5,
    cleanEvalFloor: 0.75,
    lastTransition: {
      kind: "demote",
      from: "T2",
      to: null,
      reason: "miss: rejected / reverted / eval-fail — earned autonomy reset to the dial floor",
      at: "2026-06-21T18:30:00Z",
    },
  },
];

/**
 * Every earned-autonomy record (with its last transition joined in). DB unset -> mock; query
 * failure -> empty, never a page error. The cockpit renders current tier / streak / last
 * transition from these.
 */
export async function listEarnedAutonomy(): Promise<EarnedRecord[]> {
  const pool = getPool();
  if (!pool) return MOCK_EARNED; // mock fallback (ADR-0007)

  try {
    const { rows } = await pool.query<EarnedRow>(
      `SELECT agent_key, action_class, earned_tier, clean_streak,
              promote_threshold, clean_eval_floor, updated_at
         FROM agent_earned_autonomy
        ORDER BY agent_key, action_class`,
    );
    // Last transition per (agent, class) - DISTINCT ON the recency index (0182).
    const { rows: trans } = await pool.query<TransitionRow>(
      `SELECT DISTINCT ON (agent_key, action_class)
              agent_key, action_class, kind, from_tier, to_tier, reason, created_at
         FROM agent_earned_transition
        ORDER BY agent_key, action_class, created_at DESC`,
    );
    const lastByKey = new Map<string, EarnedTransition>();
    for (const t of trans) lastByKey.set(pairKey(t.agent_key, t.action_class), mapTransition(t));
    return rows.map((r) => mapRow(r, lastByKey.get(pairKey(r.agent_key, r.action_class)) ?? null));
  } catch (err) {
    console.error("earned autonomy read failed:", err);
    return []; // never fail the page over the earned list
  }
}

/**
 * The earned record for one `(agentKey, actionClass)`, or a fresh fail-closed empty record when
 * none is persisted. This is what dispatch resolution passes into `resolveDispatch` as the
 * earned dimension; an empty record raises nothing (the operator dial alone governs).
 */
export async function getEarnedAutonomy(
  agentKey: string,
  actionClass: string,
): Promise<EarnedRecord> {
  const all = await listEarnedAutonomy();
  return (
    all.find((r) => r.agentKey === agentKey && r.actionClass === actionClass) ??
    emptyEarnedRecord(agentKey, actionClass)
  );
}
