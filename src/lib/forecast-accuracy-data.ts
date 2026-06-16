/**
 * Read-side for the forecast-accuracy trend (ADR-0072 decision 5, ADR-0062, #384).
 *
 * Division of labor (ADR-0042): this front end only READS. It consumes the
 * already-shipped forecast_snapshot read model on the CRM repository
 * (`crm.listForecastSnapshots()`, migration 0114) — the nightly snapshots WRITTEN
 * by the backend/pipeline snapshot job (#382). The grading math (snapshot call vs
 * realised actual) is pure and lives in `lib/forecast-accuracy.ts`.
 *
 * Tiers, matching the forecast view (`forecast-view-data.ts`) and the app-wide
 * pattern (ADR-0007/0042):
 *   1. Repository reads — real snapshots once the nightly job has populated them.
 *   2. Illustrative sample — when the repository returns nothing (no DB, or no
 *      snapshot captured yet because the job hasn't run), the page still renders a
 *      representative accuracy trend instead of an empty shell, flagged `sample`.
 *
 * Money is unredacted here; the page applies `canSeeRevenue` (ADR-0030) before any
 * figure reaches the client. Server-only — never import into a client component.
 */
import "server-only";
import type { ForecastSnapshotRow } from "@/types";
import { getRepositories } from "@/lib/data";
import {
  buildForecastAccuracyView,
  type AccuracyBasis,
  type ForecastAccuracyView,
} from "@/lib/forecast-accuracy";

export interface ForecastAccuracyState extends ForecastAccuracyView {
  /** `live` = real snapshot rows; `sample` = illustrative fallback. */
  source: "live" | "sample";
}

// ── Illustrative sample (the surface renders DB-less, ADR-0007) ──────────────────
// Two settled quarters, each with a SETTLING snapshot (captured on/after the period
// ends — its closed_won is the realised actual) plus three earlier calls that
// converge toward it. Owner-scoped so the surface demonstrates the owner dimension.
// Q1: realised 12,000; forecasts drifted from over- to on-target.
// Q2: realised 9,500; an early under-forecast that recovered.

function snap(over: Partial<ForecastSnapshotRow>): ForecastSnapshotRow {
  return {
    id: "s",
    capturedOn: "2026-01-01",
    ownerUserId: "sample-owner",
    ownerName: "Avery Chen",
    team: null,
    periodStart: "2026-01-01",
    periodEnd: "2026-03-31",
    weighted: 0,
    commitTotal: 0,
    bestCaseTotal: 0,
    pipelineTotal: 0,
    closedWon: 0,
    quota: 12000,
    ...over,
  };
}

const SAMPLE_SNAPSHOTS: ForecastSnapshotRow[] = [
  // ── Q1 2026 (settled, realised closed-won = 12,000) ──
  snap({ id: "q1-a", capturedOn: "2026-01-31", weighted: 15000, commitTotal: 9000, closedWon: 1000 }),
  snap({ id: "q1-b", capturedOn: "2026-02-28", weighted: 13500, commitTotal: 11000, closedWon: 5000 }),
  snap({ id: "q1-c", capturedOn: "2026-03-15", weighted: 12400, commitTotal: 11800, closedWon: 9000 }),
  snap({ id: "q1-settle", capturedOn: "2026-04-01", weighted: 12000, commitTotal: 12000, closedWon: 12000 }),
  // ── Q2 2026 (settled, realised closed-won = 9,500) ──
  snap({ id: "q2-a", capturedOn: "2026-04-30", periodStart: "2026-04-01", periodEnd: "2026-06-30", quota: 10000, weighted: 7000, commitTotal: 4000, closedWon: 500 }),
  snap({ id: "q2-b", capturedOn: "2026-05-31", periodStart: "2026-04-01", periodEnd: "2026-06-30", quota: 10000, weighted: 8800, commitTotal: 7500, closedWon: 4200 }),
  snap({ id: "q2-c", capturedOn: "2026-06-20", periodStart: "2026-04-01", periodEnd: "2026-06-30", quota: 10000, weighted: 9400, commitTotal: 9000, closedWon: 8000 }),
  snap({ id: "q2-settle", capturedOn: "2026-07-01", periodStart: "2026-04-01", periodEnd: "2026-06-30", quota: 10000, weighted: 9500, commitTotal: 9500, closedWon: 9500 }),
];

/**
 * The accuracy-trend view through the repository → sample tiers. The repository
 * read never throws (it degrades to mock internally); a thrown error here still
 * falls back to the sample rather than failing the page.
 */
export async function getForecastAccuracyView(
  basis: AccuracyBasis = "weighted",
): Promise<ForecastAccuracyState> {
  try {
    const { crm } = getRepositories();
    const snapshots = await crm.listForecastSnapshots();
    if (snapshots.length > 0) {
      return { ...buildForecastAccuracyView(snapshots, basis), source: "live" };
    }
  } catch (err) {
    console.error("forecast accuracy read failed, using sample:", err);
  }
  return { ...buildForecastAccuracyView(SAMPLE_SNAPSHOTS, basis), source: "sample" };
}
