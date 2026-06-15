/**
 * Revenue-forecasting helpers (ADR-0072, #381).
 *
 * Pure, dependency-free, NOT server-only — safe to import from server reads, the
 * forecast surface (#383), and the vitest suite alike. The schema (migration 0114)
 * stores the raw forecast fields on `opportunity` (expected_close_date,
 * win_probability, forecast_category) plus `quota` / `forecast_snapshot`; this module
 * holds the two computations ADR-0072 keeps OUT of the schema:
 *
 *   1. the per-sales_stage DEFAULT win probability (decision 1 — the column is
 *      nullable; a NULL means "use the stage default", applied here not in the DB
 *      because it depends on the row's stage), and
 *   2. the period roll-up — weighted (Σ deal_value × win_probability) and the
 *      categorised bands (commit / best_case / pipeline) plus closed-won and
 *      attainment (decisions 3 + 4).
 *
 * Money redaction (canSeeRevenue, ADR-0030) is the caller's job — these functions
 * are pure arithmetic over numbers already read server-side.
 */

import type { ForecastCategory, OpportunityForecastRow, ForecastSummary } from "@/types";

/** The four forecast categories (ADR-0072 decision 2) — the owner's explicit call. */
export const FORECAST_CATEGORIES: readonly ForecastCategory[] = [
  "commit",
  "best_case",
  "pipeline",
  "omitted",
] as const;

/**
 * Default win probability per sales_stage (ADR-0072 decision 1 — a starting
 * heuristic; a learned/predicted probability is a future enhancement, #315). Used
 * when `opportunity.win_probability` is NULL. `won`/`lost` are terminal (1 / 0) but
 * the forecast weights OPEN deals only, so those defaults are for display.
 */
export const DEFAULT_WIN_PROBABILITY: Record<string, number> = {
  lead: 0.1,
  qualified: 0.3,
  proposal: 0.6,
  won: 1,
  lost: 0,
};

/** Fallback for an unrecognised stage (a user-defined stage label). */
const FALLBACK_PROBABILITY = 0.1;

/**
 * The effective win probability for a deal: the owner's override if set (0..1),
 * else the per-stage default (ADR-0072 decision 1). Out-of-range overrides are
 * clamped to [0, 1].
 */
export function effectiveWinProbability(
  stage: string,
  override: number | null | undefined,
): number {
  if (override != null && Number.isFinite(override)) {
    return Math.min(1, Math.max(0, override));
  }
  return DEFAULT_WIN_PROBABILITY[stage] ?? FALLBACK_PROBABILITY;
}

/** Weighted value of a single deal = deal_value × effective win probability. */
export function weightedValue(dealValue: number, probability: number): number {
  return dealValue * probability;
}

/**
 * The effective forecast category for roll-up: the owner's explicit call, or
 * `pipeline` when not yet categorised (NULL). `pipeline` is the conservative
 * default — in the pipeline band but neither commit nor best-case.
 */
export function effectiveCategory(category: ForecastCategory | null | undefined): ForecastCategory {
  return category ?? "pipeline";
}

/** Is this stage a realised close-won (the forecast's floor)? */
function isWon(stage: string): boolean {
  return stage === "won";
}

/** Is this deal still open (counts toward weighted / categorised pipeline)? */
function isOpen(stage: string): boolean {
  return stage !== "won" && stage !== "lost";
}

/**
 * Roll a set of (already period-filtered) opportunity forecast rows into the two
 * forecast numbers ADR-0072 decision 3 shows side by side — **weighted** (open deals
 * × probability, the pipeline-health number) and **categorised** (commit / best_case
 * / pipeline bands) — plus the realised **closed-won** floor and quota **attainment**
 * (decision 4). `omitted` deals are excluded from every band and the weighted total;
 * `lost` deals are excluded entirely; `won` deals are the closed-won floor.
 *
 * Bands are RAW per-category sums (commit alone, best_case alone, pipeline alone);
 * the UI bands them cumulatively (commit ⊆ +best_case ⊆ +pipeline) as it sees fit.
 */
export function summariseForecast(
  rows: readonly OpportunityForecastRow[],
  quotaAmount: number | null = null,
): ForecastSummary {
  let weighted = 0;
  let commitTotal = 0;
  let bestCaseTotal = 0;
  let pipelineTotal = 0;
  let closedWon = 0;
  let openCount = 0;

  for (const row of rows) {
    if (isWon(row.stage)) {
      closedWon += row.dealValue;
      continue;
    }
    if (!isOpen(row.stage)) continue; // lost — excluded
    const category = effectiveCategory(row.forecastCategory);
    if (category === "omitted") continue; // omitted — excluded from the forecast
    openCount += 1;
    weighted += weightedValue(row.dealValue, row.winProbability);
    if (category === "commit") commitTotal += row.dealValue;
    else if (category === "best_case") bestCaseTotal += row.dealValue;
    else pipelineTotal += row.dealValue;
  }

  const attainment =
    quotaAmount != null && quotaAmount > 0 ? closedWon / quotaAmount : null;

  return {
    weighted,
    commitTotal,
    bestCaseTotal,
    pipelineTotal,
    closedWon,
    quota: quotaAmount,
    attainment,
    openCount,
  };
}
