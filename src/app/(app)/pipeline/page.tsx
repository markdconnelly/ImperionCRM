import { PageHeader } from "@/components/ui/page-header";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeRevenue, REDACTED_MONEY } from "@/lib/auth/roles";
import { moveOpportunityAction } from "./actions";

export default async function PipelinePage() {
  const { crm } = getRepositories();
  const [roles, raw] = await Promise.all([getSessionRoles(), crm.listOpportunities()]);
  // Support cannot see revenue (ADR-0030): blank deal MRR server-side.
  const opportunities = canSeeRevenue(roles)
    ? raw
    : raw.map((o) => ({ ...o, mrr: REDACTED_MONEY }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Pipeline"
        description={`${opportunities.length} opportunities by sales stage · use ◀ ▶ to move a deal`}
      />
      <PipelineBoard opportunities={opportunities} moveAction={moveOpportunityAction} />
    </div>
  );
}
