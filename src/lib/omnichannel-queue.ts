/**
 * Omnichannel inbound-queue projection + prioritization (ADR-0074 §6, #408).
 *
 * Pure, dependency-free, NOT server-only — safe to import from a server read, the queue
 * surface, and the vitest suite alike. Nothing here is random or time-dependent:
 * identical input → identical output.
 *
 * WHAT this is (ADR-0074 §6): the omnichannel queue is a VIEW/orchestration over existing
 * sources — Imperion-native `chat_session` (the only native service-desk store, §5) and
 * silver `ticket` (Autotask is the ticket SoR, §1). It is **not a new system of record**.
 * This module projects each source row into a single `QueueItem` shape and orders them into
 * one prioritized lane so an agent triages everything inbound from one surface.
 *
 * COORDINATION with ICM #280 (the inbound service-desk routing workspace): routing is a
 * backend/orchestrator PROCESS (ADR-0042), not a front-end concern. The queue does not
 * route — it reflects the routing the ICM workspace assigns. Each item carries `routedTo`
 * (the ICM lane) which is **null until that seam is wired**; `routingWired()` lets the
 * surface degrade honestly to a read-only view with a notice rather than fake a router.
 *
 * WHO writes the underlying rows: the backend chat process writes `chat_session`; the
 * pipeline pull writes silver `ticket`. The front end only READS and rolls up for display.
 */

import { isOpenChatSession } from "@/lib/chat-session";
import { slaUrgencyRank } from "@/lib/sla-breach";
import type {
  ChatSessionChannel,
  ChatSessionRow,
  QueueChannel,
  QueueItem,
  QueuePriority,
  QueueSummary,
  TicketRow,
  TicketSlaBreachRow,
  TicketSlaState,
} from "@/types";

/** Map a chat-session channel onto the unified queue channel vocabulary (ADR-0074 §6). */
function channelFromChat(channel: ChatSessionChannel): QueueChannel {
  // The chat channel set is a subset of the queue set; pass through, default to "other".
  switch (channel) {
    case "web_chat":
    case "social":
    case "email":
    case "sms":
    case "voice":
      return channel;
    default:
      return "other";
  }
}

/**
 * Priority of an open chat session: a LIVE (human-handling) conversation is the most
 * time-critical thing in the queue; a bot session is high (a person waiting on a bot);
 * a terminal session (deflected/escalated/closed) is low (no action pending here).
 */
function priorityFromChat(row: ChatSessionRow): QueuePriority {
  if (row.status === "live") return "urgent";
  if (row.status === "bot") return "high";
  return "low";
}

/**
 * Priority of a ticket from its SLA worklist bucket (ADR-0074 §2). `breached` → urgent,
 * `at_risk` → high, `ok` → normal, `unknown`/absent → normal. Lets SLA-priority ordering
 * (§2) drive the unified queue without the queue owning the breach computation.
 */
export function priorityFromSlaState(state: TicketSlaState | undefined): QueuePriority {
  switch (state) {
    case "breached":
      return "urgent";
    case "at_risk":
      return "high";
    default:
      return "normal";
  }
}

/** Project one native chat session into a unified queue item (ADR-0074 §6). */
export function queueItemFromChatSession(row: ChatSessionRow): QueueItem {
  const open = isOpenChatSession(row);
  return {
    id: `chat:${row.id}`,
    source: "chat_session",
    sourceId: row.id,
    channel: channelFromChat(row.channel),
    priority: priorityFromChat(row),
    subject: row.summary?.trim() || "Live chat session",
    account: row.account,
    contactName: row.contactName,
    status: row.status,
    receivedAt: row.startedAt,
    isOpen: open,
    routedTo: null, // ICM #280 routing not surfaced to the FE yet — honest null.
  };
}

/**
 * Project one ticket into a unified queue item (ADR-0074 §6). An optional SLA-breach
 * projection row (keyed by ticket id) supplies the priority + open state (§2); without
 * it the item falls back to `normal` and infers open-ness from a non-resolved status.
 */
