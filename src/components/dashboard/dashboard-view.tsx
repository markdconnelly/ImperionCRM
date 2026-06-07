import { KpiRow } from "@/components/dashboard/kpi-row";
import { PipelineStrip } from "@/components/dashboard/pipeline-strip";
import { AttentionTable } from "@/components/dashboard/attention-table";
import { getRepositories } from "@/lib/data";

// Server component: loads dashboard data through the repository abstraction
// (§7.4) and passes it to presentational children. Swapping mock → Postgres
// (ADR-0003) happens behind getRepositories(), with no change here.
export async function DashboardView() {
  const { dashboard } = getRepositories();
  const [kpis, pipeline, accounts] = await Promise.all([
    dashboard.getKpis(),
    dashboard.getPipeline(),
    dashboard.getAccountsNeedingAttention(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <KpiRow kpis={kpis} />
      <PipelineStrip pipeline={pipeline} />
      <AttentionTable accounts={accounts} />
    </div>
  );
}
