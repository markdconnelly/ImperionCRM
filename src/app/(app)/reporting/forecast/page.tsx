import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeRevenue } from "@/lib/auth/roles";
import { getForecastView } from "@/lib/forecast-view-data";
import {
  AttainmentBar,
  ForecastAccuracyChart,
  ForecastScenarioChart,
  type AccuracyDatum,
  type ScenarioDatum,
} from "@/components/reporting/forecast-charts";
import { getForecastAccuracyView } from "@/lib/forecast-accuracy-data";

export const metadata = { title: "Forecast · Reporting" };
export const dynamic = "force-dynamic"; // role-gated revenue surface, never prerendered

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const pct = (v: number) => `${Math.round(v * 100)}%`;
/** Signed currency for a variance figure: +$1,200 over / −$800 under / $0. */
const signedUsd = (v: number) =>
  `${v > 0 ? "+" : v < 0 ? "−" : ""}${usd.format(Math.abs(v))}`;

function StatTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <div className="text-xs text-dim">{label}</div>
      <div
        className={`mt-2 font-display text-2xl font-semibold tracking-tight ${tone ?? ""}`}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-dim">{hint}</div>}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <div className="mb-3">
        <h3 className="font-display text-sm font-semibold tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-dim">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/**
 * Forecast view (ADR-0072, #383) — the revenue-forecasting surface on the BI hub
 * (ADR-0062). Three reads, all over the already-shipped forecast read model
 * (migration 0114, #381): the **category rollup** (commit ⊆ +best_case ⊆ +pipeline),
 * the **weighted** pipeline-health number (Σ value×probability), and **attainment
 * vs quota** (closed-won ÷ quota). This front end only renders (ADR-0042); the
 * snapshot trend (#384) and the set-controls that write forecast fields are
 * separate, backend-owned work.
 *
 * RBAC (ADR-0030/0016): the entire surface is revenue + quota data, so a role that
 * cannot see revenue (Support-only) is redirected back to the hub — the figures
 * never reach the client. This is a stronger gate than the hub's per-figure
 * redaction because there is nothing non-revenue left to show.
 */
