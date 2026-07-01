/**
 * Read-side for the native approval cockpit (#1014, parent #996 / 2E, ADR-0107 D5).
 *
 * The cross-agent companion to the Technician-scoped cockpit (#1056): where
 * `technician-cockpit.ts` lists only the `technician` agent's queue, this lists EVERY
 * sub-agent's parked actions in one place. The backend enqueues an action whose ADR-0055
 * tier exceeds the resolved 1–5 actuation ceiling (the dial, ADR-0109) onto the
 * `agent_pending_action` queue (migration 0158); this module reads it for the native
 * cockpit so an admin supervises any agent's pending work — proposing agent, tier,
 * rationale, target, the dial decision that routed it — and approves / rejects it.
 *
 * READ-ONLY and degrades in the app's tiers (ADR-0007/0042): DB unset → mock sample
 * rows; query failure → empty list, never a page error. The approve/reject write goes
 * through the backend (the web role has no UPDATE on `agent_pending_action`; ADR-0042) —
 * see `decidePendingActionAction` in `src/app/(app)/operator/actions.ts`, wired to
 * `POST /orchestration/cockpit/decide` (backend #267).
 *
 * Server-only.
 */
import "server-only";
import { getPool } from "@/lib/db/client";
import { HUMAN_FOLLOW_UP_KIND } from "./pending-action-kind";

/** A target the action acts on, when the payload carries a resolvable reference. */
export interface PendingActionTarget {
  /** Short label, e.g. a ticket number or a contact name. */
  label: string;
  /** In-app href when we can resolve one; null otherwise. */
  href: string | null;
}

// Re-export the client-safe kind constant so existing server-side importers keep working;
// the client cockpit imports it directly from `./pending-action-kind` (never from this
// `server-only` module, which would break the client bundle — #1784 build fix).
export { HUMAN_FOLLOW_UP_KIND };

/** One parked agent action awaiting an approve / reject decision (any agent). */
export interface PendingActionItem {
  /** `agent_pending_action.id` — the decision target. */
  id: string;
  /** The proposing sub-agent's stable key (e.g. `technician`, `sales`). */
  agentKey: string;
  /** Human-friendly proposing-agent label (roster name), derived from `agentKey`. */
  agentLabel: string;
  /** Catalog action kind (e.g. `update_ticket`, `send_email`, `log_time`). */
  actionKind: string;
  /** ADR-0055 tier of the action (T0–T3). */
  tier: string;
  /** Why the agent proposed this. */
  rationale: string | null;
  /** The 1–5 dial level + tier ceiling that routed this to the cockpit (ADR-0109). */
  resolvedLevel: number | null;
  resolvedCeiling: string | null;
  /** The human-reviewable body extracted from the action payload (editable). */
  draft: string;
  createdAt: string; // ISO
  /** What the action targets, when the payload carries a resolvable reference. */
  target: PendingActionTarget | null;
  /** The orchestrator run that proposed this, for the glass-box trace link. */
  runId: string | null;
}

/**
 * Map a sub-agent key to its roster display name (`docs/agents/agent-roster.md`). The
 * cockpit shows the name an operator recognises; an unknown key falls back to the key
 * itself so a newly-registered agent still renders (no hard-coding required to ship).
 */
const AGENT_LABELS: Record<string, string> = {
  technician: "Felix · Service",
  service: "Felix · Service",
  felix: "Felix · Service",
  sales: "Chase · Sales",
  chase: "Chase · Sales",
  marketing: "Belle · Marketing",
  belle: "Belle · Marketing",
  finance: "Audrey · Finance",
  audrey: "Audrey · Finance",
  procurement: "Vance · Procurement",
  vance: "Vance · Procurement",
  delivery: "Pierce · Delivery",
  projects: "Pierce · Delivery",
  pierce: "Pierce · Delivery",
  "client-success": "Celeste · Client Success",
  celeste: "Celeste · Client Success",
  platform: "Vera · Governance",
  governance: "Vera · Governance",
  vera: "Vera · Governance",
};

export function agentLabel(agentKey: string): string {
  return AGENT_LABELS[agentKey] ?? agentKey;
}

