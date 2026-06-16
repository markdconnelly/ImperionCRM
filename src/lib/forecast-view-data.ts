/**
 * Read-side for the forecast surface (ADR-0072, #383).
 *
 * Division of labor (ADR-0042): this front end only READS. It consumes the
 * already-shipped forecast read model on the CRM repository —
 * `crm.listOpportunityForecast()` + `crm.listQuotas()` (migration 0114, #381) —
 * which itself degrades DB → mock. Writing forecast fields/quota and the nightly
 * `forecast_snapshot` are PROCESSES owned by the backend/pipeline (#382), never here.
 *
 * Tiers, matching the app-wide pattern (ADR-0007/0042):
 *   1. Repository reads — real forecast rows + quotas when the schema is populated.
 *   2. Illustrative sample — when the repository returns nothing (no DB, or the
 *      0114 columns are empty because no deal has been categorised yet), the page
 *      still renders a representative forecast instead of an empty shell, flagged
 *      `sample` so the surface can label it. Mirrors the board page's mock tier.
 *
 * Money is unredacted here; the page applies `canSeeRevenue` (ADR-0030) before any
 * figure reaches the client. Server-only — never import into a client component.
 */
import "server-only";
import type { OpportunityForecastRow, QuotaRow } from "@/types";
import { getRepositories } from "@/lib/data";
import { buildForecastView, type ForecastView } from "@/lib/forecast-view";

export interface ForecastViewState extends ForecastView {
  /** `live` = real repository rows; `sample` = illustrative fallback. */
  source: "live" | "sample";
}

// ── Illustrative sample (the surface renders DB-less, ADR-0007) ──────────────────
// A representative MSP forecast: a handful of categorised open deals across the
// bands, a couple of closed-won, one omitted, plus an owner and a team quota.

const SAMPLE_ROWS: OpportunityForecastRow[] = [
  {
    id: "sample-1",
    name: "Northwind — Managed SOC uplift",
    account: "Northwind Traders",
    stage: "proposal",
    dealValue: 4200,
    expectedCloseDate: "2026-07-20",
    winProbability: 0.6,
    forecastCategory: "commit",
    weighted: 2520,
  },
  {
    id: "sample-2",
    name: "Contoso — Co-managed IT expansion",
    account: "Contoso Ltd",
    stage: "qualified",
    dealValue: 3100,
    expectedCloseDate: "2026-08-05",
    winProbability: 0.5,
    forecastCategory: "best_case",
    weighted: 1550,
  },
  {
    id: "sample-3",
    name: "Fabrikam — Backup & DR add-on",
    account: "Fabrikam Inc",
    stage: "qualified",
    dealValue: 1800,
    expectedCloseDate: "2026-08-18",
    winProbability: 0.3,
    forecastCategory: "pipeline",
    weighted: 540,
  },
  {
    id: "sample-4",
    name: "Tailspin — Security awareness program",
    account: "Tailspin Toys",
    stage: "lead",
    dealValue: 950,
    expectedCloseDate: "2026-09-10",
    winProbability: 0.1,
    forecastCategory: null, // → pipeline (conservative default)
    weighted: 95,
  },
  {
    id: "sample-5",
    name: "Adventure Works — vCIO retainer",
    account: "Adventure Works",
    stage: "proposal",
    dealValue: 2600,
    expectedCloseDate: "2026-07-31",
    winProbability: 0.85,
    forecastCategory: "commit",
    weighted: 2210,
  },
  {
    id: "sample-6",
    name: "Wide World — one-off migration (parked)",
    account: "Wide World Importers",
    stage: "qualified",
    dealValue: 5000,
    expectedCloseDate: "2026-10-01",
    winProbability: 0.3,
    forecastCategory: "omitted", // excluded from the forecast
    weighted: 1500,
  },
  {
    id: "sample-7",
    name: "Proseware — Managed services (won)",
    account: "Proseware Inc",
    stage: "won",
    dealValue: 3800,
    expectedCloseDate: "2026-06-12",
    winProbability: 1,
    forecastCategory: "commit",
    weighted: 3800,
  },
  {
    id: "sample-8",
    name: "Lucerne — Endpoint management (won)",
    account: "Lucerne Publishing",
    stage: "won",
    dealValue: 2100,
    expectedCloseDate: "2026-06-03",
    winProbability: 1,
    forecastCategory: "commit",
    weighted: 2100,
  },
];

const SAMPLE_QUOTAS: QuotaRow[] = [
  {
    id: "sample-q1",
    ownerUserId: null,
    ownerName: null,
    team: "Sales",
    periodStart: "2026-07-01",
    periodEnd: "2026-09-30",
    amount: 18000,
  },
  {
    id: "sample-q2",
    ownerUserId: "sample-owner",
    ownerName: "Avery Chen",
    team: null,
    periodStart: "2026-07-01",
    periodEnd: "2026-09-30",
    amount: 9000,
  },
];

/**
 * The forecast view through the repository → sample tiers. The repository reads
 * never throw (they degrade to mock internally); a thrown error here still falls
 * back to the sample rather than failing the page.
 */
export async function getForecastView(): Promise<ForecastViewState> {
  try {
    const { crm } = getRepositories();
    const [rows, quotas] = await Promise.all([
      crm.listOpportunityForecast(),
      crm.listQuotas(),
    ]);
    if (rows.length > 0 || quotas.length > 0) {
      return { ...buildForecastView(rows, quotas), source: "live" };
    }
  } catch (err) {
    console.error("forecast view read failed, using sample:", err);
  }
  return { ...buildForecastView(SAMPLE_ROWS, SAMPLE_QUOTAS), source: "sample" };
}
