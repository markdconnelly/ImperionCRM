/**
 * SLA breach read-model helpers (ADR-0074 §2 / ADR-0044, #404).
 *
 * Pure, dependency-free, NOT server-only — safe to import from server reads, a future
 * ticket-SLA worklist / BI-hub surface, and the vitest suite alike. The breach state
 * itself is a DATABASE PROJECTION (`ticket_sla_breach` view, migration 0118):
 * Autotask is the ticket system of record (no authoritative sla_state store), so the view
 * recomputes breach on every read against the latest pulled silver `ticket`. This module
 * only READS those projected rows and rolls them up for display / sort — it never derives
 * the targets (that is the view's job) and is never random or time-dependent: identical
 * input → identical output.
 */

import type { SlaBreachSummary, TicketSlaBreachRow, TicketSlaState } from "@/types";

/** True when a ticket is breached on either the resolution or first-response SLA. */
export function isBreached(row: TicketSlaBreachRow): boolean {
  return row.resolutionBreached || row.firstResponseBreached;
}

/** True when an OPEN ticket is at risk (the view's `at_risk` bucket). */
export function isAtRisk(row: TicketSlaBreachRow): boolean {
  return row.slaState === "at_risk";
}

/**
 * Worklist sort priority: breached first, then at_risk, then ok, then unknown.
 * Lower number = higher urgency. Stable for `Array.prototype.sort`.
 */
export function slaUrgencyRank(state: TicketSlaState): number {
  switch (state) {
    case "breached":
      return 0;
    case "at_risk":
      return 1;
    case "ok":
      return 2;
    default:
      return 3; // unknown
  }
}

/**
 * Order rows for the SLA worklist (ADR-0074 §2): most urgent first, ties broken by the
 * oldest `openedAt` (longest-running first). Returns a NEW array; input is not mutated.
 */
export function sortByUrgency(rows: TicketSlaBreachRow[]): TicketSlaBreachRow[] {
  return [...rows].sort((a, b) => {
    const byState = slaUrgencyRank(a.slaState) - slaUrgencyRank(b.slaState);
    if (byState !== 0) return byState;
    const ao = a.openedAt ?? "";
    const bo = b.openedAt ?? "";
    return ao < bo ? -1 : ao > bo ? 1 : 0; // oldest opened first
  });
}

/**
 * Roll a set of projected rows up into the SLA breach summary (ADR-0074 §2 worklist
 * headline, BI hub ADR-0062). `breachRate` = breached / total, clamped to 0 when there
 * are no rows (no division by zero, no NaN leaking into the UI). Pure: same input →
 * same output.
 */
export function summarizeBreach(rows: TicketSlaBreachRow[]): SlaBreachSummary {
  const total = rows.length;
  const breached = rows.filter((r) => r.slaState === "breached").length;
  const atRisk = rows.filter((r) => r.slaState === "at_risk").length;
  const ok = rows.filter((r) => r.slaState === "ok").length;
  const breachRate = total === 0 ? 0 : breached / total;
  return { total, breached, atRisk, ok, breachRate };
}
