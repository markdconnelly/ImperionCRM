/**
 * Forecast-ACCURACY trend (ADR-0072 decision 5, ADR-0062 BI hub, #384).
 *
 * The forecast surface (#383, `lib/forecast.ts` / `forecast-view.ts`) answers
 * "what do we forecast NOW?". This module answers the question the nightly
 * `forecast_snapshot` table (migration 0114) was built for: **how good were the
 * forecasts we made in the past?** — the snapshot call N weeks ago vs the
 * eventual realised closed-won for that same period (ADR-0072 decision 5).
 *
 * Pure, dependency-free, NOT server-only — safe to import from the server reader
 * (`forecast-accuracy-data.ts`), the page, and the vitest suite alike. Money is
 * unredacted; `canSeeRevenue` (ADR-0030) is the caller's job, exactly as the rest
 * of the forecast surface does it.
 *
 * ── The accuracy model ───────────────────────────────────────────────────────
 * Each forecast_snapshot row is one point-in-time call for one (owner|team,
 * period): on `capturedOn` it estimated `weighted` / `commit` totals for the
 * period that ends on `periodEnd`. The REALISED number for that period is the
 * `closedWon` of the snapshot taken at-or-after `periodEnd` (the latest snapshot
 * of the period — by then the period is settled and closed-won is the truth).
 *
 * For every EARLIER snapshot of a settled period we can therefore compare the
 * call it made to that realised actual:
 *   - variance        = forecast − realised        (signed; + = over-forecast)
 *   - accuracyPct      = 1 − |forecast − realised| / realised   (clamped ≥ 0;
 *                        null when realised = 0 so we never divide by zero)
 *   - leadDays         = periodEnd − capturedOn      (how far ahead the call was)
 *
 * The trend is these points ordered by `capturedOn`: forecast accuracy improving
 * (or not) as calls get closer to the period close.
 */

import type { ForecastSnapshotRow } from "@/types";

/** Which forecast number a snapshot's accuracy is measured against. */
export type AccuracyBasis = "weighted" | "commit";

/** One settled period's realised closed-won (the truth a forecast is graded against). */
export interface RealisedPeriod {
  key: string; // owner|team + period identity
  periodStart: string;
  periodEnd: string;
  scope: "owner" | "team";
  target: string; // owner display name or team label
  realised: number; // closed-won of the period's settling snapshot
}

/** A single graded forecast call — one earlier snapshot vs its period's realised actual. */
export interface AccuracyPoint {
  capturedOn: string; // yyyy-mm-dd — when the call was made
  periodEnd: string; // yyyy-mm-dd — the period it forecast into
  scope: "owner" | "team";
  target: string;
  /** The forecast call on `capturedOn` for the chosen basis (weighted or commit). */
  forecast: number;
  /** The realised closed-won for the period (the same for all calls of that period). */
  realised: number;
  /** forecast − realised; positive = over-forecast, negative = under-forecast. */
  variance: number;
  /** 1 − |variance| / realised, clamped ≥ 0; null when realised is 0. */
  accuracyPct: number | null;
  /** periodEnd − capturedOn in whole days — how far ahead the call was made. */
  leadDays: number;
}

/** Headline accuracy stats across the graded points (most-recent period weighting is the caller's). */
export interface AccuracySummary {
  /** Number of graded forecast calls (earlier snapshots of settled periods). */
  gradedCalls: number;
  /** Settled periods covered (periods that have a realised actual). */
  settledPeriods: number;
  /** Mean accuracy % across graded calls with a defined accuracy (realised > 0). */
  meanAccuracyPct: number | null;
  /** Mean signed variance — the systematic bias (+ = habitually over-forecasts). */
  meanVariance: number;
  /** Mean absolute variance — typical miss size regardless of direction. */
  meanAbsVariance: number;
}

/** Everything the accuracy-trend surface renders, derived once from snapshots. */
export interface ForecastAccuracyView {
  basis: AccuracyBasis;
  /** Graded calls, oldest capture first (the trend's x-order). */
  points: AccuracyPoint[];
  /** The settled periods, newest period-end first. */
  periods: RealisedPeriod[];
  summary: AccuracySummary;
  /** True when the snapshot set has owner/team granularity (owner-split feasible). */
  hasOwnerDimension: boolean;
}

/** Identity of a (owner|team, period) series — snapshots of the same series share it. */
function seriesKey(s: ForecastSnapshotRow): string {
  const dim = s.ownerUserId != null ? `owner:${s.ownerUserId}` : `team:${s.team ?? ""}`;
  return `${dim}|${s.periodStart}|${s.periodEnd}`;
}

