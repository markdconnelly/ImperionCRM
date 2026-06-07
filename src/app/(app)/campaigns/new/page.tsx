import { PageHeader } from "@/components/ui/page-header";
import { CampaignForm } from "@/components/campaigns/campaign-form";
import { createCampaignAction } from "../actions";

export default function NewCampaignPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="New campaign" description="Demand-gen campaign across a platform." />
      <CampaignForm action={createCampaignAction} />
    </div>
  );
}
