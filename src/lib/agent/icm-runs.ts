/**
 * Read-side for the ICM glass-box run viewer + approval queue (#278, ADR-0061/0087).
 *
 * The ICM executor (backend, ADR-0061) runs a workflow as a sequence of single-job
 * agent turns and persists each as an `agent_run` row, with the per-stage artifacts
 * as `agent_message` rows (role/content/tool_calls) — the schema is migration 0056
 * (`agent_run`/`agent_message`). A checkpoint stage parks the run for human
 * approve/edit/reject (the approval queue). The per-workflow autonomy dial is the
 * data-driven `agent_autopilot_policy` rung (migration 0123, ADR-0087).
 *
 * This module is READ-ONLY and degrades in the same tiers as the rest of the app
 * (ADR-0007/0042): DB unset → mock sample rows; query failure → empty list, never a
 * page error. Writes (approve/edit/reject, autonomy flip) go through the backend
 * (the web role has no INSERT/UPDATE on `agent_run`; ADR-0042) — see actions.ts.
 *
 * Server-only.
 */
import "server-only";
import { getPool } from "@/lib/db/client";
import { isAutonomyRung } from "@/lib/agent/icm-autonomy";

export { AUTONOMY_RUNGS, RUNG_LABEL, isAutonomyRung, type AutonomyRung } from "@/lib/agent/icm-autonomy";

/** One ICM run as the run viewer lists it. */
export interface IcmRunRow {
  id: string;
  agentName: string;
  /** running | succeeded | failed | cancelled (agent_run.status). */
  status: string;
  startedAt: string; // ISO
  finishedAt: string | null; // ISO
  actor: string | null; // acting employee display name
  stageCount: number;
  costUsd: number;
  /** True when the run is parked at a checkpoint awaiting human action. */
  awaitingApproval: boolean;
}

/** One stage artifact within a run (an `agent_message`), readable + (backend) editable. */
export interface IcmStageRow {
  id: string;
  role: string; // system | user | assistant | tool
  content: string;
  createdAt: string; // ISO
  /** Tool calls captured for the stage, if any (rendered as JSON). */
  toolCalls: unknown | null;
}

/** A run with its ordered stage artifacts. */
export interface IcmRunDetail extends IcmRunRow {
  stages: IcmStageRow[];
  /** Permission scope the run carried (ADR-0016: never exceeds the invoker). */
  permissionScope: Record<string, unknown>;
}

/** One queued lead-response draft awaiting approve/edit/reject. */
export interface ApprovalItem {
  runId: string;
  agentName: string;
  startedAt: string; // ISO
  actor: string | null;
  /** The drafted artifact the human reviews (assistant message content). */
  draft: string;
  /** Why the agent proposed this (routing/triage rationale). */
  rationale: string | null;
  /** Triage classification stamped on the run (e.g. lead score / archetype). */
  triageClass: string | null;
  /** Consent basis re-asserted before any send (ADR-0058). */
  consentBasis: string | null;
}

/** The current autonomy rung for a workflow (read from `agent_autopilot_policy`). */
export interface AutonomyPolicy {
  agentKey: string;
  workflowKey: string;
  /** L0 observe · L1 draft · L2 act-gated · L3 auto (ADR-0087). */
  rung: "L0" | "L1" | "L2" | "L3";
  /** When true, money/customer-facing legs still funnel to the human queue. */
  markGated: boolean;
  note: string | null;
}

const MOCK_RUNS: IcmRunRow[] = [
  {
    id: "mock-run-1",
    agentName: "Lead-response",
    status: "running",
    startedAt: "2026-06-17T09:12:00Z",
    finishedAt: null,
    actor: "Avery Chen",
    stageCount: 3,
    costUsd: 0.0186,
    awaitingApproval: true,
  },
  {
    id: "mock-run-2",
    agentName: "Lead-response",
    status: "succeeded",
    startedAt: "2026-06-16T15:40:00Z",
    finishedAt: "2026-06-16T15:41:20Z",
    actor: "Jordan Patel",
    stageCount: 5,
    costUsd: 0.0421,
    awaitingApproval: false,
  },
];

