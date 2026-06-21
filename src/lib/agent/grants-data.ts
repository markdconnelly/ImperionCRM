/**
 * Per-agent tool grants (#1005 / 2D, ADR-0107 D3) — server data-fetch for the grants
 * admin surface. Reads `agent` ⋈ `agent_tool_grant` for the CRM sub-agents; the web
 * identity has SELECT on both (migration 0056), so listing is a direct rendering read
 * (ADR-0042). WRITES go through the backend (`agentService.upsert/revokeToolGrant`).
 *
 * Degrades like the rest of the app: DB unset → mock sample rows; query failure → empty,
 * never a page error (the eval-runs-data / cost-rollup-data pattern, ADR-0007).
 *
 * Server-only.
 */
import "server-only";
import { getPool } from "@/lib/db/client";

/** A per-input-field allow-list; `{}` = unconstrained (mirrors the backend evaluator). */
export type ToolScope = Record<string, string[]>;
export interface ToolGrant {
  tool: string;
  scope: ToolScope;
}
export interface AgentGrants {
  agentId: string;
  name: string;
  tools: ToolGrant[];
}

const MOCK_AGENT_GRANTS: AgentGrants[] = [
  {
    agentId: "00000000-0000-0000-0000-0000000000c1",
    name: "autotask",
    tools: [
      { tool: "autotask_search_tickets", scope: {} },
      { tool: "autotask_add_triage_note", scope: { accountId: ["sample-acct-1"] } },
    ],
  },
  {
    agentId: "00000000-0000-0000-0000-0000000000c2",
    name: "reporting",
    tools: [{ tool: "agent_reporting", scope: {} }],
  },
];

/** Coerce a jsonb scope into `{ field: string[] }`; anything else → `{}`. */
function normalizeScope(raw: unknown): ToolScope {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: ToolScope = {};
  for (const [field, vals] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(vals)) out[field] = vals.filter((v): v is string => typeof v === "string");
  }
  return out;
}

interface GrantRow {
  agent_id: string;
  name: string;
  tool: string | null;
  scope: unknown;
}

/** Every CRM sub-agent with its granted tools + scope (ungranted agent → empty tools). */
export async function listAgentGrants(): Promise<AgentGrants[]> {
  const pool = getPool();
  if (!pool) return MOCK_AGENT_GRANTS; // mock fallback (ADR-0007)

  try {
    const { rows } = await pool.query<GrantRow>(
      `SELECT a.id AS agent_id, a.name, g.tool, g.scope
       FROM agent a
       LEFT JOIN agent_tool_grant g ON g.agent_id = a.id
       WHERE a.module = 'crm'
       ORDER BY a.name, g.tool`,
    );
    const byAgent = new Map<string, AgentGrants>();
    for (const r of rows) {
      let agent = byAgent.get(r.agent_id);
      if (!agent) {
        agent = { agentId: r.agent_id, name: r.name, tools: [] };
        byAgent.set(r.agent_id, agent);
      }
      if (r.tool) agent.tools.push({ tool: r.tool, scope: normalizeScope(r.scope) });
    }
    return [...byAgent.values()];
  } catch (err) {
    console.error("agent grants read failed:", err);
    return []; // never fail the page over the grants list
  }
}
