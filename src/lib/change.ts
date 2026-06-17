/**
 * Change Enablement pure helpers (ADR-0079, #656) — labels, the type/status pick-lists,
 * route-param narrowing, and the effective-risk resolution. PURE (no pg, no env, no
 * node:*) so it is unit-testable and importable in client + server alike. The actual
 * persistence lives in the postgres repository (`changes`); the mock returns []/null.
 */
import type {
  ChangeType,
  ChangeStatus,
  ChangeApprovalStatus,
  ApprovalDecision,
  ConfigurationItem,
  CiRelationship,
  CiType,
} from "@/types";
import { analyzeImpact, type CiRef } from "@/lib/cmdb/impact";
import { CRITICALITY_WEIGHT, effectiveCriticality } from "@/lib/cmdb/criticality";
import { ciKey } from "@/lib/cmdb/ci";

/** The ITIL change types, in form/order. */
export const CHANGE_TYPES: readonly ChangeType[] = [
  "standard",
  "normal",
  "emergency",
] as const;

/** Human label per change type (form options + badges). */
export const CHANGE_TYPE_LABEL: Record<ChangeType, string> = {
  standard: "Standard — pre-authorized, low-risk",
  normal: "Normal — assessed + approved",
  emergency: "Emergency — expedited",
};

/** The change lifecycle states. */
export const CHANGE_STATUSES: readonly ChangeStatus[] = [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "scheduled",
  "completed",
  "cancelled",
] as const;

