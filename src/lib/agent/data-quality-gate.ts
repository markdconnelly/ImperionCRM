/**
 * data-quality gate — the DQ-SLA autonomy gate (#1113, epic #1049 pillar 3, FINAL slice).
 *
 * Epic #1049 makes the data plane trustworthy enough for an AUTONOMOUS Technician via three
 * pillars: act on the RIGHT entity (#1111, `entity_resolve()`), know what was TRUE WHEN / believed
 * when (#1112, bitemporal `entity_xref`), and — here — act only on FRESH and COMPLETE data. A
 * stale or incomplete record must NEVER be auto-acted on; it routes to the human cockpit. DQ is a
 * SAFETY CONTROL, the same shape as the always-gate hard ceiling: a one-way clamp toward human
 * review that can only ever route-to-human, never raise autonomy ("freshness = correctness").
 *
 * The DATABASE is authoritative: the SLA policy is the `dq_sla` table (migration 0192) and the
 * gate is the SQL function `entity_dq_gate(data_class, age_seconds, completeness)`. This module is
 * the FRONT-END mirror — the pure threshold rule the backend dispatcher (BE, ADR-0042) also
 * enforces — so the operator surfaces can PREVIEW the DQ verdict (why an action would park)
 * without a round-trip, exactly as {@link ./action-dispatch} mirrors the backend's dial
 * resolution and {@link ../security/data-class} mirrors `app_data_class_allowed()`. Repos don't
 * share code; keep the default SLA map below in lockstep with the 0192 seed.
 *
 * PURE: no `pg`, no `node:*`, no env. Safe to import anywhere (edge / server / client) and
 * unit-test directly. FAIL-CLOSED everywhere: an unknown class, a missing freshness stamp, or a
 * missing completeness score all read as a BREACH — "we can't prove the data is good" routes to
 * the human, never to silent execute.
 *
 * No PII, no secrets — class names + integer thresholds + a record's age/completeness only.
 */

import { isDataClass, type DataClass } from "@/lib/security/data-class";
import type { DispatchResolution, RouteDecision } from "@/lib/agent/action-dispatch";

/** A data-quality SLA: the freshness + completeness thresholds a record must meet to auto-act. */
export interface DqSla {
  /** Freshness SLA: a record older than this many seconds is STALE. */
  maxAgeSeconds: number;
  /** Completeness SLA: a completeness score (0..1) below this is INCOMPLETE. */
  minCompleteness: number;
}

/**
 * The default per-class SLA map — MIRRORS the `dq_sla` seed in migration 0192. The DATABASE is
 * authoritative; this is the FE convenience copy for previewing the gate when the DB-resolved SLA
 * isn't in hand. always-gate classes (financial / security_credentials / client_pii) get the
 * tightest SLAs; operational (broad-read ops data) tolerates more staleness. Keep in lockstep with
 * 0192 (two copies of one fact, the action-dispatch ↔ backend precedent).
 */
export const DEFAULT_DQ_SLA: Readonly<Record<DataClass, DqSla>> = {
  operational: { maxAgeSeconds: 86_400, minCompleteness: 0.8 },
  people_hr: { maxAgeSeconds: 43_200, minCompleteness: 0.9 },
  financial: { maxAgeSeconds: 3_600, minCompleteness: 1.0 },
  security_credentials: { maxAgeSeconds: 3_600, minCompleteness: 1.0 },
  client_pii: { maxAgeSeconds: 7_200, minCompleteness: 1.0 },
};

/**
 * A record's measured data quality at dispatch time: how old its silver freshness stamp is and
 * what fraction of its SLA-required fields are populated. Both are computed by the caller (the
 * backend at dispatch; a surface for preview) — this module owns only the threshold comparison.
 * A `null` for either means "unknown" and fails the gate closed.
 */
export interface RecordDataQuality {
  /** Age of the record's silver freshness stamp in seconds (now - stamp). `null` = unknown. */
  ageSeconds: number | null;
  /** Fraction (0..1) of the SLA-required fields that are populated. `null` = unknown. */
  completeness: number | null;
}

/** Why the DQ gate produced its verdict — surfaced so the cockpit can badge *why* an item parked. */
export type DqBreachReason = "fresh_and_complete" | "stale" | "incomplete" | "unknown";

