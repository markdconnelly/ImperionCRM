import { KpiRow } from "@/components/dashboard/kpi-row";
import { PipelineStrip } from "@/components/dashboard/pipeline-strip";
import { AttentionTable } from "@/components/dashboard/attention-table";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeRevenue, REDACTED_MONEY } from "@/lib/auth/roles";

// Server component: loads dashboard data through the repository abstraction
// (§7.4) and passes it to presentational children. Swapping mock → Postgres
// (ADR-0003) happens behind getRepositories(), with no change here.
export async function DashboardView() {
  const { dashboard } = getRepositories();
  const [roles, kpis, pipeline, accounts] = await Promise.all([
    getSessionRoles(),
    dashboard.getKpis(),
    dashboard.getPipeline(),
    dashboard.getAccountsNeedingAttention(),
  ]);

  // Support cannot see revenue (ADR-0030): blank money before it reaches the
  // client. Money values are formatted with "$"; KPI/pipeline values that carry
  // a currency figure are redacted, and per-account MRR is blanked.
  const showRevenue = canSeeRevenue(roles);
  const visibleKpis = showRevenue
    ? kpis
    : kpis.map((k) => (k.value.includes("$") ? { ...k, value: REDACTED_MONEY } : k));
  const visiblePipeline = showRevenue
    ? pipeline
    : pipeline.map((c) => ({ ...c, value: REDACTED_MONEY }));
  const visibleAccounts = showRevenue
    ? accounts
    : accounts.map((a) => ({ ...a, mrr: REDACTED_MONEY }));

  return (
    <div className="flex flex-col gap-4">
      <KpiRow kpis={visibleKpis} />
      <PipelineStrip pipeline={visiblePipeline} />
      <AttentionTable accounts={visibleAccounts} />
    </div>
  );
}
