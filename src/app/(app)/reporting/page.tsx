import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeRevenue, REDACTED_MONEY } from "@/lib/auth/roles";
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
  const [roles, summary, pipeline, proposals, projects, revenue, conversion, sbrAverages] =
    await Promise.all([
      getSessionRoles(),
      reports.getSummary(),
      reports.pipelineByStage(),
      reports.proposalsByStatus(),
      reports.projectsByStatus(),
      reports.revenueSplit(),
      reports.assessmentConversion(),
      reports.sbrDimensionAverages(),
    ]);

  // Support cannot see revenue (ADR-0030): blank money figures and zero the
  // per-stage MRR so the pipeline chart still shows deal counts.
  const showRevenue = canSeeRevenue(roles);
  const money = (v: string) => (showRevenue ? v : REDACTED_MONEY);
  const pipelineData = showRevenue ? pipeline : pipeline.map((s) => ({ ...s, mrr: 0 }));

  const cards = [
    { label: "Active MRR", value: money(summary.activeMrr) },
    { label: "Open Pipeline", value: money(summary.openPipeline) },
    { label: "Win Rate", value: summary.winRate },
    { label: "Avg. Time to Live", value: summary.avgTimeToLive },
  ];

  const revenueCards = [
    { label: "Recurring MRR", value: money(revenue.recurring), hint: "managed services" },
    { label: "One-time Assessment Fees", value: money(revenue.oneTime), hint: "delivered assessments" },
    {
      label: "Assessment → Managed",
      value: conversion.rate,
      hint: `${conversion.converted}/${conversion.delivered} converted`,
    },
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {revenueCards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-panel p-4">
            <div className="text-xs text-dim">{c.label}</div>
            <div className="mt-2 font-display text-2xl font-semibold tracking-tight">
              {c.value}
            </div>
            <div className="mt-1 text-xs text-dim">{c.hint}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartCard title="Open pipeline by stage" subtitle="Deals per sales stage">
          <StagePipelineChart data={pipelineData} />
        </ChartCard>
        <ChartCard title="SBR posture by dimension" subtitle="Avg re-benchmark score (1 At Risk → 4 Strong)">
          <StatusBarChart data={sbrAverages} color="#3FBF8F" />
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