/** Human label per status (badge text). */
export const CHANGE_STATUS_LABEL: Record<ChangeStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Human label per approval status (#659). */
export const CHANGE_APPROVAL_LABEL: Record<ChangeApprovalStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

/** Narrow an arbitrary string to a known change type (form/route guard). */
export function asChangeType(value: string | undefined): ChangeType | null {
  return value && (CHANGE_TYPES as readonly string[]).includes(value)
    ? (value as ChangeType)
    : null;
}

// ── Lightweight approval state machine (#659, ADR-0079) ───────────────────────────────────
// ADR-0079 chose a LIGHTWEIGHT, type-keyed approval — explicitly NOT the board/deputy
// pattern. The flow is a pure function of `change_type`:
//   • standard  — pre-authorized: auto-approved on create (no human action).
//   • normal    — requires an approver to approve/reject.
//   • emergency — expedited: still requires an approver action, but flagged urgent/fast-track.
// Approval state is the (status, approvalStatus) pair on the change overlay. These helpers are
// PURE so they unit-test cleanly and the same machine drives create + the approver action.

/** The (lifecycle, approval) state pair the machine resolves to. */
export interface ChangeApprovalState {
  status: ChangeStatus;
  approvalStatus: ChangeApprovalStatus;
}

/** True when a change of this type needs a human approver (normal + emergency). */
export function requiresApproval(type: ChangeType): boolean {
  return type !== "standard";
}

/** True when this type is an expedited/fast-track approval (emergency). Drives the urgent flag. */
export function isExpedited(type: ChangeType): boolean {
  return type === "emergency";
}

/**
 * The state a freshly-created change lands in, keyed by type:
 *   standard  → auto-approved   ({ approved, approved })   — pre-authorized, no human action.
 *   normal    → awaiting        ({ pending_approval, pending })
 *   emergency → awaiting (fast) ({ pending_approval, pending }) — flagged expedited in the UI.
 * `draft` is never the initial persisted state: a standard change skips straight to approved,
 * and an approval-requiring change opens directly as pending_approval so it surfaces in the queue.
 */
export function initialApprovalState(type: ChangeType): ChangeApprovalState {
  return requiresApproval(type)
    ? { status: "pending_approval", approvalStatus: "pending" }
    : { status: "approved", approvalStatus: "approved" };
}

/** True when a change is awaiting an approver decision (drives the pending-approvals queue). */
export function isAwaitingApproval(
  status: ChangeStatus,
  approvalStatus: ChangeApprovalStatus | null,
): boolean {
  return status === "pending_approval" && approvalStatus === "pending";
}

/**
 * Apply an approver's decision to a change that is awaiting approval. Returns the new
 * (status, approvalStatus) pair, or null when the change is NOT in a decidable state
 * (only `pending_approval`/`pending` can be approved or rejected — guards the action against
 * double-approving or acting on a standard/auto-approved change).
 */
export function applyApprovalDecision(
  current: { status: ChangeStatus; approvalStatus: ChangeApprovalStatus | null },
  decision: ApprovalDecision,
): ChangeApprovalState | null {
  if (!isAwaitingApproval(current.status, current.approvalStatus)) return null;
  return decision === "approved"
    ? { status: "approved", approvalStatus: "approved" }
    : { status: "rejected", approvalStatus: "rejected" };
}

/** Narrow a posted string to a valid approver decision (action guard). */
export function asApprovalDecision(value: string | undefined): ApprovalDecision | null {
  return value === "approved" || value === "rejected" ? value : null;
}

/**
 * Effective risk = override ?? derived (the same override-wins resolution as the CMDB
 * criticality overlay). Null when neither is set (not yet assessed — #658 populates these).
 */
export function effectiveRisk(
  derived: number | null,
  override: number | null,
): number | null {
  return override ?? derived;
}

// ── Scheduling (#660, ADR-0079) ───────────────────────────────────────────────────────────
// A change carries an optional planned window (`schedule_start`/`schedule_end`, both
// timestamptz, DB CHECK end ≥ start). v1 is basic coordination + visibility: set a window,
// see upcoming changes on a calendar, and surface overlapping windows as CONTEXT (no hard
// enforcement / freeze-period gating — that is a deliberate follow-up). These helpers are
// PURE (ISO-string in, plain values out) so the same window/overlap/state rules unit-test
// cleanly and drive the action + the calendar view alike.

/** Outcome of validating a posted window: the parsed pair, or a human reason it is invalid. */
export interface ScheduleWindowResult {
  ok: boolean;
  /** ISO start (or null when clearing the window). Only meaningful when `ok`. */
  start: string | null;
  /** ISO end (or null when clearing the window). Only meaningful when `ok`. */
  end: string | null;
  /** Why the window is invalid (only set when `!ok`). */
  reason?: string;
}

/**
 * Validate/normalise a posted schedule window. Both blank ⇒ CLEAR the window (ok, nulls).
 * Both present ⇒ parse and require end ≥ start (mirrors the DB CHECK so the app refuses
 * before the round-trip). Exactly one present, or an unparseable date ⇒ invalid with a
 * reason. Accepts any `Date`-parseable string (the `datetime-local` input posts
 * `yyyy-mm-ddThh:mm`); returns the normalised ISO instants.
 */
export function validateScheduleWindow(
  rawStart: string | null | undefined,
  rawEnd: string | null | undefined,
): ScheduleWindowResult {
  const s = (rawStart ?? "").trim();
  const e = (rawEnd ?? "").trim();
  if (!s && !e) return { ok: true, start: null, end: null };
  if (!s || !e) {
    return { ok: false, start: null, end: null, reason: "Set both a start and an end, or leave both blank to clear." };
  }
  const sd = new Date(s);
  const ed = new Date(e);
  if (Number.isNaN(sd.getTime()) || Number.isNaN(ed.getTime())) {
    return { ok: false, start: null, end: null, reason: "The schedule window has an unparseable date." };
  }
  if (ed.getTime() < sd.getTime()) {
    return { ok: false, start: null, end: null, reason: "The schedule end must be on or after the start." };
  }
  return { ok: true, start: sd.toISOString(), end: ed.toISOString() };
}

/**
 * Resolve the lifecycle status after a schedule change, WITHOUT clobbering approval state.
 * Scheduling is a planning act on an already-approved change, so the ONLY transitions this
 * makes are the reversible pair `approved ↔ scheduled`:
 *   • setting a window on an `approved` change → `scheduled`
 *   • clearing the window on a `scheduled` change → back to `approved`
 * Every other status (draft/pending_approval/rejected/completed/cancelled) is returned
 * unchanged — a change still awaiting approval can carry a planned window without being
 * promoted, and a rejected/closed change is never silently reopened.
 */
export function nextScheduleStatus(current: ChangeStatus, hasWindow: boolean): ChangeStatus {
  if (hasWindow && current === "approved") return "scheduled";
  if (!hasWindow && current === "scheduled") return "approved";
  return current;
}

/** A change with a (possibly null) planned window, narrowed to what conflict-detection needs. */
export interface SchedulableChange {
  id: string;
  scheduleStart: string | null;
  scheduleEnd: string | null;
  accountId: string | null;
  affectedCis?: { ciType: CiType; ciId: string }[];
}

/** True when two half-open-ish [start, end] instant windows overlap (touching endpoints count). */
export function windowsOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return new Date(aStart).getTime() <= new Date(bEnd).getTime() &&
    new Date(bStart).getTime() <= new Date(aEnd).getTime();
}

