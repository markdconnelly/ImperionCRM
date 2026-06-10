/**
 * Recent agent activity (ADR-0048) — the orchestrator's audit trail, read-only.
 *
 * There is no separate agent-run table: the backend orchestrator audits every
 * turn to `audit_log` with action='agent.turn' (backend ADR-0032/0036), carrying
 * `detail.routedTo`, `detail.routingReason`, `detail.loop`/`modelTurns`, and the
 * token/cost rollup at `detail.usage`. The web identity has SELECT on audit_log
 * (migration 0002), so this is a clean direct rendering read (ADR-0042).
 *
 * Degrades like the rest of the app: DB unset → mock sample rows (the whole app
 * runs on mock data then); query failure → empty list, never a page error.
 *
 * Server-only.
 */
import "server-only";
import { getPool } from "@/lib/db/client";

/** One orchestrator turn, as the activity table renders it. */
export interface AgentRunRow {
  id: string;
  occurredAt: string; // ISO timestamp
  actor: string | null; // acting employee display name
  routedTo: string;
  routingReason: string | null;
  /** Model turns consumed by the tool-use loop; null on the deterministic path. */
  modelTurns: number | null;
  costUsd: number;
  requiresApproval: boolean;
}

const MOCK_RUNS: AgentRunRow[] = [
  {
    id: "mock-1",
    occurredAt: "2026-06-09T14:21:00Z",
    actor: "Avery Chen",
    routedTo: "reporting",
    routingReason: "agent loop (tools: reporting; 2 model turns)",
    modelTurns: 2,
    costUsd: 0.0124,
    requiresApproval: false,
  },
  {
    id: "mock-2",
    occurredAt: "2026-06-09T13:02:00Z",
    actor: "Avery Chen",
    routedTo: "sales",
    routingReason: "agent loop (tools: sales; 3 model turns)",
    modelTurns: 3,
    costUsd: 0.0312,
    requiresApproval: true,
  },
  {
    id: "mock-3",
    occurredAt: "2026-06-08T16:44:00Z",
    actor: "Jordan Patel",
    routedTo: "crm",
    routingReason: "agent loop answered directly (1 model turn)",
    modelTurns: 1,
    costUsd: 0.0041,
    requiresApproval: false,
  },
];

/** Last `limit` orchestrator turns, newest first. */
export async function listRecentAgentRuns(limit = 20): Promise<AgentRunRow[]> {
  const pool = getPool();
  if (!pool) return MOCK_RUNS; // mock fallback, same as every module (ADR-0007)

  try {
    const { rows } = await pool.query<{
      id: string;
      occurred_at: string;
      actor: string | null;
      detail: Record<string, unknown> | null;
    }>(
      `SELECT a.id, a.occurred_at, u.display_name AS actor, a.detail
       FROM audit_log a
       LEFT JOIN app_user u ON u.id = a.actor_user_id
       WHERE a.action = 'agent.turn'
       ORDER BY a.occurred_at DESC
       LIMIT $1`,
      [Math.min(Math.max(limit, 1), 100)],
    );
    return rows.map((r) => {
      const d = r.detail ?? {};
      const usage = (d.usage ?? {}) as Record<string, unknown>;
      return {
        id: r.id,
        occurredAt: new Date(r.occurred_at).toISOString(),
        actor: r.actor,
        routedTo: typeof d.routedTo === "string" ? d.routedTo : "—",
        routingReason: typeof d.routingReason === "string" ? d.routingReason : null,
        modelTurns: typeof d.modelTurns === "number" ? d.modelTurns : null,
        costUsd: typeof usage.costUsd === "number" ? usage.costUsd : Number(usage.costUsd ?? 0) || 0,
        requiresApproval: d.requiresApproval === true,
      };
    });
  } catch (err) {
    console.error("agent activity read failed:", err);
    return []; // never fail the page over an activity feed
  }
}
