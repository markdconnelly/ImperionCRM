/**
 * Read-side for the wake-event observability + DLQ surface (#1000, 1D of epic #991/#997,
 * ADR-0111). Builds on the agent_event inbox (0164), agent_subscription predicate fan-out
 * (0181), and the DLQ + replay columns (migration 0183).
 *
 * WHY THIS EXISTS. The wake substrate is now production-shaped: events fan out 1:N to runs
 * (#999/#357), failed dispatches dead-letter instead of silently dropping (#1000), and an admin
 * can replay a dead-lettered event. This module is the GLASS BOX over all of that — the read
 * surface the operator view renders: recent events with their lifecycle, the resulting runs, and
 * the DLQ depth/queue.
 *
 * THE 1:N CONTRACT (critical — do NOT assume 1:1). After #999/#357 a single agent_event can open
 * N agent_runs (one per matched agent_subscription). agent_event.run_id stamps only the FIRST /
 * representative run; the FULL set is recoverable from each run's
 * permission_scope->>'eventKey' = '<event_id>:<workflow>'. So this reader enumerates per-event
 * runs by MATCHING that eventKey prefix (`<event_id>:%`), NOT by the single run_id FK. The
 * matched-subscription column is likewise the set of workflows that produced a run for the event.
 *
 * READ-ONLY and degrades in the standard tiers (ADR-0007/0042): DB unset → mock sample rows;
 * query failure → empty/zero, never a page error. The replay WRITE is backend-owned (the web
 * role has no UPDATE that re-pends a dead row through the dispatch path; ADR-0042) — see
 * `replayDeadLetteredEventAction` in `src/app/(app)/operator/actions.ts`, wired to the backend
 * `POST /agent/events/replay` (BE twin of #1000).
 *
 * Server-only.
 */
import "server-only";
import { getPool } from "@/lib/db/client";

/** One agent_run that an event opened, enumerated via its eventKey ('<event_id>:<workflow>'). */
export interface EventRunRef {
  /** agent_run.id. */
  runId: string;
  /** The workflow slug parsed from the eventKey suffix (the run this event opened for it). */
  workflowKey: string;
  /** running | succeeded | failed | cancelled (agent_run.status). */
  status: string;
  startedAt: string; // ISO
}

/** Lifecycle status of an agent_event row (mirrors the 0164 CHECK). */
export type AgentEventStatus =
  | "pending"
  | "claimed"
  | "dispatched"
  | "deferred"
  | "dead"
  | "ignored";

/** One recent wake event with its lineage: matched subscriptions → resulting runs (#1000). */
export interface EventLineageRow {
  /** agent_event.id. */
  id: string;
  eventType: string;
  source: string;
  status: AgentEventStatus;
  attempts: number;
  /** Last dispatch failure (diagnostics; never a secret). */
  lastError: string | null;
  createdAt: string; // ISO
  dispatchedAt: string | null; // ISO
  deadLetteredAt: string | null; // ISO
  replayedAt: string | null; // ISO
  /** All runs this event opened, enumerated via eventKey (1:N — never assume 1:1). */
  runs: EventRunRef[];
}

/** One dead-lettered event awaiting (or eligible for) an admin replay (#1000 DLQ). */
export interface DeadLetterRow {
  id: string;
  eventType: string;
  source: string;
  attempts: number;
  lastError: string | null;
  createdAt: string; // ISO
  deadLetteredAt: string | null; // ISO
  /** Set once an admin has replayed it (re-pended); null = still parked dead. */
  replayedAt: string | null; // ISO
}

/** DLQ depth snapshot for the surface header. */
export interface DlqDepth {
  /** Rows currently parked status='dead'. */
  dead: number;
  /** Rows parked status='deferred' (transient failure, retrying) — early-warning signal. */
  deferred: number;
}

// ── Mock samples (DB-unset tier) ─────────────────────────────────────────────────────────────

const MOCK_LINEAGE: EventLineageRow[] = [
  {
    id: "mock-evt-1",
    eventType: "autotask.ticket.created",
    source: "pipeline:webhook:autotask",
    status: "dispatched",
    attempts: 1,
    lastError: null,
    createdAt: "2026-06-22T09:00:00Z",
    dispatchedAt: "2026-06-22T09:00:05Z",
    deadLetteredAt: null,
    replayedAt: null,
    runs: [
      { runId: "mock-run-tech", workflowKey: "technician", status: "succeeded", startedAt: "2026-06-22T09:00:05Z" },
      { runId: "mock-run-vcio", workflowKey: "vcio", status: "running", startedAt: "2026-06-22T09:00:05Z" },
    ],
  },
  {
    id: "mock-evt-2",
    eventType: "autotask.ticket.created",
    source: "pipeline:webhook:autotask",
    status: "dead",
    attempts: 5,
    lastError: "createIcmRun failed: producer unavailable",
    createdAt: "2026-06-22T08:30:00Z",
    dispatchedAt: null,
    deadLetteredAt: "2026-06-22T08:36:00Z",
    replayedAt: null,
    runs: [],
  },
  {
    id: "mock-evt-3",
    eventType: "docusign.envelope.completed",
    source: "pipeline:webhook:docusign",
    status: "ignored",
    attempts: 1,
    lastError: null,
    createdAt: "2026-06-22T08:00:00Z",
    dispatchedAt: null,
    deadLetteredAt: null,
    replayedAt: null,
    runs: [],
  },
];

