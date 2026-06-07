import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { StagePipelineChart, StatusBarChart } from "@/components/reporting/report-charts";

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

export default async function ReportingPage() {
  const { reports } = getRepositories();
  const [summary, pipeline, proposals, projects] = await Promise.all([
    reports.getSummary(),
    reports.pipelineByStage(),
    reports.proposalsByStatus(),
    reports.projectsByStatus(),
  ]);

  const cards = [
    { label: "Active MRR", value: summary.activeMrr },
    { label: "Open Pipeline", value: summary.openPipeline },
    { label: "Win Rate", value: summary.winRate },
    { label: "Avg. Time to Live", value: summary.avgTimeToLive },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Reporting"
        description="Pipeline, conversion, and delivery analytics."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-panel p-4">
            <div className="text-xs text-dim">{c.label}</div>
            <div className="mt-2 font-display text-2xl font-semibold tracking-tight">
              {c.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartCard title="Open pipeline by stage" subtitle="Deals per sales stage">
          <StagePipelineChart data={pipeline} />
        </ChartCard>
        <ChartCard title="Proposals by status" subtitle="Proposal lifecycle distribution">
          <StatusBarChart data={proposals} color="#5B8DEF" />
        </ChartCard>
        <ChartCard title="Delivery projects by status" subtitle="Onboarding & implementation">
          <StatusBarChart data={projects} color="#7C6BF0" />
        </ChartCard>
      </div>
    </div>
  );
}
