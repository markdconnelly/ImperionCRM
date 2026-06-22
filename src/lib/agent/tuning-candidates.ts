/**
 * Tuning-candidate presentation types + pure mapper (#1037, ADR-0119) — the feedback loop's
 * read surface. A tuning candidate is a Mark-gated PROPOSAL (prompt|grant|skill change) opened
 * by a failed eval / low-scored run; it never auto-applies (ADR-0119, ceiling #1036).
 *
 * Pure module (no `server-only`, no DB) so it is unit-testable; the server data-fetch lives in
 * `tuning-candidates-data.ts` (the eval-runs.ts / eval-runs-data.ts split).
 */

/** A tuning candidate, as the cockpit renders it. */
export interface TuningCandidateRow {
  id: string;
  kind: "prompt" | "grant" | "skill";
  module: string | null;
  title: string;
  rationale: string;
  status: "open" | "accepted" | "rejected" | "applied";
  externalRef: string | null;
  createdAt: string; // ISO
}

/** Raw `agent_tuning_candidate` row shape as pg returns it. */
export interface TuningCandidateDbRow {
  id: string;
  kind: string;
  module: string | null;
  title: string;
  rationale: string;
  status: string;
  external_ref: string | null;
  created_at: string | Date;
}

const KINDS = new Set(["prompt", "grant", "skill"]);
const STATUSES = new Set(["open", "accepted", "rejected", "applied"]);

export const MOCK_TUNING_CANDIDATES: TuningCandidateRow[] = [
  {
    id: "mock-tc-1",
    kind: "prompt",
    module: "sales",
    title: "Tighten the sales-outreach refusal on cross-customer data",
    rationale: "Eval case 'does not leak another customer's data' scored 0.61 < 0.75 baseline.",
    status: "open",
    externalRef: null,
    createdAt: "2026-06-21T09:00:00Z",
  },
  {
    id: "mock-tc-2",
    kind: "grant",
    module: "reporting",
    title: "Add search_knowledge grant so revenue answers can cite",
    rationale: "Low-scored run: ungrounded figure (no citation tool available in scope).",
    status: "applied",
    externalRef: "https://github.com/markdconnelly/ImperionCRM/issues/0000",
    createdAt: "2026-06-20T14:30:00Z",
  },
];

/** Raw DB shape → the row the cockpit renders. Pure; unit-tested. Unknown enums fail safe. */
export function mapTuningCandidateRow(r: TuningCandidateDbRow): TuningCandidateRow {
  return {
    id: r.id,
    kind: (KINDS.has(r.kind) ? r.kind : "prompt") as TuningCandidateRow["kind"],
    module: r.module,
    title: r.title,
    rationale: r.rationale,
    status: (STATUSES.has(r.status) ? r.status : "open") as TuningCandidateRow["status"],
    externalRef: r.external_ref,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

/** Tone for a candidate status badge (matches the eval dashboard's statusTone vocabulary). */
export function statusTone(status: string): string {
  if (status === "applied" || status === "accepted") return "text-green";
  if (status === "rejected") return "text-dim";
  return "text-amber"; // open — awaiting a human decision
}
