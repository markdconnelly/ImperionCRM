import { PageHeader } from "@/components/ui/page-header";
import { AudienceForm } from "@/components/campaigns/audience-form";
import { createAudienceAction } from "../../actions";

export default function NewAudiencePage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="New audience"
        description="An audience over the aggregated enriched profiles."
      />
      <AudienceForm action={createAudienceAction} />
    </div>
  );
}