/** The result of evaluating the DQ gate for one (data_class, record) pair. */
export interface DqGateResult {
  /** True iff the record MEETS its class SLA (fresh enough AND complete enough). */
  meetsSla: boolean;
  /** The SLA that was applied (resolved for the class), or `null` for an unknown class. */
  sla: DqSla | null;
  /** A PII-free reason for the verdict (drives the cockpit "why" badge). */
  reason: DqBreachReason;
}

/**
 * Resolve the SLA for a class from a map, defaulting to {@link DEFAULT_DQ_SLA}. Returns `null` for
 * an unknown class so {@link evaluateDqGate} can fail it closed (no silent NULL-SLA pass).
 */
export function slaForClass(
  dataClass: string,
  slaMap: Readonly<Record<string, DqSla>> = DEFAULT_DQ_SLA,
): DqSla | null {
  if (!isDataClass(dataClass)) return null;
  return slaMap[dataClass] ?? null;
}

/**
 * The pure DQ gate — the FE mirror of the SQL `entity_dq_gate()` (migration 0192). Returns whether
 * a record of `dataClass` with the measured `quality` MEETS its SLA, plus the applied SLA and a
 * PII-free reason. FAIL-CLOSED: an unknown class, a null age, or a null completeness all read as a
 * breach (`meetsSla: false`). Staleness is checked before completeness so the reason names the
 * first thing that breaks (deterministic, matches the SQL's AND short-circuit intent for the
 * badge). Keep in lockstep with the 0192 function body.
 */
export function evaluateDqGate(
  dataClass: string,
  quality: RecordDataQuality,
  slaMap: Readonly<Record<string, DqSla>> = DEFAULT_DQ_SLA,
): DqGateResult {
  const sla = slaForClass(dataClass, slaMap);
  if (sla === null) return { meetsSla: false, sla: null, reason: "unknown" };
  if (quality.ageSeconds === null || quality.completeness === null) {
    return { meetsSla: false, sla, reason: "unknown" };
  }
  if (quality.ageSeconds > sla.maxAgeSeconds) {
    return { meetsSla: false, sla, reason: "stale" };
  }
  if (quality.completeness < sla.minCompleteness) {
    return { meetsSla: false, sla, reason: "incomplete" };
  }
  return { meetsSla: true, sla, reason: "fresh_and_complete" };
}

/** A {@link DispatchResolution} after the DQ gate has been layered on top of it. */
export interface DqGatedDispatch extends DispatchResolution {
  /** The DQ verdict for the resolved record this action acts on. */
  dq: DqGateResult;
  /**
   * The final routing decision AFTER the DQ gate. Equals the dial+earned `decision` when the SLA
   * is met; otherwise forced to `cockpit` (a DQ breach can only ever route to a human). Read this,
   * not the inner `decision`, for the actual dispatch outcome.
   */
  gatedDecision: RouteDecision;
  /** True when the DQ gate DOWNGRADED an otherwise-inline action to the cockpit. */
  dqRoutedToCockpit: boolean;
}

/**
 * Layer the DQ-SLA gate on top of a dial+earned {@link DispatchResolution} (#1113). This is the
 * THIRD gate in the chain — after the actuation dial (0158) and earned autonomy (#1036) resolve
 * `resolution.decision`, the DQ gate runs LAST: a stale/incomplete record on the resolved entity
 * DOWNGRADES an otherwise-inline verdict to `cockpit`. It is a one-way clamp — it never raises
 * autonomy (a DQ-clean record leaves the dial+earned decision exactly as-is, including a verdict
 * that already routed to the cockpit for other reasons). Mirrors how the backend dispatcher
 * applies `entity_dq_gate()` after resolving the dial. Pure; the surfaces preview it, the backend
 * enforces it.
 */
export function gateDispatchOnDataQuality(
  resolution: DispatchResolution,
  quality: RecordDataQuality,
  slaMap: Readonly<Record<string, DqSla>> = DEFAULT_DQ_SLA,
): DqGatedDispatch {
  const dq = evaluateDqGate(resolution.actionClass, quality, slaMap);
  // The gate only ever routes TO the cockpit — never out of it. A clean record leaves the inner
  // decision untouched; a breach forces cockpit regardless of how permissive the dial+earned was.
  const gatedDecision: RouteDecision = dq.meetsSla ? resolution.decision : "cockpit";
  return {
    ...resolution,
    dq,
    gatedDecision,
    dqRoutedToCockpit: !dq.meetsSla && resolution.decision !== "cockpit",
  };
}
