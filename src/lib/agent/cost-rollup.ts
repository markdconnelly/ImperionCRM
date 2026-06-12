/**
 * Cost-rollup presentation helpers — pure (#184, v1 gate 9).
 *
 * The backend's GET /agent/cost-rollup groups spend by audit `action` +
 * `entity_type` (backend #65: agent.turn rows roll up per conversation,
 * board.conclude per board session; future executors — enrichment, sends —
 * appear automatically because they write the same ADR-0032 usage shape).
 * This module maps those wire identifiers to human copy and entity links.
 * Deliberately pure (no pg, no env) so it is unit-testable and importable
 * anywhere, matching `settings.ts`.
 */

/** Friendly copy for the processes the backend meters today. */
const PROCESS_META: Record<string, { label: string; entityNoun: string }> = {
  "agent.turn": { label: "Orchestrator turns", entityNoun: "conversation" },
  "board.conclude": { label: "Board sessions", entityNoun: "board session" },
  "contact.enrich": { label: "Contact enrichment", entityNoun: "enriched contact" },
  "send.draft": { label: "Drafted sends", entityNoun: "drafted send" },
};

/** Human label for a metered process; unknown actions render as themselves. */
export function processLabel(action: string): string {
  return PROCESS_META[action]?.label ?? action;
}

/** What one entity row of a process represents ("board session", "conversation"). */
export function processEntityNoun(action: string, entityType: string | null): string {
  return PROCESS_META[action]?.entityNoun ?? entityType ?? "entity";
}

/**
 * Where an entity drills down to, when it has a page. Board sessions have a
 * transcript page; conversations and future entity kinds don't (yet) — null
 * means render plain text.
 */
export function entityHref(entityType: string | null, entityId: string): string | null {
  if (entityType === "board_session") return `/board/${encodeURIComponent(entityId)}`;
  return null;
}

/** Compact token count for the card ("12.4k", "1.2M"). */
export function formatTokens(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n < 1_000) return String(Math.round(n));
  if (n < 1_000_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Validate a ?month= query value (YYYY-MM); anything else → undefined. */
export function parseMonthParam(v: unknown): string | undefined {
  return typeof v === "string" && MONTH_RE.test(v) ? v : undefined;
}

/** The month before a YYYY-MM month ("2026-01" → "2025-12"). */
export function previousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  return prev;
}

/** Render a YYYY-MM month as "June 2026". */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
