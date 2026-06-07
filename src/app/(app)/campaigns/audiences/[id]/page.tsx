import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { launchAudienceAction } from "../../actions";

export default async function AudienceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ launched?: string }>;
}) {
  const { id } = await params;
  const { launched } = await searchParams;
  const { campaigns } = getRepositories();
  const [audiences, members] = await Promise.all([
    campaigns.listAudiences(),
    campaigns.getAudienceMembers(id),
  ]);
  const audience = audiences.find((a) => a.id === id) ?? null;
  const eligible = members.filter((m) => m.adConsent).length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={audience?.name ?? "Audience"}
        description={audience?.description ?? "Members and ad-targeting eligibility."}
      >
        <Link href="/campaigns" className="text-sm text-dim hover:text-text">
          ← Campaigns
        </Link>
      </PageHeader>

      {launched != null && (
        <div className="rounded-md border border-green/40 bg-green/10 px-4 py-2 text-sm text-green">
          Launched (stub): {launched} of {members.length} members were ad-eligible and would be
          pushed. Members without current ad-targeting consent were excluded.
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-dim">
          <span className="text-green">{eligible}</span> of {members.length} members are
          ad-eligible (current ad-targeting consent).
        </p>
        <form action={launchAudienceAction}>
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            disabled={eligible === 0}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Launch ad against audience
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-border bg-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-dim">
                <th className="px-4 py-2 font-medium">Contact</th>
                <th className="px-4 py-2 font-medium">Account</th>
                <th className="px-4 py-2 font-medium">Ad eligibility</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.contactId} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/contacts/${m.contactId}`} className="hover:text-accent">
                      {m.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-dim">{m.account ?? "—"}</td>
                  <td className={`px-4 py-3 ${m.adConsent ? "text-green" : "text-red"}`}>
                    {m.adConsent ? "Eligible" : "Blocked — no ad consent"}
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-dim">
                    No members yet.
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
