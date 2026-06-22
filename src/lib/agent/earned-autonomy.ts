/**
 * Earned / graduated autonomy with HARD CEILINGS (#1036, ADR-0121 — RENUMBER AT MERGE).
 *
 * Autonomy is EARNED. The operator-set 1–5 dial (`agent_action_autonomy`, 0158, ADR-0109)
 * is the FLOOR an agent always has; on top of it an agent that builds a clean track record on
 * an action class **auto-promotes its effective tier ceiling one ADR-0055 tier at a time**,
 * fully audited, and **instantly demotes back to the dial floor on a single "miss"**. The
 * earned dimension can only ever RAISE the ceiling — never lower it below the operator dial.
 *
 * HARD CEILING (the invariant). The always-surface classes — money (`financial`),
 * credentials (`security_credentials`), customer-facing (`client_pii`) — are CAPPED at
 * "always approve". No track record, no dial level, no earned tier may cross them. This
 * module reuses the SAME always-gate set as the data_class axis (#1034 / ADR-0118 —
 * {@link isAlwaysGate} / `data_class.always_gate`); it does NOT invent a parallel list. An
 * action whose `dataClass` is always-gate ALWAYS routes to the cockpit regardless of any
 * earned record (see {@link clampCeilingForClass} + `action-dispatch.ts`'s enforcement).
 *
 * PURE: no `pg`, no `node:*`, no env. Safe to import anywhere (edge / server / client) and
 * unit-test directly. The backend dispatcher (BE #250) is the AUTHORITATIVE enforcer and
 * mirrors this logic (repos don't share code, ADR-0042); this is the front-end half the
 * operator surfaces preview against and the eval-harvest feeds. Fail-closed everywhere:
 * an unknown / corrupt record never grants autonomy above the operator dial.
 */

import {
  TIER_ORDER,
  tierWithinCeiling,
  type AutonomyTier,
} from "@/lib/agent/action-autonomy";
import { isAlwaysGate, isDataClass } from "@/lib/security/data-class";

/**
 * Default promotion threshold: N consecutive clean approvals on an action class before the
 * earned ceiling steps up ONE ADR-0055 tier. Tunable per row (`promote_threshold`) but never
 * below 1 (a single clean run can never be a promotion floor of 0). ADR-0121 D1.
 */
export const DEFAULT_PROMOTE_THRESHOLD = 5;

/**
 * The minimum eval score a run must clear to COUNT as a "clean" approval toward promotion
 * (ADR-0121 D1). Mirrors the eval baseline (#1037 / ADR-0120 golden gate, 0.75). A run below
 * this — even if a human approved it — does NOT advance the streak (it is not a "miss" by
 * itself, but it is not progress either; an explicit miss resets, see {@link applyOutcome}).
 */
export const DEFAULT_CLEAN_EVAL_FLOOR = 0.75;

/** The per-(agent, class) earned-autonomy track record + current earned ceiling. */
export interface EarnedRecord {
  agentKey: string;
  actionClass: string;
  /**
   * The tier the agent has EARNED on this class — the highest ceiling the earned dimension
   * may raise dispatch to (still clamped by the hard ceiling). `null` = nothing earned yet
   * (effective ceiling is the operator dial alone). Never below the dial; only ever raises.
   */
  earnedTier: AutonomyTier | null;
  /** Consecutive clean approvals since the last promotion / demotion (drives the next step). */
  cleanStreak: number;
  /** N clean approvals required to step up one tier (≥1). */
  promoteThreshold: number;
  /** The minimum eval score that counts a run as clean toward the streak. */
  cleanEvalFloor: number;
  /** Audit: the last transition, for the cockpit's "last promotion/demotion" line. */
  lastTransition: EarnedTransition | null;
}

/** A single promotion or demotion event — ledgered and surfaced in the cockpit (#1014). */
export interface EarnedTransition {
  kind: "promote" | "demote";
  /** The tier before the transition (`null` = dial-only). */
  from: AutonomyTier | null;
  /** The tier after the transition (`null` = demoted back to dial-only). */
  to: AutonomyTier | null;
  /** Why: clean-streak met (promote) or the precise miss (demote). */
  reason: string;
  /** ISO timestamp of the transition. */
  at: string;
}

