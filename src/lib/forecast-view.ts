/**
 * Forecast VIEW model (ADR-0072, #383) — the read-only shaping the forecast
 * surface renders, layered on top of the pure roll-up math in `lib/forecast.ts`.
 *
 * `lib/forecast.ts` answers "given these rows + a quota, what are the totals?".
 * This module answers the surface's questions: the headline summary, the
 * **category rollup** (each band's deal count + raw and cumulative totals), the
 * **weighted vs categorised** comparison the page shows side by side (ADR-0072
 * decision 3), and **attainment vs quota** per quota target (decision 4).
 *
 * Pure and dependency-free (no `server-only`, no DB) so the view shaping is unit
 * tested in isolation; the data reader (`forecast-view-data.ts`) feeds it rows.
 * Money is unredacted here — `canSeeRevenue` (ADR-0030) is applied by the page
 * before any figure reaches the client, exactly as the reporting hub does.
 */

import type {
  ForecastCategory,
  ForecastSummary,
  OpportunityForecastRow,
  QuotaRow,
} from "@/types";
import { effectiveCategory, summariseForecast } from "@/lib/forecast";

/** The three forecast bands that roll UP (omitted is excluded from the forecast). */
export const ROLLUP_BANDS: readonly Exclude<ForecastCategory, "omitted">[] = [
  "commit",
  "best_case",
  "pipeline",
] as const;

/** Human label for a forecast category (the underscore form is not user-facing). */
export const CATEGORY_LABEL: Record<ForecastCategory, string> = {
  commit: "Commit",
  best_case: "Best case",
  pipeline: "Pipeline",
  omitted: "Omitted",
};

/** One band of the category rollup — its own total and the cumulative ladder. */
export interface CategoryRollupRow {
  category: Exclude<ForecastCategory, "omitted">;
  label: string;
  /** Deals the owner placed in this band (open, non-omitted). */
  dealCount: number;
  /** Σ deal value in this band alone (the raw per-category sum). */
  total: number;
  /**
   * Cumulative total: commit, then commit+best_case, then +pipeline — the
   * conservative→optimistic ladder finance reads (ADR-0072 decision 3).
   */
  cumulative: number;
}

/** Attainment of one quota target by the closed-won it covers (ADR-0072 decision 4). */
export interface AttainmentRow {
  quotaId: string;
  /** Owner display name, or the team label — whichever the quota targets. */
  target: string;
  scope: "owner" | "team";
  periodStart: string;
  periodEnd: string;
  quota: number;
  /**
   * Closed-won attributed to this quota. v1 has no per-owner attribution on the
   * forecast row, so this is the period-scoped closed-won floor (the same number
   * the headline shows); per-owner split lands with owner attribution (#384).
   */
  closedWon: number;
  /** closedWon / quota, or null when the quota is zero. */
  attainment: number | null;
}

/** Everything the forecast surface renders, derived once from rows + quotas. */
export interface ForecastView {
  /** Headline roll-up across every open deal (ADR-0072 decisions 3 + 4). */
  summary: ForecastSummary;
  /** The category rollup ladder (commit ⊆ +best_case ⊆ +pipeline). */
  rollup: CategoryRollupRow[];
  /** Open deals the owner explicitly omitted — excluded from the forecast, shown for transparency. */
  omittedCount: number;
  omittedValue: number;
  /** Attainment vs each quota target, newest period first. */
  attainment: AttainmentRow[];
  /** Total quota across the active targets (used for the headline attainment). */
  totalQuota: number;
}

/** Is a row an open, non-omitted deal that counts toward a forecast band? */
function isForecastable(row: OpportunityForecastRow): boolean {
  if (row.stage === "won" || row.stage === "lost") return false;
  return effectiveCategory(row.forecastCategory) !== "omitted";
}

/**
 * Build the full forecast view from the opportunity forecast rows and the quota
 * targets. `summariseForecast` does the band/weighted/closed-won arithmetic; this
 * adds per-band deal counts, the cumulative ladder, the omitted tally, and the
 * per-quota attainment table.
 */
export function buildForecastView(
  rows: readonly OpportunityForecastRow[],
  quotas: readonly QuotaRow[],
): ForecastView {
  const totalQuota = quotas.reduce((sum, q) => sum + q.amount, 0);
  const summary = summariseForecast(rows, totalQuota > 0 ? totalQuota : null);

  // Per-band deal counts (the totals come from the summary so the two never drift).
  const bandCounts: Record<string, number> = { commit: 0, best_case: 0, pipeline: 0 };
  let omittedCount = 0;
  let omittedValue = 0;
  for (const row of rows) {
    if (row.stage === "won" || row.stage === "lost") continue;
    const category = effectiveCategory(row.forecastCategory);
    if (category === "omitted") {
      omittedCount += 1;
      omittedValue += row.dealValue;
      continue;
    }
    bandCounts[category] += 1;
  }

  const bandTotal: Record<string, number> = {
    commit: summary.commitTotal,
    best_case: summary.bestCaseTotal,
    pipeline: summary.pipelineTotal,
  };

  let running = 0;
  const rollup: CategoryRollupRow[] = ROLLUP_BANDS.map((category) => {
    running += bandTotal[category];
    return {
      category,
      label: CATEGORY_LABEL[category],
      dealCount: bandCounts[category],
      total: bandTotal[category],
      cumulative: running,
    };
  });

  const attainment: AttainmentRow[] = quotas.map((q) => ({
    quotaId: q.id,
    target: q.team ?? q.ownerName ?? "Unassigned",
    scope: q.team ? "team" : "owner",
    periodStart: q.periodStart,
    periodEnd: q.periodEnd,
    quota: q.amount,
    closedWon: summary.closedWon,
    attainment: q.amount > 0 ? summary.closedWon / q.amount : null,
  }));

  return {
    summary,
    rollup,
    omittedCount,
    omittedValue,
    attainment,
    totalQuota,
  };
}

/** Convenience: the count of deals that feed any forecast band (open, non-omitted). */
export function forecastableCount(rows: readonly OpportunityForecastRow[]): number {
  return rows.filter(isForecastable).length;
}
