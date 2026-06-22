/**
 * Read-side + shared CONTRACT for the wake-event subscription fan-out (#999, 1C of epic
 * #991/#997, ADR-0111). The schema is migration `agent_subscription` (predicate fan-out for the
 * agent_event inbox of 0164).
 *
 * WHY THIS EXISTS. 0164 shipped the durable wake-event inbox; the backend dispatcher v1
 * HARDCODES the single autotask.ticket.created → technician mapping (a 1:1 type→workflow map
 * that can neither fan ONE event out to N agents nor SKIP a non-matching event). This module
 * is the FE half of #999: the `agent_subscription` table gives each subscription a structured
 * PREDICATE, and the backend dispatcher (ImperionCRM_Backend src/shared/agent/
 * subscription-predicate.ts) evaluates it against the event's subject ∪ payload — match → one
 * agent_run per matched row (fan-out); no match → the event is `ignored`.
 *
 * THE PREDICATE CONTRACT IS CANON HERE (the front end owns the schema, system CLAUDE.md §1/§11).
 * The backend mirrors {@link AgentSubscriptionPredicate} EXACTLY — keep the two in lockstep. See
 * `docs/agents/event-subscription-predicate.md` for the prose contract.
 *
 * This module is READ-ONLY and degrades in the standard tiers (ADR-0007/0042): DB unset → mock
 * rows; query failure → empty list, never a page error. Subscription writes (create/toggle/edit
 * rules — the admin config surface) are a later issue; the backend dispatcher only SELECTs.
 *
 * Server-only.
 */
import "server-only";
import { getPool } from "@/lib/db/client";

// ── The predicate contract (DATA, never code — mirrored verbatim in the backend evaluator) ───

/** The comparison operators a leaf predicate may use. */
export type PredicateOp =
  | "eq" // strict equality (string | number | bool)
  | "ne" // strict inequality
  | "in" // membership; value is a JSON array
  | "nin" // non-membership; value is a JSON array
  | "gt" // numeric >  (non-numeric operand ⇒ NO MATCH, deny-safe)
  | "gte" // numeric >=
  | "lt" // numeric <
  | "lte" // numeric <=
  | "exists" // field present & non-null when value=true, absent when value=false
  | "contains"; // substring of a string field, OR a member of an array field

/** A single field/op/value test against the event's subject ∪ payload field bag. */
export interface PredicateLeaf {
  /** Dot path into the field bag, e.g. "severity", "account.tier", "queueId". */
  field: string;
  op: PredicateOp;
  /** The comparand (shape depends on op: array for in/nin, bool for exists, scalar otherwise). */
  value?: unknown;
}

/** A boolean combinator over child nodes (arbitrarily nestable). */
export interface PredicateAll {
  all: AgentSubscriptionPredicate[];
}
export interface PredicateAny {
  any: AgentSubscriptionPredicate[];
}
export interface PredicateNot {
  not: AgentSubscriptionPredicate;
}

/**
 * A structured subscription predicate. A leaf {@link PredicateLeaf}, a compound
 * {@link PredicateAll}/{@link PredicateAny}/{@link PredicateNot}, or `{}` (match-all). The
 * backend evaluator treats a MALFORMED non-empty predicate as NO MATCH (deny-safe) — never a
 * crash, never match-by-default.
 */
export type AgentSubscriptionPredicate =
  | PredicateLeaf
  | PredicateAll
  | PredicateAny
  | PredicateNot
  | Record<string, never>; // {} = match-all

// ── The row shape ────────────────────────────────────────────────────────────────────────

/** One subscription rule (an `agent_subscription` row) as the operator surface lists it. */
export interface AgentSubscriptionRow {
  id: string;
  /** Dotted event type this rule subscribes to, e.g. "autotask.ticket.created". */
  eventType: string;
  /** ICM workflow slug woken on a predicate match, e.g. "technician". */
  workflowKey: string;
  /** Structured predicate ({} = match-all). */
  predicate: AgentSubscriptionPredicate;
  enabled: boolean;
  /** Optional human label for the operator surface (cosmetic). */
  description: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

const MOCK_SUBSCRIPTIONS: AgentSubscriptionRow[] = [
  {
    id: "mock-sub-1",
    eventType: "autotask.ticket.created",
    workflowKey: "technician",
    predicate: {},
    enabled: true,
    description: "v1 wedge: every new Autotask ticket wakes the Technician (match-all).",
    createdAt: "2026-06-22T00:00:00Z",
    updatedAt: "2026-06-22T00:00:00Z",
  },
  {
    id: "mock-sub-2",
    eventType: "autotask.ticket.created",
    workflowKey: "vcio",
    predicate: { field: "account.tier", op: "eq", value: "tier-1" },
    enabled: true,
    description: "Wake the vCIO only for tier-1 accounts (fan-out example).",
    createdAt: "2026-06-22T00:00:00Z",
    updatedAt: "2026-06-22T00:00:00Z",
  },
];

/**
 * List the subscription rules, optionally filtered to one event type. Read-only; degrades to
 * mock rows when the DB is unset and to an empty list on query failure (never throws to the page).
 */
export async function listAgentSubscriptions(eventType?: string): Promise<AgentSubscriptionRow[]> {
  const pool = getPool();
  if (!pool) {
    return eventType
      ? MOCK_SUBSCRIPTIONS.filter((s) => s.eventType === eventType)
      : MOCK_SUBSCRIPTIONS;
  }
  try {
    const { rows } = await pool.query<{
      id: string;
      event_type: string;
      workflow_key: string;
      predicate: AgentSubscriptionPredicate | null;
      enabled: boolean;
      description: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id::text AS id, event_type, workflow_key, predicate, enabled, description,
              created_at, updated_at
         FROM agent_subscription
        WHERE ($1::text IS NULL OR event_type = $1)
        ORDER BY event_type, workflow_key`,
      [eventType ?? null],
    );
    return rows.map((r) => ({
      id: r.id,
      eventType: r.event_type,
      workflowKey: r.workflow_key,
      predicate: r.predicate ?? {},
      enabled: r.enabled,
      description: r.description,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString(),
    }));
  } catch {
    return [];
  }
}