const MOCK_QUEUE: PendingActionItem[] = [
  {
    id: "mock-pending-1",
    agentKey: "technician",
    agentLabel: "Felix · Service",
    actionKind: "reply_ticket",
    tier: "T2",
    rationale:
      "Customer-visible reply (T2) above the Supervised ceiling — routed to the cockpit per the dial.",
    resolvedLevel: 3,
    resolvedCeiling: "T2",
    draft:
      "Hi — I've restarted the print spooler on PRINT-01 and confirmed the queue is clearing. Please try printing again and let me know if it recurs.",
    createdAt: "2026-06-21T14:05:00Z",
    target: { label: "T20260621.0042 · Print queue stuck on PRINT-01", href: "/tickets?query=T20260621.0042" },
    runId: null,
  },
  {
    id: "mock-pending-2",
    agentKey: "sales",
    agentLabel: "Chase · Sales",
    actionKind: "send_email",
    tier: "T2",
    rationale:
      "Lead-response email to a new inbound contact (T2, client-facing) — held for review while the dial is Supervised.",
    resolvedLevel: 3,
    resolvedCeiling: "T2",
    draft:
      "Hi Dana — thanks for reaching out about managed IT. I'd love to set up a quick 20-minute call to learn about your environment. Are you free Thursday afternoon?",
    createdAt: "2026-06-21T15:20:00Z",
    target: null,
    runId: null,
  },
  {
    id: "mock-pending-3",
    agentKey: "marketing",
    agentLabel: "Belle · Marketing",
    actionKind: HUMAN_FOLLOW_UP_KIND,
    tier: "T2",
    rationale:
      "Drafted reply denied on review — the inbound Instagram DM still owes the customer a response. Routed here for a human to answer directly (ADR-0109 deny-route).",
    resolvedLevel: 3,
    resolvedCeiling: "T2",
    draft: "(no action body captured)",
    createdAt: "2026-06-21T15:40:00Z",
    target: null,
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

/**
 * One agent action that already EXECUTED (or whose undo window expired) — the L4
 * oversight half (#1202, ADR-0107 D5 / ADR-0109). At autonomy level 4
 * (Autonomous-with-oversight) the backend executes inline then parks the row here so an
 * operator can review it after the fact and, while the undo window is open, undo it
 * (a compensating action via the backend — twin of the decide endpoint, backend #267).
 */
export interface ExecutedActionItem {
  /** `agent_pending_action.id` — the undo target. */
  id: string;
  agentKey: string;
  agentLabel: string;
  actionKind: string;
  tier: string;
  rationale: string | null;
  resolvedLevel: number | null;
  resolvedCeiling: string | null;
  /** The action body that executed (read-only on the oversight surface). */
  draft: string;
  /** `status` — `executed` (undo may still be open) or `expired` (window closed). */
  status: "executed" | "expired";
  /** Who/what decided it: the approver, or the agent itself for an autonomous L4 run. */
  decidedByUserId: string | null;
  /** When it executed (or the window closed), ISO. */
  decidedAt: string | null;
  createdAt: string; // ISO
  /** The execution interaction, for the audit/trace link. */
  interactionId: string | null;
  target: PendingActionTarget | null;
  runId: string | null;
}

const MOCK_EXECUTED: ExecutedActionItem[] = [
  {
    id: "mock-executed-1",
    agentKey: "technician",
    agentLabel: "Felix · Service",
    actionKind: "reply_ticket",
    tier: "T2",
    rationale:
      "Autonomous-with-oversight (L4): customer reply executed inline, surfaced here for after-the-fact review within the undo window.",
    resolvedLevel: 4,
    resolvedCeiling: "T2",
    draft:
      "Hi — I've applied the recommended firmware update to SWITCH-02 and confirmed all ports are back up. Closing this out; reopen if anything recurs.",
    status: "executed",
    decidedByUserId: null,
    decidedAt: "2026-06-21T16:40:00Z",
    createdAt: "2026-06-21T16:39:30Z",
    interactionId: "mock-interaction-1",
    target: { label: "T20260621.0051 · SWITCH-02 ports flapping", href: "/tickets?query=T20260621.0051" },
    runId: null,
  },
  {
    id: "mock-executed-2",
    agentKey: "sales",
    agentLabel: "Chase · Sales",
    actionKind: "send_email",
    tier: "T2",
    rationale:
      "L4 lead follow-up sent autonomously; the undo window has since closed (terminal).",
    resolvedLevel: 4,
    resolvedCeiling: "T2",
    draft:
      "Hi Marcus — following up on our chat. I've attached the managed-IT overview; happy to walk through it whenever suits.",
    status: "expired",
    decidedByUserId: null,
    decidedAt: "2026-06-20T11:05:00Z",
    createdAt: "2026-06-20T11:04:40Z",
    interactionId: "mock-interaction-2",
    target: null,
    runId: null,
  },
];

/** All agents' parked actions awaiting a decision, newest first. */
export async function listPendingActions(limit = 100): Promise<PendingActionItem[]> {
  const pool = getPool();
  if (!pool) return MOCK_QUEUE;
  try {
    const { rows } = await pool.query<{
      id: string;
      agent_key: string;
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
      `SELECT p.id, p.agent_key, p.action_kind, p.tier, p.rationale,
              p.resolved_level, p.resolved_ceiling, p.payload, p.created_at,
              t.id AS ticket_id, t.number AS ticket_number, t.title AS ticket_title
       FROM agent_pending_action p
       LEFT JOIN ticket t ON t.id = CASE
              WHEN p.payload->>'ticketId' ~ '^[0-9a-fA-F-]{36}$'
              THEN (p.payload->>'ticketId')::uuid END
       WHERE p.status = 'pending'
       ORDER BY p.created_at DESC
       LIMIT $1`,
      [Math.min(Math.max(limit, 1), 200)],
    );
    return rows.map((r) => ({
      id: r.id,
      agentKey: r.agent_key,
      agentLabel: agentLabel(r.agent_key),
      actionKind: r.action_kind,
      tier: r.tier,
      rationale: r.rationale,
      resolvedLevel: r.resolved_level,
      resolvedCeiling: r.resolved_ceiling,
      draft: draftFromPayload(r.payload),
      createdAt: new Date(r.created_at).toISOString(),
      target: r.ticket_id
        ? {
            label: `${r.ticket_number ? `${r.ticket_number} · ` : ""}${r.ticket_title ?? "ticket"}`,
            href: `/tickets?query=${encodeURIComponent(r.ticket_number ?? r.ticket_title ?? "")}`,
          }
        : null,
      runId: strField(r.payload, "runId"),
    }));
  } catch (err) {
    console.error("Pending-action cockpit queue read failed:", err);
    return [];
  }
}

/**
 * All agents' EXECUTED (or expired) actions for the L4 oversight view (#1202), newest
 * decision first. These already ran inline at autonomy level 4; the operator reviews them
 * after the fact and undoes them while the window is open. `executed` rows are still
 * potentially undoable; `expired` rows are terminal (window closed). Same honest
 * degradation as the pending read: DB unset → mock sample; query failure → empty list.
 */
export async function listExecutedActions(limit = 100): Promise<ExecutedActionItem[]> {
  const pool = getPool();
  if (!pool) return MOCK_EXECUTED;
  try {
    const { rows } = await pool.query<{
      id: string;
      agent_key: string;
      action_kind: string;
      tier: string;
      rationale: string | null;
      resolved_level: number | null;
      resolved_ceiling: string | null;
      payload: Record<string, unknown> | null;
      status: "executed" | "expired";
      decided_by_user_id: string | null;
      decided_at: string | null;
      created_at: string;
      interaction_id: string | null;
      ticket_id: string | null;
      ticket_number: string | null;
      ticket_title: string | null;
    }>(
      `SELECT p.id, p.agent_key, p.action_kind, p.tier, p.rationale,
              p.resolved_level, p.resolved_ceiling, p.payload, p.status,
              p.decided_by_user_id, p.decided_at, p.created_at, p.interaction_id,
              t.id AS ticket_id, t.number AS ticket_number, t.title AS ticket_title
       FROM agent_pending_action p
       LEFT JOIN ticket t ON t.id = CASE
              WHEN p.payload->>'ticketId' ~ '^[0-9a-fA-F-]{36}$'
              THEN (p.payload->>'ticketId')::uuid END
       WHERE p.status IN ('executed', 'expired')
       ORDER BY p.decided_at DESC NULLS LAST, p.created_at DESC
       LIMIT $1`,
      [Math.min(Math.max(limit, 1), 200)],
    );
    return rows.map((r) => ({
      id: r.id,
      agentKey: r.agent_key,
      agentLabel: agentLabel(r.agent_key),
      actionKind: r.action_kind,
      tier: r.tier,
      rationale: r.rationale,
      resolvedLevel: r.resolved_level,
      resolvedCeiling: r.resolved_ceiling,
      draft: draftFromPayload(r.payload),
      status: r.status,
      decidedByUserId: r.decided_by_user_id,
      decidedAt: r.decided_at ? new Date(r.decided_at).toISOString() : null,
      createdAt: new Date(r.created_at).toISOString(),
      interactionId: r.interaction_id,
      target: r.ticket_id
        ? {
            label: `${r.ticket_number ? `${r.ticket_number} · ` : ""}${r.ticket_title ?? "ticket"}`,
            href: `/tickets?query=${encodeURIComponent(r.ticket_number ?? r.ticket_title ?? "")}`,
          }
        : null,
      runId: strField(r.payload, "runId"),
    }));
  } catch (err) {
    console.error("Executed-action oversight read failed:", err);
    return [];
  }
}