export function queueItemFromTicket(
  row: TicketRow,
  sla?: TicketSlaBreachRow,
): QueueItem {
  const isOpen = sla ? sla.isOpen : !isClosedOrUnknownStatus(row.status);
  return {
    id: `ticket:${row.id}`,
    source: "ticket",
    sourceId: row.id,
    channel: "ticket",
    priority: priorityFromSlaState(sla?.slaState),
    subject: row.title || `Ticket ${row.number ?? row.id}`,
    account: row.account || null,
    contactName: null, // not carried on the ticket list row
    status: row.status,
    receivedAt: row.opened,
    isOpen,
    routedTo: null,
  };
}

/**
 * Best-effort open-state inference for a ticket lacking an SLA projection row. A null /
 * blank status is treated as NOT open (we cannot confirm a live work item); a recognized
 * terminal status (complete/closed/resolved) is not open; anything else is open.
 */
function isClosedOrUnknownStatus(status: string | null): boolean {
  if (!status) return true; // no status → treat as not open (conservative)
  const s = status.toLowerCase();
  return s.includes("complete") || s.includes("closed") || s.includes("resolved");
}

/** Sort rank for a queue priority — lower = more urgent. Stable for `Array.sort`. */
export function queuePriorityRank(priority: QueuePriority): number {
  switch (priority) {
    case "urgent":
      return 0;
    case "high":
      return 1;
    case "normal":
      return 2;
    default:
      return 3; // low
  }
}

/**
 * Order the unified queue (ADR-0074 §6): open items before closed, then by priority
 * (urgent → low), then oldest `receivedAt` first (longest-waiting on top). Returns a NEW
 * array; the input is never mutated. Pure: same input → same order.
 */
export function sortQueue(items: QueueItem[]): QueueItem[] {
  return [...items].sort((a, b) => {
    if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1; // open first
    const byPriority = queuePriorityRank(a.priority) - queuePriorityRank(b.priority);
    if (byPriority !== 0) return byPriority;
    const ar = a.receivedAt ?? "";
    const br = b.receivedAt ?? "";
    return ar < br ? -1 : ar > br ? 1 : 0; // oldest first
  });
}

/**
 * Build the prioritized omnichannel queue from the two sources (ADR-0074 §6, #408).
 * `slaByTicketId` (optional) supplies the SLA-breach projection rows for ticket priority
 * (§2). Sorted via `sortQueue`. Pure aggregation — no I/O, no mutation.
 */
export function buildQueue(input: {
  chatSessions: ChatSessionRow[];
  tickets: TicketRow[];
  slaByTicketId?: Map<string, TicketSlaBreachRow>;
}): QueueItem[] {
  const fromChat = input.chatSessions.map(queueItemFromChatSession);
  const fromTickets = input.tickets.map((t) =>
    queueItemFromTicket(t, input.slaByTicketId?.get(t.id)),
  );
  return sortQueue([...fromChat, ...fromTickets]);
}

/**
 * Roll the queue up into the headline summary (ADR-0074 §6, BI hub ADR-0062). Counts
 * total + open + urgent, and open items by normalized channel (zero-channels omitted).
 * Pure: same input → same summary.
 */
export function summarizeQueue(items: QueueItem[]): QueueSummary {
  const open = items.filter((i) => i.isOpen);
  const byChannel: Partial<Record<QueueChannel, number>> = {};
  for (const i of open) {
    byChannel[i.channel] = (byChannel[i.channel] ?? 0) + 1;
  }
  return {
    total: items.length,
    open: open.length,
    urgent: items.filter((i) => i.priority === "urgent").length,
    byChannel,
  };
}

/**
 * Whether the ICM #280 routing seam is wired — i.e. at least one item carries a resolved
 * `routedTo` lane. While false the surface shows a read-only/stub notice instead of
 * pretending the queue actively routes (the repo's stub-don't-fail pattern).
 */
export function routingWired(items: QueueItem[]): boolean {
  return items.some((i) => i.routedTo != null);
}

// Re-export for callers that prioritize a bare SLA state without importing sla-breach.
export { slaUrgencyRank };