/** Why two scheduled changes are flagged as a potential clash (context only, never enforced). */
export type ScheduleConflictReason = "same_account" | "shared_ci";

/** One surfaced scheduling conflict against the target change. */
export interface ScheduleConflict {
  change: SchedulableChange;
  reasons: ScheduleConflictReason[];
}

/**
 * Find OTHER scheduled changes whose window overlaps the target's AND that share context with
 * it — the same owning account, or at least one affected CI in common. This is INFORMATIONAL
 * (v1, ADR-0079 / #660): we surface clashes so a human can coordinate, we never block a save.
 * Changes with no window, the target itself, and overlaps with no shared account/CI are
 * excluded. Reasons are de-duplicated and ordered (account before CI) for stable rendering.
 */
export function findScheduleConflicts(
  target: SchedulableChange,
  others: readonly SchedulableChange[],
): ScheduleConflict[] {
  if (!target.scheduleStart || !target.scheduleEnd) return [];
  const targetCis = new Set((target.affectedCis ?? []).map((c) => `${c.ciType}:${c.ciId}`));
  const out: ScheduleConflict[] = [];
  for (const other of others) {
    if (other.id === target.id) continue;
    if (!other.scheduleStart || !other.scheduleEnd) continue;
    if (!windowsOverlap(target.scheduleStart, target.scheduleEnd, other.scheduleStart, other.scheduleEnd)) {
      continue;
    }
    const reasons: ScheduleConflictReason[] = [];
    if (target.accountId && other.accountId && target.accountId === other.accountId) {
      reasons.push("same_account");
    }
    if (targetCis.size > 0 && (other.affectedCis ?? []).some((c) => targetCis.has(`${c.ciType}:${c.ciId}`))) {
      reasons.push("shared_ci");
    }
    if (reasons.length > 0) out.push({ change: other, reasons });
  }
  return out;
}

/** Human label per conflict reason (badge/line text on the detail context block). */
export const SCHEDULE_CONFLICT_REASON_LABEL: Record<ScheduleConflictReason, string> = {
  same_account: "same account",
  shared_ci: "shared configuration item",
};

// ── CMDB-derived risk scoring (#658, ADR-0079; consumes #650 impact + #648 criticality) ──
// A change's risk is a function of its CMDB blast radius: how much of the managed estate
// its affected CIs touch, weighted by how business-critical that estate is. We reuse the
// SAME read-models the CI impact panel uses — `analyzeImpact` (#650, n-hop reachability)
// and `CRITICALITY_WEIGHT`/`effectiveCriticality` (#648) — so risk and impact never drift.

/** Human risk band for a 0–100 score (badge text + tone). */
export type RiskBand = "low" | "moderate" | "high" | "critical";

/** Band thresholds (inclusive lower bound), highest → lowest. */
const RISK_BANDS: readonly { band: RiskBand; min: number }[] = [
  { band: "critical", min: 75 },
  { band: "high", min: 50 },
  { band: "moderate", min: 25 },
  { band: "low", min: 0 },
] as const;

