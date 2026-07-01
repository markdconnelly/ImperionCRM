/**
 * Read-side for the Nova landing page (#1118, epic #1038) — the front door of the OS.
 *
 * Nova is the orchestrator's operator surface (backend ADR-0036/0080). This module
 * reads the conversation ledger the backend writes:
 *   - `agent_conversation` (FE #1064) — one row per session; `id` is the conversation_id
 *     correlation root.
 *   - `agent_run` → `agent_message` (0056) — the per-turn runs + their stage artifacts,
 *     the verbose "glass-box" trace a human drills into.
 *
 * READ-ONLY and degrades in the app's tiers (ADR-0007/0042): DB unset → mock sample;
 * query failure → empty, never a page error. (Until migration 0163/#1064 is prod-applied
 * the `agent_run.conversation_id` column is absent, so a live DB returns empty here — the
 * surface is deploy-dormant, not broken.) The backend owns all writes — the FE only sends
 * turns (with a conversation_id) through `askAgentAction`; persistence is backend-side.
 *
 * Server-only.
 */
import "server-only";
import { getPool } from "@/lib/db/client";

/** One session as the history rail lists it. */
export interface NovaConversation {
  id: string;
  title: string;
  startedAt: string; // ISO
  lastMessageAt: string | null; // ISO
  status: string; // active | archived
  runCount: number;
}

/** One stage artifact within a run (an `agent_message`). */
export interface NovaStage {
  id: string;
  role: string; // system | user | assistant | tool
  content: string;
  createdAt: string; // ISO
  toolCalls: unknown | null;
}

/** One orchestrator run within a conversation, with its ordered stages. */
export interface NovaRun {
  id: string;
  agentName: string; // agent.display_name ?? agent.name
  status: string;
  startedAt: string; // ISO
  finishedAt: string | null; // ISO
  costUsd: number;
  stages: NovaStage[];
}

/** A conversation with its runs (the drill-in detail). */
export interface NovaConversationDetail extends NovaConversation {
  runs: NovaRun[];
}

const MOCK_CONVERSATIONS: NovaConversation[] = [
  {
    id: "mock-conv-1",
    title: "Triage the print-queue ticket on PRINT-01",
    startedAt: "2026-06-21T14:02:00Z",
    lastMessageAt: "2026-06-21T14:06:00Z",
    status: "active",
    runCount: 2,
  },
  {
    id: "mock-conv-2",
    title: "Draft the Q3 QBR summary for Acme",
    startedAt: "2026-06-20T10:15:00Z",
    lastMessageAt: "2026-06-20T10:22:00Z",
    status: "active",
    runCount: 1,
  },
];

const MOCK_DETAIL: Record<string, NovaConversationDetail> = {
  "mock-conv-1": {
    ...MOCK_CONVERSATIONS[0],
    runs: [
      {
        id: "mock-run-1",
        agentName: "Nova",
        status: "succeeded",
        startedAt: "2026-06-21T14:02:00Z",
        finishedAt: "2026-06-21T14:02:08Z",
        costUsd: 0.0042,
        stages: [
          {
            id: "s1",
            role: "user",
            content: "Triage the print-queue ticket on PRINT-01.",
            createdAt: "2026-06-21T14:02:00Z",
            toolCalls: null,
          },
          {
            id: "s2",
            role: "assistant",
            content: "Routing to the Autotask Technician — pulling the ticket and recent device events.",
            createdAt: "2026-06-21T14:02:03Z",
            toolCalls: [{ tool: "autotask_get_ticket", args: { number: "T20260621.0042" } }],
          },
        ],
      },
      {
        id: "mock-run-2",
        agentName: "Autotask Technician",
        status: "succeeded",
        startedAt: "2026-06-21T14:05:00Z",
        finishedAt: "2026-06-21T14:05:09Z",
        costUsd: 0.0061,
        stages: [
          {
            id: "s3",
            role: "assistant",
            content:
              "Drafted a triage note + a customer reply. The reply is client_pii (T2) — queued for your approval, never auto-sent.",
            createdAt: "2026-06-21T14:05:06Z",
            toolCalls: [{ tool: "autotask_add_triage_note", args: { ticketId: "…" } }],
          },
        ],
      },
    ],
  },
};

