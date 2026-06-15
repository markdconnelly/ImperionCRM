/**
 * Chatbot-deflection telemetry helpers (ADR-0074 §4, #403).
 *
 * Pure, dependency-free, NOT server-only — safe to import from server reads, a future
 * chat-console / BI-hub surface (#407/#404), and the vitest suite alike. The schema
 * (migration 0117) stores each `chat_session` with its deflection columns; this module
 * holds the DERIVATION ADR-0074 §4 calls the "deflection rate" metric: count the
 * sessions resolved without a ticket over a window, divide by the total. Nothing here
 * is random or time-dependent; identical input → identical output.
 *
 * WHO writes the rows: the backend chat process (ADR-0042 — a process), never the front
 * end. This module only READS what it wrote and rolls it up for display.
 */

import type { ChatDeflectionSummary, ChatSessionRow } from "@/types";

/** True when a session is an active/open conversation (still routable). */
export function isOpenChatSession(row: ChatSessionRow): boolean {
  return row.status === "bot" || row.status === "live";
}

/** True when a session escalated into an Autotask ticket (ADR-0074 §4). */
export function isEscalatedChatSession(row: ChatSessionRow): boolean {
  return row.status === "escalated" || row.escalatedTicketRef != null;
}

/**
 * Roll a set of sessions up into the chatbot-deflection summary (ADR-0074 §4, BI hub
 * ADR-0062). `deflectionRate` = deflected / total, clamped to 0 when there are no
 * sessions (no division by zero, no NaN leaking into the UI). Pure: same input → same
 * output.
 */
export function summarizeDeflection(rows: ChatSessionRow[]): ChatDeflectionSummary {
  const total = rows.length;
  const deflected = rows.filter((r) => r.deflected).length;
  const escalated = rows.filter(isEscalatedChatSession).length;
  const deflectionRate = total === 0 ? 0 : deflected / total;
  return { total, deflected, escalated, deflectionRate };
}
