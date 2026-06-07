import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { campaigns } = getRepositories();
  const campaign = await campaigns.getCampaign(id);
  if (!campaign) notFound();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={campaign.name}
        description={`${campaign.platform} · ${campaign.status}${
          campaign.objective ? ` · ${campaign.objective}` : ""
        }`}
      >
        <Link href="/campaigns" className="text-sm text-dim hover:text-text">
          ← Campaigns
        </Link>
      </PageHeader>

      <div className="flex flex-wrap gap-4 text-sm">
        <Stat label="Budget" value={campaign.budget} />
        <Stat label="Start" value={campaign.startAt ?? "—"} />
        <Stat label="End" value={campaign.endAt ?? "—"} />
      </div>

      <div className="rounded-lg border border-border bg-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-dim">
                <th className="px-4 py-2 font-medium">Ad</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Spend</th>
                <th className="px-4 py-2 font-medium">Impressions</th>
                <th className="px-4 py-2 font-medium">Clicks</th>
                <th className="px-4 py-2 font-medium">Leads</th>
              </tr>
            </thead>
            <tbody>
              {campaign.ads.map((ad) => (
                <tr key={ad.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{ad.name}</td>
                  <td className="px-4 py-3 text-dim">{ad.status}</td>
                  <td className="px-4 py-3 text-dim">{ad.spend}</td>
                  <td className="px-4 py-3 text-dim">{ad.impressions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-dim">{ad.clicks.toLocaleString()}</td>
                  <td className="px-4 py-3 text-dim">{ad.leads}</td>
                </tr>
              ))}
              {campaign.ads.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-dim">
                    No ads yet. Ads and their polled metrics arrive from the platform.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-panel px-4 py-3">
      <div className="text-xs text-dim">{label}</div>
      <div className="mt-0.5 font-display text-lg">{value}</div>
    </div>
  );
}
