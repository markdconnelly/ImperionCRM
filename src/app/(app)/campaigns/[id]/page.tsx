import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageCampaigns } from "@/lib/auth/roles";
import { cancelSendAction } from "../actions";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { campaigns } = getRepositories();
  const [roles, campaign, sends] = await Promise.all([
    getSessionRoles(),
    campaigns.getCampaign(id),
    campaigns.listSends(id),
  ]);
  if (!campaign) notFound();
  const canWrite = canManageCampaigns(roles);

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
        {campaign.eventName ? <Stat label="Promotes" value={campaign.eventName} /> : null}
      </div>

      {/* Campaign Sends (ADR-0053 §4) — schedule only; the backend executor fires. */}
      <section className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-base font-semibold tracking-tight">Sends</h3>
            <p className="mt-0.5 text-sm text-dim">
              Scheduled email/SMS blasts. Consent is gated at fire time, per recipient.
            </p>
          </div>
          {canWrite ? (
            <div className="flex gap-2">
              <Link
                href={`/campaigns/${campaign.id}/sends/new?channel=email`}
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
              >
                + Email send
              </Link>
              <Link
                href={`/campaigns/${campaign.id}/sends/new?channel=sms`}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:text-text"
              >
                + SMS send
              </Link>
            </div>
          ) : null}
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-panel">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-dim">
                <th className="px-4 py-2 font-medium">Channel</th>
                <th className="px-4 py-2 font-medium">Template</th>
                <th className="px-4 py-2 font-medium">Recipients</th>
                <th className="px-4 py-2 font-medium">Schedule</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Sent / Delivered / Failed</th>
                {canWrite ? <th className="px-4 py-2" /> : null}
              </tr>
            </thead>
            <tbody>
              {sends.length === 0 ? (
                <tr>
                  <td colSpan={canWrite ? 7 : 6} className="px-4 py-6 text-center text-dim">
                    No sends yet. Compose an email or SMS blast and schedule it.
                  </td>
                </tr>
              ) : (
                sends.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium uppercase">{s.channel}</td>
                    <td className="px-4 py-3 text-dim">{s.summary ?? "—"}</td>
                    <td className="px-4 py-3 text-dim">
                      {s.recipientScope === "audience"
                        ? (s.audienceName ?? "Audience")
                        : "Event registrants"}
                    </td>
                    <td className="px-4 py-3 text-dim">{s.schedule}</td>
                    <td className="px-4 py-3 text-dim">{s.status}</td>
                    <td className="px-4 py-3 text-dim">
                      {s.sent} / {s.delivered} / {s.failed}
                    </td>
                    {canWrite ? (
                      <td className="px-4 py-3 text-right">
                        {s.status === "draft" || s.status === "scheduled" ? (
                          <form action={cancelSendAction}>
                            <input type="hidden" name="campaignId" value={campaign.id} />
                            <input type="hidden" name="sendId" value={s.id} />
                            <button
                              type="submit"
                              className="rounded border border-border px-2 py-0.5 text-xs text-dim hover:text-text"
                            >
                              Cancel
                            </button>
                          </form>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Ads (ADR-0053 §3, #111) — typed creative via the builder; metrics are polled. */}
      <section className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-base font-semibold tracking-tight">Ads</h3>
            <p className="mt-0.5 text-sm text-dim">
              Structured creatives. Metrics arrive from the platform poll; the Meta push is a
              backend slice.
            </p>
          </div>
          {canWrite ? (
            <Link
              href={`/campaigns/${campaign.id}/ads/new`}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
            >
              + Ad
            </Link>
          ) : null}
        </div>
        <div className="rounded-lg border border-border bg-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-dim">
                  <th className="px-4 py-2 font-medium">Ad</th>
                  <th className="px-4 py-2 font-medium">Creative</th>
                  <th className="px-4 py-2 font-medium">Audience</th>
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
                    <td className="max-w-56 truncate px-4 py-3 text-dim">{ad.creative ?? "—"}</td>
                    <td className="px-4 py-3 text-dim">{ad.audienceName ?? "—"}</td>
                    <td className="px-4 py-3 text-dim">{ad.status}</td>
                    <td className="px-4 py-3 text-dim">{ad.spend}</td>
                    <td className="px-4 py-3 text-dim">{ad.impressions.toLocaleString()}</td>
                    <td className="px-4 py-3 text-dim">{ad.clicks.toLocaleString()}</td>
                    <td className="px-4 py-3 text-dim">{ad.leads}</td>
                  </tr>
                ))}
                {campaign.ads.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-dim">
                      No ads yet. Build one with the structured creative form.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
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