const MOCK_STAGES: IcmStageRow[] = [
  {
    id: "mock-stage-1",
    role: "system",
    content: "Stage 01 · classify — load the lead context contract and triage the inbound lead.",
    createdAt: "2026-06-17T09:12:00Z",
    toolCalls: null,
  },
  {
    id: "mock-stage-2",
    role: "assistant",
    content:
      "Triage: warm lead (score 78). Proposed reply drafted for human approval — does not send.",
    createdAt: "2026-06-17T09:12:30Z",
    toolCalls: [{ tool: "draft_reply", args: { channel: "email" } }],
  },
];

const MOCK_QUEUE: ApprovalItem[] = [
  {
    runId: "mock-run-1",
    agentName: "Lead-response",
    startedAt: "2026-06-17T09:12:00Z",
    actor: "Avery Chen",
    draft:
      "Hi Sam — thanks for reaching out about managed IT. I'd love to set up a 20-minute discovery call to understand your environment. Are you free Thursday?",
    rationale: "Warm inbound (lead score 78); ICP fit on company size. Drafted per nurture stage 02.",
    triageClass: "warm-lead · score 78",
    consentBasis: "legitimate-interest (inbound enquiry) · re-asserted at send (ADR-0058)",
  },
];

const MOCK_POLICY: AutonomyPolicy = {
  agentKey: "lead-response",
  workflowKey: "*",
  rung: "L1",
  markGated: true,
  note: "Starts in draft (ADR-0061) — every checkpoint requires a human.",
};

/** Map an `agent_run` status to whether it is parked awaiting approval. */
function awaitsApproval(status: string, requiresApproval: boolean): boolean {
  // The executor parks a checkpoint as a still-running row; a `requires_approval`
  // flag in permission_scope marks it for the queue (backend-set, ADR-0061).
  return status === "running" && requiresApproval;
}

/** Last `limit` ICM runs, newest first. */
export async function listIcmRuns(limit = 25): Promise<IcmRunRow[]> {
  const pool = getPool();
  if (!pool) return MOCK_RUNS;
  try {
    const { rows } = await pool.query<{
      id: string;
      agent_name: string;
      status: string;
      started_at: string;
      finished_at: string | null;
      actor: string | null;
      stage_count: string;
      cost_usd: string;
      requires_approval: boolean | null;
    }>(
      `SELECT r.id, ag.name AS agent_name, r.status, r.started_at, r.finished_at,
              u.display_name AS actor,
              COUNT(m.id) AS stage_count, r.cost_usd,
              (r.permission_scope->>'requiresApproval')::boolean AS requires_approval
       FROM agent_run r
       JOIN agent ag ON ag.id = r.agent_id
       LEFT JOIN app_user u ON u.id = r.acting_user_id
       LEFT JOIN agent_message m ON m.run_id = r.id
       WHERE ag.module = 'crm'
       GROUP BY r.id, ag.name, u.display_name
       ORDER BY r.started_at DESC
       LIMIT $1`,
      [Math.min(Math.max(limit, 1), 100)],
    );
    return rows.map((r) => ({
      id: r.id,
      agentName: r.agent_name,
      status: r.status,
      startedAt: new Date(r.started_at).toISOString(),
      finishedAt: r.finished_at ? new Date(r.finished_at).toISOString() : null,
      actor: r.actor,
      stageCount: Number(r.stage_count),
      costUsd: Number(r.cost_usd) || 0,
      awaitingApproval: awaitsApproval(r.status, r.requires_approval === true),
    }));
  } catch (err) {
    console.error("ICM run list read failed:", err);
    return [];
  }
}

/** One run with its ordered stage artifacts, or null when not found. */
export async function getIcmRun(id: string): Promise<IcmRunDetail | null> {
  const pool = getPool();
  if (!pool) {
    const run = MOCK_RUNS.find((r) => r.id === id);
    return run ? { ...run, stages: MOCK_STAGES, permissionScope: {} } : null;
  }
  try {
    const { rows } = await pool.query<{
      id: string;
      agent_name: string;
      status: string;
      started_at: string;
      finished_at: string | null;
      actor: string | null;
      cost_usd: string;
      permission_scope: Record<string, unknown> | null;
    }>(
      `SELECT r.id, ag.name AS agent_name, r.status, r.started_at, r.finished_at,
              u.display_name AS actor, r.cost_usd, r.permission_scope
       FROM agent_run r
       JOIN agent ag ON ag.id = r.agent_id
       LEFT JOIN app_user u ON u.id = r.acting_user_id
       WHERE r.id = $1`,
      [id],
    );
    const r = rows[0];
    if (!r) return null;
    const { rows: stages } = await pool.query<{
      id: string;
      role: string;
      content: string;
      created_at: string;
      tool_calls: unknown | null;
    }>(
      `SELECT id, role, content, created_at, tool_calls
       FROM agent_message WHERE run_id = $1 ORDER BY created_at`,
      [id],
    );
    const scope = r.permission_scope ?? {};
    return {
      id: r.id,
      agentName: r.agent_name,
      status: r.status,
      startedAt: new Date(r.started_at).toISOString(),
      finishedAt: r.finished_at ? new Date(r.finished_at).toISOString() : null,
      actor: r.actor,
      stageCount: stages.length,
      costUsd: Number(r.cost_usd) || 0,
      awaitingApproval: awaitsApproval(r.status, scope.requiresApproval === true),
      permissionScope: scope,
      stages: stages.map((s) => ({
        id: s.id,
        role: s.role,
        content: s.content,
        createdAt: new Date(s.created_at).toISOString(),
        toolCalls: s.tool_calls,
      })),
    };
  } catch (err) {
    console.error("ICM run read failed:", err);
    return null;
  }
}

