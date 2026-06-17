import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeSalesReport, canSeeRevenue, REDACTED_MONEY } from "@/lib/auth/roles";
import { StagePipelineChart, StatusBarChart } from "@/components/reporting/report-charts";

export const metadata = { title: "Sales · Reporting" };
export const dynamic = "force-dynamic"; // role-gated sales surface, never prerendered

const fmtCount = new Intl.NumberFormat("en-US");

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <div className="text-xs text-dim">{label}</div>
      <div className="mt-2 font-display text-2xl font-semibold tracking-tight">{value}</div>
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
 * Sales domain report (#829, replacing the #794 nav placeholder). The Reports
 * group's "Sales" leaf, focused entirely on the sales motion: the headline
 * scorecard, the open pipeline by stage, the proposal lifecycle, and the SBR
 * posture mix. This is the drill-down companion to the BI hub's Sales section
 * (ADR-0062) — same reads (ReportsRepository, ADR-0075), more room per surface.
 *
 * This front end only renders (ADR-0042); every figure is computed in the
 * already-shipped reports repository. No new data layer, no migration.
 *
 * RBAC (ADR-0030): the page is gated by `canSeeSalesReport` (admin | sales) — a
 * role without the sales scope is redirected to the home dashboard, the figures
 * never reach the client. Revenue figures inside are additionally redacted for
 * any role that cannot see revenue (Support), mirroring the hub.
 */
export default async function SalesReportPage() {
  const roles = await getSessionRoles();
  if (!canSeeSalesReport(roles)) redirect("/");

  const { reports } = getRepositories();
  const [summary, pipeline, proposals, sbrAverages] = await Promise.all([
    reports.getSummary(),
    reports.pipelineByStage(),
    reports.proposalsByStatus(),
    reports.sbrDimensionAverages(),
  ]);

  // Support cannot see revenue (ADR-0030): blank money figures and zero the
  // per-stage MRR so the pipeline chart still shows deal counts.
  const showRevenue = canSeeRevenue(roles);
  const money = (v: string) => (showRevenue ? v : REDACTED_MONEY);
  const pipelineData = showRevenue ? pipeline : pipeline.map((s) => ({ ...s, mrr: 0 }));

  // Pipeline-derived tiles. pipelineByStage is open opportunities only, so the
  // deal count is the live, working pipeline — distinct from won/lost history.
  const openDeals = pipeline.reduce((n, s) => n + s.count, 0);
  const proposalsOut = proposals.reduce((n, p) => n + p.count, 0);

  const scorecard = [
    { label: "Active MRR", value: money(summary.activeMrr) },
    { label: "Open pipeline", value: money(summary.openPipeline) },
    { label: "Win rate", value: summary.winRate },
    { label: "Avg. time to live", value: summary.avgTimeToLive },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Sales report"
        description="The sales motion end-to-end: pipeline by stage, proposal lifecycle, and SBR posture."
      >
        <Link
          href="/reporting"
          className="text-sm text-dim transition-colors hover:text-text"
        >
          ← Reporting
        </Link>
        {showRevenue && (
          <Link
            href="/reporting/forecast"
            className="text-sm text-dim transition-colors hover:text-text"
          >
            Forecast →
          </Link>
        )}
        <Link
          href="/pipeline"
          className="text-sm text-dim transition-colors hover:text-text"
        >
          Pipeline →
        </Link>
      </PageHeader>

      {/* Headline scorecard — the same figures the BI-hub Sales section leads with. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {scorecard.map((c) => (
          <StatTile key={c.label} label={c.label} value={c.value} />
        ))}
      </div>

      {/* Working-pipeline counts (revenue-independent — always shown). */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Open deals"
          value={fmtCount.format(openDeals)}
          hint={`across ${pipelineData.length} stage${pipelineData.length === 1 ? "" : "s"}`}
        />
        <StatTile
          label="Proposals out"
          value={fmtCount.format(proposalsOut)}
          hint="all lifecycle states"
        />
        <StatTile
          label="SBR dimensions scored"
          value={fmtCount.format(sbrAverages.length)}
          hint="re-benchmark coverage"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartCard title="Open pipeline by stage" subtitle="Deals per sales stage">
          {pipelineData.length > 0 ? (
            <StagePipelineChart data={pipelineData} />
          ) : (
            <p className="py-10 text-center text-sm text-dim">
              No open opportunities in the pipeline yet.
            </p>
          )}
        </ChartCard>
        <ChartCard title="Proposals by status" subtitle="Proposal lifecycle distribution">
          {proposals.length > 0 ? (
            <StatusBarChart data={proposals} color="#5B8DEF" />
          ) : (
            <p className="py-10 text-center text-sm text-dim">No proposals yet.</p>
          )}
        </ChartCard>
      </div>

      <ChartCard
        title="SBR posture by dimension"
        subtitle="Avg re-benchmark score (1 At Risk → 4 Strong)"
      >
        {sbrAverages.length > 0 ? (
          <StatusBarChart data={sbrAverages} color="#3FBF8F" />
        ) : (
          <p className="py-10 text-center text-sm text-dim">
            No SBR re-benchmark scores yet — posture populates once assessments are scored.
          </p>
        )}
      </ChartCard>
    </div>
  );
}
