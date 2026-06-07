import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { CampaignsTable } from "@/components/campaigns/campaigns-table";
import { AudiencesTable } from "@/components/campaigns/audiences-table";
import { getRepositories } from "@/lib/data";

export default async function CampaignsPage() {
  const { campaigns } = getRepositories();
  const [list, audiences] = await Promise.all([
    campaigns.listCampaigns(),
    campaigns.listAudiences(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <PageHeader
          title="Campaigns"
          description="Demand-gen across platforms; polled spend/leads attribute back to the pipeline."
        >
          <Link
            href="/campaigns/new"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            + New campaign
          </Link>
        </PageHeader>
        <CampaignsTable campaigns={list} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-base font-semibold tracking-tight">Audiences</h3>
            <p className="mt-0.5 text-sm text-dim">
              Built over aggregated enriched profiles. Ad targeting is gated on
              current ad-targeting consent.
            </p>
          </div>
          <Link
            href="/campaigns/audiences/new"
            className="rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:text-text"
          >
            + New audience
          </Link>
        </div>
        <AudiencesTable audiences={audiences} />
      </section>
    </div>
  );
}
