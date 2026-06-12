import { PageHeader } from "@/components/ui/page-header";
import { CampaignForm } from "@/components/campaigns/campaign-form";
import { getRepositories } from "@/lib/data";
import { createCampaignAction } from "../actions";

export default async function NewCampaignPage() {
  const { events, workflows } = getRepositories();
  const [eventList, workflowList] = await Promise.all([
    events.listEvents(),
    workflows.listWorkflows(),
  ]);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="New campaign" description="Demand-gen campaign across a platform." />
      <CampaignForm
        action={createCampaignAction}
        events={eventList.filter((e) => e.status !== "completed" && e.status !== "canceled")}
        workflows={workflowList.filter((w) => w.status === "active")}
      />
    </div>
  );
}
