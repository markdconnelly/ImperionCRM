import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { SendComposer } from "@/components/campaigns/send-composer";
import { getRepositories } from "@/lib/data";
import { createSendAction } from "../../../actions";

/** Email/SMS blast composer for one campaign (ADR-0053 §3–§4, #239). */
export default async function NewSendPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ channel?: string }>;
}) {
  const [{ id }, { channel }] = await Promise.all([params, searchParams]);
  const ch = channel === "sms" ? "sms" : "email";
  const { campaigns } = getRepositories();
  const [campaign, audiences] = await Promise.all([
    campaigns.getCampaign(id),
    campaigns.listAudiences(),
  ]);
  if (!campaign) notFound();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={ch === "email" ? "New email send" : "New SMS send"}
        description={`One schedulable blast on ${campaign.name} — saves or schedules; the backend executor fires it.`}
      />
      <SendComposer
        action={createSendAction}
        campaignId={campaign.id}
        channel={ch}
        audiences={audiences}
        eventName={campaign.eventName}
      />
    </div>
  );
}
