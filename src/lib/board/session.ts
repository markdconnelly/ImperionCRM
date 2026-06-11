/**
 * Pure helpers for the AI Board of Directors pages (ADR-0049, backend ADR-0039).
 *
 * Everything here is presentation logic over the 0056 schema's wire shapes:
 * defensive parsing of `board_recommendation.rationale` jsonb, grouping the
 * `board_message` transcript into deliberation rounds, and status badge metadata.
 * PURE — no pg, no node:*, no env reads — so it is unit-testable directly and
 * safe to import from server and client components alike.
 */

// ── Session status ──────────────────────────────────────────────────────────────

/** board_session.status values (migration 0056). */
export const BOARD_SESSION_STATUSES = ["open", "deliberating", "concluded", "failed"] as const;
export type BoardSessionStatus = (typeof BOARD_SESSION_STATUSES)[number];

export interface StatusMeta {
  label: string;
  /** Tailwind text tone for the badge. */
  tone: string;
}

const STATUS_META: Record<BoardSessionStatus, StatusMeta> = {
  open: { label: "open", tone: "text-accent" },
  deliberating: { label: "deliberating", tone: "text-amber" },
  concluded: { label: "concluded", tone: "text-green" },
  failed: { label: "failed", tone: "text-red" },
};

/** Badge metadata for a session status; unknown values render dim, never throw. */
export function sessionStatusMeta(status: string): StatusMeta {
  return (STATUS_META as Record<string, StatusMeta>)[status] ?? { label: status || "unknown", tone: "text-dim" };
}

// ── Recommendation review (board_recommendation.review_status, 0059) ───────────

/** board_recommendation.review_status values (migration 0059, ADR-0054 §4). */
export const REVIEW_STATUSES = ["pending_review", "ratified", "overruled"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

const REVIEW_META: Record<ReviewStatus, StatusMeta> = {
  pending_review: { label: "pending CISO review", tone: "text-amber" },
  ratified: { label: "ratified", tone: "text-green" },
  overruled: { label: "overruled — not board consensus", tone: "text-red" },
};

/** Badge metadata for a recommendation's review status; unknown renders dim, never throws. */
export function reviewStatusMeta(status: string): StatusMeta {
  return (REVIEW_META as Record<string, StatusMeta>)[status] ?? { label: status || "unknown", tone: "text-dim" };
}

// ── Seat labeling (agent.seat_kind, 0059 — ADR-0054 deputy/advisor model) ──────

/**
 * The label a seat carries next to its name, mirroring how the backend names
 * seats to each other (backend docs/agents/board.md). Deputy turns without a
 * human CISO position are explicitly "unreviewed staff analysis" (epic #122).
 * Null for officers/unknown kinds — they carry no extra label.
 */
export function seatLabel(
  seatKind: string | null | undefined,
  hasCisoPosition: boolean,
): { text: string; tone: string } | null {
  if (seatKind === "deputy") {
    return hasCisoPosition
      ? { text: "deputy — drafts for the human CISO", tone: "text-amber" }
      : { text: "unreviewed staff analysis", tone: "text-amber" };
  }
  if (seatKind === "advisor") {
    return { text: "advisor — counsel, not a vote", tone: "text-accent-2" };
  }
  return null;
}

// ── Rationale (board_recommendation.rationale jsonb) ───────────────────────────

export interface BoardStance {
  role: string;
  stance: string;
}

/** The normalized rationale the recommendation card renders. */
export interface BoardRationale {
  stances: BoardStance[];
  agreements: string[];
  disagreements: string[];
  /** True when the backend recorded a synthesis-JSON parse miss (or we could not parse). */
  parseError: boolean;
}

export const EMPTY_RATIONALE: BoardRationale = {
  stances: [],
  agreements: [],
  disagreements: [],
  parseError: false,
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

function asStances(value: unknown): BoardStance[] {
  if (!Array.isArray(value)) return [];
  const out: BoardStance[] = [];
  for (const item of value) {
    if (item && typeof item === "object") {
      const role = (item as Record<string, unknown>).role;
      const stance = (item as Record<string, unknown>).stance;
      if (typeof role === "string" && typeof stance === "string" && stance.trim()) {
        out.push({ role: role || "—", stance });
      }
    }
  }
  return out;
}

/**
 * Normalize the rationale jsonb defensively (backend ADR-0039 §7: the synthesis
 * JSON is parsed defensively server-side, and we re-defend here). Accepts a
 * parsed object, a JSON string, or garbage; never throws.
 */
export function parseRationale(raw: unknown): BoardRationale {
  let value: unknown = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return { ...EMPTY_RATIONALE, parseError: true };
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value == null ? EMPTY_RATIONALE : { ...EMPTY_RATIONALE, parseError: true };
  }
  const obj = value as Record<string, unknown>;
  return {
    stances: asStances(obj.stances),
    agreements: asStringArray(obj.agreements),
    disagreements: asStringArray(obj.disagreements),
    parseError: obj.parseError === true,
  };
}

// ── Transcript grouping ─────────────────────────────────────────────────────────

/** One transcript message, as the detail page renders it. */
export interface BoardTranscriptMessage {
  id: string;
  /** null = the orchestrator/synthesis voice (0056 contract). */
  agentId: string | null;
  name: string | null;
  personaRole: string | null;
  /** agent.seat_kind (0059) — drives deputy/advisor labeling; absent on the wire tier. */
  seatKind?: string | null;
  content: string;
  createdAt: string;
}

export interface GroupedTranscript {
  /** rounds[0] = opening positions, rounds[1] = cross-examination, … */
  rounds: BoardTranscriptMessage[][];
  /** NULL-agent messages: the synthesis voice and/or failure explanations. */
  synthesis: BoardTranscriptMessage[];
}

/**
 * Group a chronologically-ordered transcript into deliberation rounds: a
 * persona's Nth message belongs to round N (backend ADR-0039's fixed two-round
 * structure — but tolerant of any round count). NULL-agent rows are the
 * synthesis voice (or failure explanations) and group separately.
 */
export function groupTranscript(messages: readonly BoardTranscriptMessage[]): GroupedTranscript {
  const rounds: BoardTranscriptMessage[][] = [];
  const synthesis: BoardTranscriptMessage[] = [];
  const seen = new Map<string, number>();
  for (const m of messages) {
    if (m.agentId === null) {
      synthesis.push(m);
      continue;
    }
    const round = seen.get(m.agentId) ?? 0;
    seen.set(m.agentId, round + 1);
    (rounds[round] ??= []).push(m);
  }
  return { rounds, synthesis };
}

// ── Formatting ──────────────────────────────────────────────────────────────────

/** Relative time for list rows ("3h ago"); falls back to "—" on bad input. */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const min = Math.floor((now - t) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** Compact UTC date-time for detail headers; "—" on bad input. */
export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

/** Trim a topic/recommendation for list rows. */
export function truncate(text: string, max = 120): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}