/** The signed-in employee's conversations, newest activity first. */
export async function listConversations(userId: string, limit = 50): Promise<NovaConversation[]> {
  const pool = getPool();
  if (!pool) return MOCK_CONVERSATIONS;
  try {
    const { rows } = await pool.query<{
      id: string;
      title: string | null;
      status: string;
      started_at: string;
      last_message_at: string | null;
      run_count: string;
    }>(
      `SELECT c.id, c.title, c.status, c.started_at, c.last_message_at,
              COUNT(r.id) AS run_count
       FROM agent_conversation c
       LEFT JOIN agent_run r ON r.conversation_id = c.id
       WHERE c.created_by = $1
       GROUP BY c.id
       ORDER BY COALESCE(c.last_message_at, c.started_at) DESC
       LIMIT $2`,
      [userId, Math.min(Math.max(limit, 1), 100)],
    );
    return rows.map((r) => ({
      id: r.id,
      title: r.title?.trim() || "(untitled conversation)",
      startedAt: new Date(r.started_at).toISOString(),
      lastMessageAt: r.last_message_at ? new Date(r.last_message_at).toISOString() : null,
      status: r.status,
      runCount: Number(r.run_count) || 0,
    }));
  } catch (err) {
    console.error("Nova conversation list read failed:", err);
    return [];
  }
}

/** One conversation with its runs + stages (the drill-in trace), scoped to the owner. */
export async function getConversationDetail(
  conversationId: string,
  userId: string,
): Promise<NovaConversationDetail | null> {
  const pool = getPool();
  if (!pool) return MOCK_DETAIL[conversationId] ?? null;
  try {
    const head = await pool.query<{
      id: string;
      title: string | null;
      status: string;
      started_at: string;
      last_message_at: string | null;
    }>(
      `SELECT id, title, status, started_at, last_message_at
       FROM agent_conversation WHERE id = $1 AND created_by = $2`,
      [conversationId, userId],
    );
    if (head.rowCount === 0) return null;
    const c = head.rows[0];

    const runRes = await pool.query<{
      id: string;
      agent_name: string;
      status: string;
      started_at: string;
      finished_at: string | null;
      cost_usd: string;
    }>(
      `SELECT r.id, COALESCE(ag.display_name, ag.name) AS agent_name, r.status,
              r.started_at, r.finished_at, r.cost_usd
       FROM agent_run r
       JOIN agent ag ON ag.id = r.agent_id
       WHERE r.conversation_id = $1
       ORDER BY r.started_at ASC`,
      [conversationId],
    );

    const runIds = runRes.rows.map((r) => r.id);
    const stagesByRun = new Map<string, NovaStage[]>();
    if (runIds.length > 0) {
      const stageRes = await pool.query<{
        id: string;
        run_id: string;
        role: string;
        content: string;
        tool_calls: unknown | null;
        created_at: string;
      }>(
        `SELECT id, run_id, role, content, tool_calls, created_at
         FROM agent_message WHERE run_id = ANY($1::uuid[])
         ORDER BY created_at ASC`,
        [runIds],
      );
      for (const s of stageRes.rows) {
        const list = stagesByRun.get(s.run_id) ?? [];
        list.push({
          id: s.id,
          role: s.role,
          content: s.content,
          createdAt: new Date(s.created_at).toISOString(),
          toolCalls: s.tool_calls,
        });
        stagesByRun.set(s.run_id, list);
      }
    }

    return {
      id: c.id,
      title: c.title?.trim() || "(untitled conversation)",
      startedAt: new Date(c.started_at).toISOString(),
      lastMessageAt: c.last_message_at ? new Date(c.last_message_at).toISOString() : null,
      status: c.status,
      runCount: runRes.rows.length,
      runs: runRes.rows.map((r) => ({
        id: r.id,
        agentName: r.agent_name,
        status: r.status,
        startedAt: new Date(r.started_at).toISOString(),
        finishedAt: r.finished_at ? new Date(r.finished_at).toISOString() : null,
        costUsd: Number(r.cost_usd) || 0,
        stages: stagesByRun.get(r.id) ?? [],
      })),
    };
  } catch (err) {
    console.error("Nova conversation detail read failed:", err);
    return null;
  }
}
