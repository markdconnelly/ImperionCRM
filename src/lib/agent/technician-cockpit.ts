/**
 * Read-side for the AI-Technician operator cockpit (#1056, epic #1038).
 *
 * The Technician sub-agent proposes ticket writes (update / reply / log-time) as
 * actions. An action whose ADR-0055 tier exceeds the resolved 1–5 actuation ceiling
 * (the dial, ADR-0109) is parked on the `agent_pending_action` cockpit queue
 * (migration 0158) awaiting a human approve / edit-and-approve / reject. This module
 * lists that queue scoped to the Technician, joined to the silver `ticket` the action
 * targets, so an operator supervises it as a co-pilot before its autonomy is raised.
 *
 * READ-ONLY and degrades in the app's tiers (ADR-0007/0042): DB unset → mock sample
 * rows; query failure → empty list, never a page error. The approve/reject write goes
 * through the backend (the web role has no UPDATE on `agent_pending_action`; ADR-0042) —
 * see `src/app/(app)/operator/actions.ts`. The autonomy dial reuses the ICM
 * `getAutonomyPolicy` reader bound to the `technician` workflow.
 *
 * Server-only.
 */
import "server-only";
import { getPool } from "@/lib/db/client";

/** The Technician's stable sub-agent key (the dial + queue scope). */
export const TECHNICIAN_AGENT_KEY = "technician";

/** One ticket the action targets (silver `ticket`), when the payload carries it. */
export interface CockpitTicketRef {
  id: string;
  number: string | null;
  title: string;
}

/** One parked Technician action awaiting approve / edit / reject. */
export interface TechnicianQueueItem {
  /** `agent_pending_action.id` — the decision target. */
  id: string;
  /** Catalog action kind (e.g. `update_ticket`, `reply_ticket`, `log_time`). */
  actionKind: string;
  /** ADR-0055 tier of the action (T0–T3). */
  tier: string;
  /** Why the Technician proposed this. */
  rationale: string | null;
  /** The 1–5 dial level + tier ceiling that routed this to the cockpit (ADR-0109). */
  resolvedLevel: number | null;
  resolvedCeiling: string | null;
  /** The human-reviewable body extracted from the action payload (editable). */
  draft: string;
  createdAt: string; // ISO
  /** The ticket the action targets, when the payload carries a resolvable id. */
  ticket: CockpitTicketRef | null;
  /** The orchestrator run that proposed this, for the glass-box trace link. */
  runId: string | null;
}

const MOCK_QUEUE: TechnicianQueueItem[] = [
  {
    id: "mock-pending-1",
    actionKind: "reply_ticket",
    tier: "T2",
    rationale:
      "Customer-visible reply (T2) above the Supervised ceiling — routed to the cockpit per the dial.",
    resolvedLevel: 3,
    resolvedCeiling: "T2",
    draft:
      "Hi — I've restarted the print spooler on PRINT-01 and confirmed the queue is clearing. Please try printing again and let me know if it recurs.",
    createdAt: "2026-06-21T14:05:00Z",
    ticket: { id: "mock-ticket-1", number: "T20260621.0042", title: "Print queue stuck on PRINT-01" },
    runId: null,
  },
];

/**
 * Pull the first human-reviewable string out of an action payload, defensively
 * (the catalog shape varies by kind: a reply has a body, an update has a summary).
 */
function draftFromPayload(payload: Record<string, unknown> | null): string {
  if (!payload) return "(no action body captured)";
  const action = (payload.action ?? payload) as Record<string, unknown>;
  for (const key of ["body", "summary", "note", "comment"]) {
    const v = action[key];
    if (typeof v === "string" && v.trim()) return v;
  }
  return "(no action body captured)";
}

function strField(payload: Record<string, unknown> | null, key: string): string | null {
  const v = payload?.[key];
  return typeof v === "string" && v.trim() ? v : null;
}

/** The Technician's parked actions awaiting a decision, newest first. */
export async function listTechnicianQueue(limit = 50): Promise<TechnicianQueueItem[]> {
  const pool = getPool();
  if (!pool) return MOCK_QUEUE;
  try {
    const { rows } = await pool.query<{
      id: string;
      action_kind: string;
      tier: string;
      rationale: string | null;
      resolved_level: number | null;
      resolved_ceiling: string | null;
      payload: Record<string, unknown> | null;
      created_at: string;
      ticket_id: string | null;
      ticket_number: string | null;
      ticket_title: string | null;
    }>(
      // The action payload carries a `ticketId` for ticket-scoped kinds; the cast is
      // guarded so a non-uuid value yields no join rather than a query error.
      `SELECT p.id, p.action_kind, p.tier, p.rationale,
              p.resolved_level, p.resolved_ceiling, p.payload, p.created_at,
              t.id AS ticket_id, t.number AS ticket_number, t.title AS ticket_title
       FROM agent_pending_action p
       LEFT JOIN ticket t ON t.id = CASE
              WHEN p.payload->>'ticketId' ~ '^[0-9a-fA-F-]{36}$'
              THEN (p.payload->>'ticketId')::uuid END
       WHERE p.agent_key = $1 AND p.status = 'pending'
       ORDER BY p.created_at DESC
       LIMIT $2`,
      [TECHNICIAN_AGENT_KEY, Math.min(Math.max(limit, 1), 100)],
    );
    return rows.map((r) => ({
      id: r.id,
      actionKind: r.action_kind,
      tier: r.tier,
      rationale: r.rationale,
      resolvedLevel: r.resolved_level,
      resolvedCeiling: r.resolved_ceiling,
      draft: draftFromPayload(r.payload),
      createdAt: new Date(r.created_at).toISOString(),
      ticket: r.ticket_id
        ? { id: r.ticket_id, number: r.ticket_number, title: r.ticket_title ?? "(untitled ticket)" }
        : null,
      runId: strField(r.payload, "runId"),
    }));
  } catch (err) {
    console.error("Technician cockpit queue read failed:", err);
    return [];
  }
}