/** The signal a completed run contributes to an agent's track record on an action class. */
export interface RunOutcome {
  /**
   * Did the run "miss"? A MISS is any of: a human REJECTED the proposed action, the action
   * EXECUTED but was reverted/undone within its window, OR the run's eval scored a hard
   * FAIL (below the harvest fail floor, #1037). Precise definition is ADR-0121 D2. A miss is
   * an INSTANT demote to the operator dial floor.
   */
  miss: boolean;
  /** The run's eval score in [0,1], if scored. Undefined = unscored (does not advance). */
  evalScore?: number;
  /** True when a human explicitly APPROVED the action (a clean approval candidate). */
  approved: boolean;
  /** ISO timestamp of the run outcome (defaults to now() if omitted by the caller). */
  at?: string;
}

/** The next ADR-0055 tier up from `tier`, or `null` if already at the top (T3). */
export function nextTierUp(tier: AutonomyTier | null): AutonomyTier | null {
  const order = tier === null ? -1 : TIER_ORDER[tier];
  const up = (Object.keys(TIER_ORDER) as AutonomyTier[]).find(
    (t) => TIER_ORDER[t] === order + 1,
  );
  return up ?? null;
}

/** The higher of two tiers (treating `null` as "below T0"). The earned ceiling never lowers the dial. */
export function maxTier(a: AutonomyTier | null, b: AutonomyTier | null): AutonomyTier | null {
  const av = a === null ? -1 : TIER_ORDER[a];
  const bv = b === null ? -1 : TIER_ORDER[b];
  if (av < 0 && bv < 0) return null;
  return av >= bv ? a : b;
}

/**
 * Apply a completed run's {@link RunOutcome} to an agent's {@link EarnedRecord}, returning the
 * NEXT record (pure — no mutation). The earned-autonomy state machine (ADR-0121 D1/D2):
 *
 *   - MISS  → INSTANT demote: earnedTier → null (back to the operator dial floor), streak 0,
 *             a `demote` transition ledgered. One miss erases the whole earned record.
 *   - clean approval (approved AND eval ≥ floor) → streak++. When the streak meets the
 *             threshold, step the earned tier up ONE tier and reset the streak; ledger a
 *             `promote`. A promotion never crosses T3 (the top tier).
 *   - anything else (unscored / approved-but-low-score / no decision) → unchanged streak,
 *             no transition. Only a clean approval advances; only a miss demotes.
 *
 * The HARD CEILING is NOT applied here — earnedTier is the *capability* the agent has built;
 * the hard ceiling is applied at DISPATCH per action class ({@link clampCeilingForClass}),
 * because a single agent acts across both always-gate and non-always-gate classes.
 */
export function applyOutcome(record: EarnedRecord, outcome: RunOutcome): EarnedRecord {
  const at = outcome.at ?? new Date().toISOString();

  if (outcome.miss) {
    if (record.earnedTier === null && record.cleanStreak === 0) {
      return record; // already at the floor — nothing to demote, no noise on the ledger
    }
    return {
      ...record,
      earnedTier: null,
      cleanStreak: 0,
      lastTransition: {
        kind: "demote",
        from: record.earnedTier,
        to: null,
        reason: "miss: rejected / reverted / eval-fail — earned autonomy reset to the dial floor",
        at,
      },
    };
  }

  const clean =
    outcome.approved &&
    typeof outcome.evalScore === "number" &&
    outcome.evalScore >= record.cleanEvalFloor;
  if (!clean) return record; // unscored or low-scored approval: no progress, no demotion

  const threshold = Math.max(1, record.promoteThreshold);
  const nextStreak = record.cleanStreak + 1;
  if (nextStreak < threshold) {
    return { ...record, cleanStreak: nextStreak };
  }

  // Streak met → step up one tier (capped at T3) and reset the streak.
  const promoted = nextTierUp(record.earnedTier);
  if (promoted === null) {
    // Already at the top earned tier — keep the streak satisfied but stop ledgering noise.
    return { ...record, cleanStreak: threshold };
  }
  return {
    ...record,
    earnedTier: promoted,
    cleanStreak: 0,
    lastTransition: {
      kind: "promote",
      from: record.earnedTier,
      to: promoted,
      reason: `${threshold} consecutive clean approvals (eval ≥ ${record.cleanEvalFloor}) on ${record.actionClass}`,
      at,
    },
  };
}