function scopeOf(s: ForecastSnapshotRow): "owner" | "team" {
  return s.ownerUserId != null ? "owner" : "team";
}

function targetOf(s: ForecastSnapshotRow): string {
  if (s.ownerUserId != null) return s.ownerName ?? "Unassigned";
  return s.team ?? "Team";
}

/** Whole days between two yyyy-mm-dd dates (b − a), 0 if either is unparseable. */
export function daysBetween(a: string, b: string): number {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
  return Math.round((tb - ta) / 86_400_000);
}

/**
 * Accuracy of one forecast call against a realised actual.
 * `null` when realised is 0 (no defined accuracy — avoid /0); otherwise clamped to
 * ≥ 0 so a wild over-forecast reads as 0% rather than a misleading negative.
 */
export function accuracyPct(forecast: number, realised: number): number | null {
  if (realised === 0) return null;
  const pct = 1 - Math.abs(forecast - realised) / realised;
  return Math.max(0, pct);
}

/**
 * Pick the realised closed-won for each settled period: the closed_won of the
 * snapshot captured at-or-after periodEnd (the latest such — the settling call).
 * A period with no snapshot on/after its end is NOT settled yet and is skipped.
 */
function realisedByPeriod(
  snapshots: readonly ForecastSnapshotRow[],
): Map<string, RealisedPeriod> {
  const settling = new Map<string, ForecastSnapshotRow>();
  for (const s of snapshots) {
    // A snapshot settles its period once captured on/after the period ends.
    if (daysBetween(s.periodEnd, s.capturedOn) < 0) continue;
    const key = seriesKey(s);
    const cur = settling.get(key);
    // Keep the latest settling snapshot (closed-won is final by then; latest wins).
    if (!cur || daysBetween(cur.capturedOn, s.capturedOn) > 0) settling.set(key, s);
  }
  const out = new Map<string, RealisedPeriod>();
  for (const [key, s] of settling) {
    out.set(key, {
      key,
      periodStart: s.periodStart,
      periodEnd: s.periodEnd,
      scope: scopeOf(s),
      target: targetOf(s),
      realised: s.closedWon,
    });
  }
  return out;
}

/**
 * Build the accuracy-trend view from raw forecast snapshots. Grades every EARLIER
 * snapshot of a SETTLED period (one with a realised actual) against that actual,
 * for the chosen basis (weighted by default, or the commit call).
 */
export function buildForecastAccuracyView(
  snapshots: readonly ForecastSnapshotRow[],
  basis: AccuracyBasis = "weighted",
): ForecastAccuracyView {
  const realised = realisedByPeriod(snapshots);
  const hasOwnerDimension = snapshots.some((s) => s.ownerUserId != null);

  const points: AccuracyPoint[] = [];
  for (const s of snapshots) {
    const period = realised.get(seriesKey(s));
    if (!period) continue; // period not settled yet — cannot grade
    // Grade calls made BEFORE the period closed; the settling snapshot is the
    // actual itself, not a forecast to grade.
    if (daysBetween(s.periodEnd, s.capturedOn) >= 0) continue;
    const forecast = basis === "commit" ? s.commitTotal : s.weighted;
    const variance = forecast - period.realised;
    points.push({
      capturedOn: s.capturedOn,
      periodEnd: s.periodEnd,
      scope: scopeOf(s),
      target: targetOf(s),
      forecast,
      realised: period.realised,
      variance,
      accuracyPct: accuracyPct(forecast, period.realised),
      leadDays: daysBetween(s.capturedOn, s.periodEnd),
    });
  }

  points.sort((a, b) => daysBetween(b.capturedOn, a.capturedOn)); // oldest first

  const defined = points.filter((p) => p.accuracyPct != null);
  const meanAccuracyPct =
    defined.length > 0
      ? defined.reduce((sum, p) => sum + (p.accuracyPct ?? 0), 0) / defined.length
      : null;
  const meanVariance =
    points.length > 0
      ? points.reduce((sum, p) => sum + p.variance, 0) / points.length
      : 0;
  const meanAbsVariance =
    points.length > 0
      ? points.reduce((sum, p) => sum + Math.abs(p.variance), 0) / points.length
      : 0;

  const periods = [...realised.values()].sort((a, b) =>
    daysBetween(a.periodEnd, b.periodEnd),
  ); // newest period-end first

  return {
    basis,
    points,
    periods,
    summary: {
      gradedCalls: points.length,
      settledPeriods: realised.size,
      meanAccuracyPct,
      meanVariance,
      meanAbsVariance,
    },
    hasOwnerDimension,
  };
}
