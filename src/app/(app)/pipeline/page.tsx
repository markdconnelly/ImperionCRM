import { PageHeader } from "@/components/ui/page-header";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { getRepositories } from "@/lib/data";

export default async function PipelinePage() {
  const { crm } = getRepositories();
  const opportunities = await crm.listOpportunities();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Pipeline"
        description={`${opportunities.length} opportunities by sales stage`}
      />
      <PipelineBoard opportunities={opportunities} />
    </div>
  );
}