/** The approval queue: parked checkpoints awaiting approve/edit/reject. */
export async function listApprovalQueue(): Promise<ApprovalItem[]> {
  const pool = getPool();
  if (!pool) return MOCK_QUEUE;
  try {
    const { rows } = await pool.query<{
      run_id: string;
      agent_name: string;
      started_at: string;
      actor: string | null;
      scope: Record<string, unknown> | null;
      draft: string | null;
    }>(
      `SELECT r.id AS run_id, ag.name AS agent_name, r.started_at,
              u.display_name AS actor, r.permission_scope AS scope,
              (SELECT content FROM agent_message
                 WHERE run_id = r.id AND role = 'assistant'
                 ORDER BY created_at DESC LIMIT 1) AS draft
       FROM agent_run r
       JOIN agent ag ON ag.id = r.agent_id
       LEFT JOIN app_user u ON u.id = r.acting_user_id
       WHERE ag.module = 'crm' AND r.status = 'running'
         AND (r.permission_scope->>'requiresApproval')::boolean IS TRUE
       ORDER BY r.started_at DESC
       LIMIT 50`,
    );
    return rows.map((r) => {
      const scope = r.scope ?? {};
      const str = (k: string): string | null =>
        typeof scope[k] === "string" ? (scope[k] as string) : null;
      return {
        runId: r.run_id,
        agentName: r.agent_name,
        startedAt: new Date(r.started_at).toISOString(),
        actor: r.actor,
        draft: r.draft ?? "(no draft captured)",
        rationale: str("rationale"),
        triageClass: str("triageClass"),
        consentBasis: str("consentBasis"),
      };
    });
  } catch (err) {
    console.error("ICM approval queue read failed:", err);
    return [];
  }
}

/**
 * The current autonomy rung for an ICM workflow agent (the data-driven dial).
 * Resolves the most-specific row (exact workflow_key beats '*') for plane='icm';
 * returns the safe default (L1 / draft, mark-gated) when no row exists.
 */
export async function getAutonomyPolicy(
  agentKey: string,
  workflowKey = "*",
): Promise<AutonomyPolicy> {
  const pool = getPool();
  if (!pool) return { ...MOCK_POLICY, agentKey, workflowKey };
  try {
    const { rows } = await pool.query<{
      agent_key: string;
      workflow_key: string;
      rung: string;
      mark_gated: boolean;
      note: string | null;
    }>(
      `SELECT agent_key, workflow_key, rung::text AS rung, mark_gated, note
       FROM agent_autopilot_policy
       WHERE agent_key = $1 AND plane = 'icm'
         AND workflow_key IN ($2, '*')
       ORDER BY (workflow_key = $2) DESC
       LIMIT 1`,
      [agentKey, workflowKey],
    );
    const r = rows[0];
    if (!r) {
      // Safe default per ADR-0061: every workflow STARTS in draft, mark-gated.
      return { agentKey, workflowKey, rung: "L1", markGated: true, note: null };
    }
    return {
      agentKey: r.agent_key,
      workflowKey: r.workflow_key,
      rung: isAutonomyRung(r.rung) ? r.rung : "L1",
      markGated: r.mark_gated,
      note: r.note,
    };
  } catch (err) {
    console.error("autonomy policy read failed:", err);
    return { agentKey, workflowKey, rung: "L1", markGated: true, note: null };
  }
}