export default async function ForecastPage() {
  const roles = await getSessionRoles();
  if (!canSeeRevenue(roles)) redirect("/reporting");

  const [view, accuracy] = await Promise.all([
    getForecastView(),
    getForecastAccuracyView("weighted"),
  ]);
  const { summary, rollup, attainment } = view;
  const isSample = view.source === "sample";

  // Accuracy trend (ADR-0072 decision 5, #384): each prior snapshot call vs its
  // period's eventual realised closed-won. accuracyTrend feeds the line chart;
  // accuracyRows the table (newest call first).
  const accuracyTrend: AccuracyDatum[] = accuracy.points.map((p) => ({
    capturedOn: p.capturedOn,
    accuracyPct: p.accuracyPct,
  }));
  const accuracyRows = [...accuracy.points].reverse();
  const accSummary = accuracy.summary;

  // Scenario ladder (ADR-0072 decision 3): realised floor, weighted, then the
  // cumulative category bands. Best/Pipeline shown as the running cumulative total.
  const scenarios: ScenarioDatum[] = [
    { label: "Closed-won", value: summary.closedWon },
    { label: "Weighted", value: summary.weighted },
    { label: "Commit", value: rollup[0]?.cumulative ?? 0 },
    { label: "+ Best case", value: rollup[1]?.cumulative ?? 0 },
    { label: "+ Pipeline", value: rollup[2]?.cumulative ?? 0 },
  ];

  const attainmentTone =
    summary.attainment == null
      ? undefined
      : summary.attainment >= 1
        ? "text-green"
        : summary.attainment >= 0.6
          ? "text-amber"
          : "text-red";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Forecast"
        description="Weighted pipeline, category rollup, and attainment vs quota (ADR-0072)."
      >
        <Link
          href="/reporting"
          className="text-sm text-dim transition-colors hover:text-text"
        >
          ← Reporting
        </Link>
        <Link
          href="/pipeline"
          className="text-sm text-dim transition-colors hover:text-text"
        >
          Pipeline →
        </Link>
      </PageHeader>

      {isSample && (
        <div className="rounded-lg border border-amber/40 bg-amber/5 px-4 py-2 text-xs text-amber">
          Showing an illustrative sample forecast — no categorised deals or quotas
          are in the database yet. Figures populate once owners set forecast
          categories and quotas land (the snapshot trend follows in #384).
        </div>
      )}

      {/* Headline roll-up (ADR-0072 decisions 3 + 4). */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Weighted pipeline"
          value={usd.format(summary.weighted)}
          hint={`${summary.openCount} open deal${summary.openCount === 1 ? "" : "s"} × win probability`}
        />
        <StatTile
          label="Commit"
          value={usd.format(summary.commitTotal)}
          hint="owner-committed deals"
          tone="text-green"
        />
        <StatTile
          label="Closed-won"
          value={usd.format(summary.closedWon)}
          hint="realised floor in period"
        />
        <StatTile
          label="Attainment"
          value={summary.attainment == null ? "—" : pct(summary.attainment)}
          hint={
            summary.quota
              ? `${usd.format(summary.closedWon)} of ${usd.format(summary.quota)} quota`
              : "no quota set"
          }
          tone={attainmentTone}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartCard
          title="Forecast scenarios"
          subtitle="Realised floor → weighted → cumulative category ladder"
        >
          <ForecastScenarioChart data={scenarios} />
        </ChartCard>

        <ChartCard
          title="Category rollup"
          subtitle="Owner's call per band — independent of stage (ADR-0072 decision 2)"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-dim">
                <tr>
                  <th className="px-3 py-2 font-medium">Band</th>
                  <th className="px-3 py-2 font-medium">Deals</th>
                  <th className="px-3 py-2 font-medium">Band total</th>
                  <th className="px-3 py-2 font-medium">Cumulative</th>
                </tr>
              </thead>
              <tbody>
                {rollup.map((b) => (
                  <tr key={b.category} className="border-t border-border/60">
                    <td className="px-3 py-2 font-medium">{b.label}</td>
                    <td className="px-3 py-2 text-dim">{b.dealCount}</td>
                    <td className="px-3 py-2">{usd.format(b.total)}</td>
                    <td className="px-3 py-2 text-text">{usd.format(b.cumulative)}</td>
                  </tr>
                ))}
                <tr className="border-t border-border">
                  <td className="px-3 py-2 text-xs text-dim" colSpan={2}>
                    Omitted (excluded from forecast)
                  </td>
                  <td className="px-3 py-2 text-xs text-dim" colSpan={2}>
                    {view.omittedCount} deal{view.omittedCount === 1 ? "" : "s"} ·{" "}
                    {usd.format(view.omittedValue)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      {/* Attainment vs quota (ADR-0072 decision 4). */}
      <div className="rounded-lg border border-border bg-panel p-4">
        <div className="mb-3">
          <h3 className="font-display text-sm font-semibold tracking-tight">
            Attainment vs quota
          </h3>
          <p className="text-xs text-dim">
            Closed-won against each owner/team target for the period
          </p>
        </div>
        {attainment.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-dim">
                <tr>
                  <th className="px-3 py-2 font-medium">Target</th>
                  <th className="px-3 py-2 font-medium">Period</th>
                  <th className="px-3 py-2 font-medium">Closed-won</th>
                  <th className="px-3 py-2 font-medium">Quota</th>
                  <th className="px-3 py-2 font-medium">Attainment</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {attainment.map((a) => (
                  <tr key={a.quotaId} className="border-t border-border/60">
                    <td className="px-3 py-2">
                      {a.target}
                      <span className="ml-2 text-xs text-dim">{a.scope}</span>
                    </td>
                    <td className="px-3 py-2 text-dim">
                      {a.periodStart} → {a.periodEnd}
                    </td>
                    <td className="px-3 py-2">{usd.format(a.closedWon)}</td>
                    <td className="px-3 py-2">{usd.format(a.quota)}</td>
                    <td className="px-3 py-2 font-medium">
                      {a.attainment == null ? "—" : pct(a.attainment)}
                    </td>
                    <td className="px-3 py-2" style={{ minWidth: 120 }}>
                      {a.attainment != null && <AttainmentBar pct={a.attainment} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-dim">
            No quotas set yet — attainment populates once a quota lands for an owner
            or team.
          </p>
        )}
      </div>

      {/* Forecast-accuracy trend (ADR-0072 decision 5, #384). How prior snapshot
          calls compared to the eventual realised closed-won — the point of the
          nightly forecast_snapshot. Revenue-gated like the rest of this surface. */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-base font-semibold tracking-tight">
            Forecast accuracy
          </h2>
          <p className="text-xs text-dim">
            How our weighted forecast calls compared to the eventual closed-won, as
            each call converged toward the period close (ADR-0072 decision 5).
            {accuracy.hasOwnerDimension
              ? " Snapshots carry an owner/team dimension — accuracy is per target."
              : " Snapshots are account/category-scoped — no owner split available yet."}
          </p>
        </div>

        {accSummary.gradedCalls === 0 ? (
          <div className="rounded-lg border border-border bg-panel px-4 py-6 text-center text-sm text-dim">
            No settled forecast periods yet — accuracy populates once the nightly
            snapshot job has captured calls and at least one period has closed.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile
                label="Mean accuracy"
                value={accSummary.meanAccuracyPct == null ? "—" : pct(accSummary.meanAccuracyPct)}
                hint={`${accSummary.gradedCalls} graded call${accSummary.gradedCalls === 1 ? "" : "s"}`}
                tone={
                  accSummary.meanAccuracyPct == null
                    ? undefined
                    : accSummary.meanAccuracyPct >= 0.9
                      ? "text-green"
                      : accSummary.meanAccuracyPct >= 0.7
                        ? "text-amber"
                        : "text-red"
                }
              />
              <StatTile
                label="Settled periods"
                value={String(accSummary.settledPeriods)}
                hint="periods with a realised actual"
              />
              <StatTile
                label="Forecast bias"
                value={signedUsd(accSummary.meanVariance)}
                hint={
                  accSummary.meanVariance > 0
                    ? "tends to over-forecast"
                    : accSummary.meanVariance < 0
                      ? "tends to under-forecast"
                      : "balanced"
                }
                tone={Math.abs(accSummary.meanVariance) < 1 ? "text-dim" : undefined}
              />
              <StatTile
                label="Typical miss"
                value={usd.format(accSummary.meanAbsVariance)}
                hint="mean absolute variance"
              />
            </div>

            <ChartCard
              title="Accuracy over time"
              subtitle="Each snapshot call vs its period's realised closed-won (100% = perfect call)"
            >
              <ForecastAccuracyChart data={accuracyTrend} />
            </ChartCard>

            <div className="rounded-lg border border-border bg-panel p-4">
              <div className="mb-3">
                <h3 className="font-display text-sm font-semibold tracking-tight">
                  Graded calls
                </h3>
                <p className="text-xs text-dim">
                  Newest call first — forecast vs realised, with the variance and how
                  far ahead the call was made
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-dim">
                    <tr>
                      <th className="px-3 py-2 font-medium">Called on</th>
                      <th className="px-3 py-2 font-medium">Target</th>
                      <th className="px-3 py-2 font-medium">Period end</th>
                      <th className="px-3 py-2 font-medium">Lead</th>
                      <th className="px-3 py-2 font-medium">Forecast</th>
                      <th className="px-3 py-2 font-medium">Realised</th>
                      <th className="px-3 py-2 font-medium">Variance</th>
                      <th className="px-3 py-2 font-medium">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accuracyRows.map((p, i) => (
                      <tr
                        key={`${p.target}-${p.periodEnd}-${p.capturedOn}-${i}`}
                        className="border-t border-border/60"
                      >
                        <td className="px-3 py-2">{p.capturedOn}</td>
                        <td className="px-3 py-2">
                          {p.target}
                          <span className="ml-2 text-xs text-dim">{p.scope}</span>
                        </td>
                        <td className="px-3 py-2 text-dim">{p.periodEnd}</td>
                        <td className="px-3 py-2 text-dim">{p.leadDays}d</td>
                        <td className="px-3 py-2">{usd.format(p.forecast)}</td>
                        <td className="px-3 py-2">{usd.format(p.realised)}</td>
                        <td
                          className={`px-3 py-2 ${
                            p.variance > 0
                              ? "text-amber"
                              : p.variance < 0
                                ? "text-accent"
                                : "text-dim"
                          }`}
                        >
                          {signedUsd(p.variance)}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          {p.accuracyPct == null ? "—" : pct(p.accuracyPct)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