/** Map a 0–100 risk score to its band. */
export function riskBand(score: number): RiskBand {
  for (const { band, min } of RISK_BANDS) if (score >= min) return band;
  return "low";
}

/** Label + design-token tone per band (mirrors the criticality badge tones). */
export const RISK_BAND_LABEL: Record<RiskBand, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  critical: "Critical",
};
export const RISK_BAND_TONE: Record<RiskBand, "red" | "amber" | "accent" | "dim"> = {
  critical: "red",
  high: "amber",
  moderate: "accent",
  low: "dim",
};

/**
 * SCORING FORMULA (v1, deterministic — see ADR-0079 / #658).
 *
 * For each affected CI we score TWO contributions, both keyed on the #648 effective
 * criticality weight (low=1 … critical=4):
 *
 *   1. SEED — the directly-changed CI itself contributes its own criticality weight.
 *      Touching a `critical` server is inherently riskier than touching a `low` one,
 *      even with no dependents.
 *   2. BLAST — every DISTINCT CI reachable within `analyzeImpact`'s default depth
 *      (undirected n-hop, #650) contributes its criticality weight DECAYED by hop
 *      distance (÷ hops), so a direct dependent counts more than a 3-hop-away one.
 *
 * The blast set is DEDUPLICATED across all affected origins (and excludes the affected
 * CIs themselves, which are already counted by the seed), so overlapping radii never
 * double-count — a CI reached from two changed CIs counts once, at its shortest hop.
 *
 * The raw weighted sum is mapped onto 0–100 by a SATURATING curve
 * `100 · (1 − e^(−raw / K))` (K = SATURATION_SCALE): small blasts move the needle a lot,
 * huge blasts asymptote toward 100 rather than overflowing. A change with no affected
 * CIs scores 0 (unassessed-but-zero is a valid "nothing to break" reading).
 */
export const SATURATION_SCALE = 12;

export function deriveChangeRisk(
  affected: { ciType: CiType; ciId: string }[],
  allItems: ConfigurationItem[],
  edges: CiRelationship[],
): number {
  if (affected.length === 0) return 0;

  const byKey = new Map<string, ConfigurationItem>();
  for (const c of allItems) byKey.set(ciKey(c), c);

  const affectedKeys = new Set(affected.map((a) => ciKey({ ciType: a.ciType, ciId: a.ciId })));

  // Best (shortest) hop at which each distinct blast CI is reached, across all origins.
  const blastHops = new Map<string, number>();
  let seed = 0;

  for (const a of affected) {
    const origin: CiRef = { ciType: a.ciType, ciId: a.ciId };
    const ci = byKey.get(ciKey(origin));
    // 1. SEED contribution — the changed CI's own effective criticality weight.
    if (ci) {
      seed += CRITICALITY_WEIGHT[effectiveCriticality(ci.derivedDefault, ci.override)];
    }
    // 2. BLAST — reachable dependents, deduped at their shortest hop across origins.
    for (const hit of analyzeImpact(origin, allItems, edges).affected) {
      const key = ciKey(hit.ci);
      if (affectedKeys.has(key)) continue; // already in the seed set
      const prev = blastHops.get(key);
      if (prev === undefined || hit.hops < prev) blastHops.set(key, hit.hops);
    }
  }

  let blast = 0;
  for (const [key, hops] of blastHops) {
    const ci = byKey.get(key);
    if (!ci) continue;
    const weight = CRITICALITY_WEIGHT[effectiveCriticality(ci.derivedDefault, ci.override)];
    blast += weight / hops; // decay with distance
  }

  const raw = seed + blast;
  const score = 100 * (1 - Math.exp(-raw / SATURATION_SCALE));
  // Clamp + round to a stable 0–100 integer (the DB column is int).
  return Math.max(0, Math.min(100, Math.round(score)));
}