const MOCK_DEAD: DeadLetterRow[] = [
  {
    id: "mock-evt-2",
    eventType: "autotask.ticket.created",
    source: "pipeline:webhook:autotask",
    attempts: 5,
    lastError: "createIcmRun failed: producer unavailable",
    createdAt: "2026-06-22T08:30:00Z",
    deadLetteredAt: "2026-06-22T08:36:00Z",
    replayedAt: null,
  },
];

// ── Reads ──────────────────────────────────────────────────────────────────────────────────

/**
 * Recent wake events with their lineage, newest first. Each row carries the runs the event
 * opened, enumerated via the eventKey prefix (`<event_id>:%`) so fan-out (1:N) is surfaced in
 * full — agent_event.run_id alone would show only the representative run.
 */
export async function listRecentEventLineage(limit = 50): Promise<EventLineageRow[]> {
  const pool = getPool();
  if (!pool) return MOCK_LINEAGE;
  const cap = Math.min(Math.max(limit, 1), 200);
  try {
    // The lateral join enumerates every agent_run whose permission_scope.eventKey starts with
    // this event's id — i.e. all '<event_id>:<workflow>' runs the fan-out opened. json_agg of an
    // empty set yields '[]' so an event with no runs renders cleanly. The workflow is parsed from
    // the eventKey suffix (after the first ':') — the dispatcher's '<event_id>:<workflow>' shape.
    const { rows } = await pool.query<{
      id: string;
      event_type: string;
      source: string;
      status: AgentEventStatus;
      attempts: number;
      last_error: string | null;
      created_at: Date;
      dispatched_at: Date | null;
      dead_lettered_at: Date | null;
      replayed_at: Date | null;
      runs: Array<{ runId: string; workflowKey: string; status: string; startedAt: string }> | null;
    }>(
      `SELECT e.id::text AS id, e.event_type, e.source, e.status, e.attempts, e.last_error,
              e.created_at, e.dispatched_at, e.dead_lettered_at, e.replayed_at,
              COALESCE(r.runs, '[]'::json) AS runs
         FROM agent_event e
         LEFT JOIN LATERAL (
           SELECT json_agg(json_build_object(
                    'runId', ar.id::text,
                    'workflowKey', split_part(ar.permission_scope->>'eventKey', ':', 2),
                    'status', ar.status,
                    'startedAt', ar.started_at
                  ) ORDER BY ar.started_at) AS runs
             FROM agent_run ar
            WHERE ar.permission_scope->>'eventKey' LIKE e.id::text || ':%'
         ) r ON true
        ORDER BY e.created_at DESC
        LIMIT $1`,
      [cap],
    );
    return rows.map((r) => ({
      id: r.id,
      eventType: r.event_type,
      source: r.source,
      status: r.status,
      attempts: r.attempts,
      lastError: r.last_error,
      createdAt: r.created_at.toISOString(),
      dispatchedAt: r.dispatched_at ? r.dispatched_at.toISOString() : null,
      deadLetteredAt: r.dead_lettered_at ? r.dead_lettered_at.toISOString() : null,
      replayedAt: r.replayed_at ? r.replayed_at.toISOString() : null,
      runs: (r.runs ?? []).map((run) => ({
        runId: run.runId,
        workflowKey: run.workflowKey || "(unknown)",
        status: run.status,
        startedAt: new Date(run.startedAt).toISOString(),
      })),
    }));
  } catch (err) {
    console.error("Event lineage read failed:", err);
    return [];
  }
}

/** The dead-lettered events (the DLQ), newest-dead first — the admin replay queue. */
export async function listDeadLetteredEvents(limit = 100): Promise<DeadLetterRow[]> {
  const pool = getPool();
  if (!pool) return MOCK_DEAD;
  const cap = Math.min(Math.max(limit, 1), 200);
  try {
    const { rows } = await pool.query<{
      id: string;
      event_type: string;
      source: string;
      attempts: number;
      last_error: string | null;
      created_at: Date;
      dead_lettered_at: Date | null;
      replayed_at: Date | null;
    }>(
      `SELECT id::text AS id, event_type, source, attempts, last_error,
              created_at, dead_lettered_at, replayed_at
         FROM agent_event
        WHERE status = 'dead'
        ORDER BY dead_lettered_at DESC NULLS LAST, created_at DESC
        LIMIT $1`,
      [cap],
    );
    return rows.map((r) => ({
      id: r.id,
      eventType: r.event_type,
      source: r.source,
      attempts: r.attempts,
      lastError: r.last_error,
      createdAt: r.created_at.toISOString(),
      deadLetteredAt: r.dead_lettered_at ? r.dead_lettered_at.toISOString() : null,
      replayedAt: r.replayed_at ? r.replayed_at.toISOString() : null,
    }));
  } catch (err) {
    console.error("Dead-letter queue read failed:", err);
    return [];
  }
}

/** DLQ depth (dead + deferred) for the surface header. Degrades to zeros. */
export async function getDlqDepth(): Promise<DlqDepth> {
  const pool = getPool();
  if (!pool) return { dead: MOCK_DEAD.length, deferred: 0 };
  try {
    const { rows } = await pool.query<{ status: string; n: string }>(
      `SELECT status, count(*)::text AS n
         FROM agent_event
        WHERE status IN ('dead', 'deferred')
        GROUP BY status`,
    );
    const byStatus = new Map(rows.map((r) => [r.status, Number(r.n)]));
    return { dead: byStatus.get("dead") ?? 0, deferred: byStatus.get("deferred") ?? 0 };
  } catch (err) {
    console.error("DLQ depth read failed:", err);
    return { dead: 0, deferred: 0 };
  }
}
