import "server-only";

import { getPool } from "@/lib/db/client";
import graphJson from "@/data/org-graph.json";
import proceduresJson from "@/data/agent-procedures.json";
import type {
  AgentProcedures,
  AgentProceduresFile,
  OrgGraph,
  OrgLiveState,
  OrgNodeLive,
} from "./types";

/**
 * The static org skeleton, generated from icm/org.yaml + icm/** by
 * scripts/gen-org-graph.mjs (single SoT, no duplicate org_node schema). Imported
 * directly — it is committed build-time data.
 */
export function loadOrgGraph(): OrgGraph {
  return graphJson as OrgGraph;
}

/**
 * The full per-agent procedure + step detail (the /org/[agentId] surface, #1612),
 * generated alongside the skeleton from icm/**. ~600KB of prose — `server-only`
 * keeps it out of the client bundle; never import this from a Client Component.
 */
export function loadAgentProcedures(agentId: string): AgentProcedures | null {
  const file = proceduresJson as AgentProceduresFile;
  return file.agents[agentId] ?? null;
}

const EMPTY_LIVE: OrgLiveState = {
  live: false,
  byKey: {},
  summary: { runs7d: 0, costUsd7d: 0, pendingTotal: 0 },
};

/**
 * Overlay live agent state on the skeleton. Read-only, defensive: the front end is
 * GUI-only (ADR-0042) and the agent-platform tables may be absent/empty in some
 * environments, so every read is wrapped — a missing table or unreachable DB degrades
 * to the dormant skeleton (`live: false`) rather than failing the page (ADR-0007).
 *
 * Keyed by `agent_key` (text) for the dial/rung/pending signals; `agent_run` is
 * uuid-keyed to the `agent` table (the file-defined org agents have no row yet) so it
 * feeds only the global activity summary, not per-node stats.
 */
export async function readOrgLiveState(): Promise<OrgLiveState> {
  const pool = getPool();
  if (!pool) return EMPTY_LIVE;

  const byKey: Record<string, OrgNodeLive> = {};
  const ensure = (key: string): OrgNodeLive => {
    const k = key.trim();
    if (!byKey[k]) byKey[k] = { rung: null, level: null, gated: false, pending: 0 };
    return byKey[k];
  };
  const rungRank = (r: string | null): number =>
    r ? ["L0", "L1", "L2", "L3", "L4", "L5"].indexOf(r) : -1;

  let anyLive = false;

  // ICM autonomy rung (L0–L3) + mark-gated, per agent_key.
  try {
    const { rows } = await pool.query<{ agent_key: string; rung: string; mark_gated: boolean }>(
      `SELECT agent_key, rung, mark_gated FROM agent_autopilot_policy`,
    );
    anyLive = true;
    for (const r of rows) {
      const n = ensure(r.agent_key);
      if (rungRank(r.rung) > rungRank(n.rung)) n.rung = r.rung;
      if (r.mark_gated) n.gated = true;
    }
  } catch {
    /* table absent/unreadable — skip this signal */
  }

  // Actuation dial (1–5), per agent_key.
  try {
    const { rows } = await pool.query<{ agent_key: string; level: number }>(
      `SELECT agent_key, MAX(level)::int AS level FROM agent_action_autonomy GROUP BY agent_key`,
    );
    anyLive = true;
    for (const r of rows) {
      const n = ensure(r.agent_key);
      n.level = r.level;
    }
  } catch {
    /* skip */
  }

  // Pending approval-queue actions, per agent_key.
  let pendingTotal = 0;
  try {
    const { rows } = await pool.query<{ agent_key: string; pending: number }>(
      `SELECT agent_key, COUNT(*)::int AS pending FROM agent_pending_action
        WHERE status = 'pending' GROUP BY agent_key`,
    );
    anyLive = true;
    for (const r of rows) {
      ensure(r.agent_key).pending = r.pending;
      pendingTotal += r.pending;
    }
  } catch {
    /* skip */
  }

  // Global recent-activity summary (last 7 days) — agent_run is uuid-keyed.
  let runs7d = 0;
  let costUsd7d = 0;
  try {
    const { rows } = await pool.query<{ runs: number; cost: string }>(
      `SELECT COUNT(*)::int AS runs, COALESCE(SUM(cost_usd), 0)::text AS cost
         FROM agent_run WHERE started_at > now() - interval '7 days'`,
    );
    anyLive = true;
    runs7d = rows[0]?.runs ?? 0;
    costUsd7d = Number(rows[0]?.cost ?? 0);
  } catch {
    /* skip */
  }

  if (!anyLive) return EMPTY_LIVE;
  return { live: true, byKey, summary: { runs7d, costUsd7d, pendingTotal } };
}
