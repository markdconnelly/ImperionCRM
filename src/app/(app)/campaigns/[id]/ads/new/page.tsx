import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { AdBuilder } from "@/components/campaigns/ad-builder";
import { getRepositories } from "@/lib/data";
import { createAdAction } from "../../../actions";

/** FB ads builder: typed creative + audience picker (ADR-0053 §3, #111). */
export default async function NewAdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { campaigns } = getRepositories();
  const [campaign, audiences] = await Promise.all([
    campaigns.getCampaign(id),
    campaigns.listAudiences(),
  ]);
  if (!campaign) notFound();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="New ad"
        description={`Structured creative on ${campaign.name} — the typed shape persists; the Meta push is a backend slice.`}
      />
      <AdBuilder action={createAdAction} campaignId={campaign.id} audiences={audiences} />
    </div>
  );
}