/**
 * The EFFECTIVE ceiling for an action of `dataClass` — the operator dial ceiling, raised toward
 * the EARNED tier, with the HARD CEILING gating that raise. The single expression of
 * `min(earned, hard-ceiling)` layered over the operator dial that {@link resolveDispatch}
 * consumes:
 *
 *   - Non-always-gate class: effective = max(dialCeiling, earnedTier) — earned auto-promotion
 *     RAISES the operator dial floor (it never lowers it). This is how an agent graduates.
 *   - ALWAYS-GATE class (#1034 / ADR-0118 — money / credentials / customer-facing): the EARNED
 *     raise is DISCARDED — effective = dialCeiling alone. No track record can auto-cross it.
 *     THIS IS THE INVARIANT. The operator's own deliberate dial setting is still honored (a
 *     human turning the dial up is not "earned" autonomy); only the *auto-earned* raise is
 *     capped. `hardGated` is surfaced so the cockpit can badge *why* an action keeps surfacing.
 *
 * Returns the effective ceiling AND whether the class is hard-gated (for the audit/cockpit
 * label). Fail-closed: an unknown class is treated as always-gate (no earned raise).
 */
export function clampCeilingForClass(input: {
  dialCeiling: AutonomyTier;
  earnedTier: AutonomyTier | null;
  dataClass: string;
}): { effectiveCeiling: AutonomyTier; hardGated: boolean } {
  // Fail-closed: a class we don't recognise is treated as hard-gated (no earned raise), exactly
  // as an unknown action is treated as the most-restrictive tier elsewhere in dispatch.
  const hardGated = !isDataClass(input.dataClass) || isAlwaysGate(input.dataClass);
  // Always-gate classes DISCARD the earned raise: the earned dimension can never auto-cross the
  // hard ceiling. The operator dial alone governs. Non-gated classes take the earned-raised max.
  const effectiveCeiling = hardGated
    ? input.dialCeiling
    : maxTier(input.dialCeiling, input.earnedTier) ?? input.dialCeiling;
  return { effectiveCeiling, hardGated };
}

/**
 * Whether an action of `tier` may execute inline under the (earned-raised) effective ceiling.
 * The usual ADR-0055 tier ≤ ceiling test. The hard ceiling is already baked into
 * `effectiveCeiling` (an always-gate class never received the earned raise), so for always-gate
 * classes this is exactly the operator dial's own verdict — earned autonomy added nothing.
 */
export function earnedExecutesInline(input: {
  tier: AutonomyTier;
  effectiveCeiling: AutonomyTier;
  hardGated: boolean;
}): boolean {
  return tierWithinCeiling(input.tier, input.effectiveCeiling);
}

/**
 * A one-line, PII-free summary of an agent's track record on a class for the cockpit (#1014):
 * the current earned tier, the streak toward the next promotion, and the last transition. Pure
 * so the display (a follow-up issue) is trivial JSX over this. E.g.
 * "Earned T2 · 2/5 toward next · last: promote T1→T2".
 */
export function summarizeTrackRecord(record: EarnedRecord): string {
  const tier = record.earnedTier ? `Earned ${record.earnedTier}` : "Dial floor (nothing earned)";
  const atTop = record.earnedTier === "T3";
  const progress = atTop
    ? "at top earned tier"
    : `${record.cleanStreak}/${record.promoteThreshold} clean toward next`;
  const last = record.lastTransition
    ? `last: ${record.lastTransition.kind} ${record.lastTransition.from ?? "floor"}->${record.lastTransition.to ?? "floor"}`
    : "no transitions yet";
  return `${tier} · ${progress} · ${last}`;
}

/** A fresh, fail-closed earned record (nothing earned yet) for an `(agent, class)` pair. */
export function emptyEarnedRecord(agentKey: string, actionClass: string): EarnedRecord {
  return {
    agentKey,
    actionClass,
    earnedTier: null,
    cleanStreak: 0,
    promoteThreshold: DEFAULT_PROMOTE_THRESHOLD,
    cleanEvalFloor: DEFAULT_CLEAN_EVAL_FLOOR,
    lastTransition: null,
  };
}
