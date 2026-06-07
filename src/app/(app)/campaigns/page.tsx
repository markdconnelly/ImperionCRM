import { PageHeader } from "@/components/ui/page-header";
import { ModulePlaceholder } from "@/components/ui/module-placeholder";

export default function CampaignsPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Campaigns"
        description="Facebook ad campaigns that feed the sales pipeline."
      />
      <ModulePlaceholder
        icon="Megaphone"
        title="Demand generation"
        description="Create Facebook campaigns and read their analytics; inbound leads are attributed back to the ad spend."
        points={[
          "Campaign + ad metrics (spend, impressions, leads)",
          "Attribution on every inbound contact and opportunity",
          "Powered by an external campaign service (ADR-0012/0018)",
        ]}
      />
    </div>
  );
}
