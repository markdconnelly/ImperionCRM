import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageCampaigns } from "@/lib/auth/roles";

const KIND_LABEL: Record<string, string> = { webinar: "Webinar", live_event: "Live event" };

/** Events list (ADR-0053 §1) — funnel counts are derived from registrations. */
export default async function EventsPage() {
  const { events } = getRepositories();
  const [roles, list] = await Promise.all([getSessionRoles(), events.listEvents()]);
  const canWrite = canManageCampaigns(roles);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Events"
        description="Webinars and live events — first-class objects your campaigns promote."
      >
        {canWrite ? (
          <div className="flex gap-2">
            <Link
              href="/events/new?kind=webinar"
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
            >
              + New webinar
            </Link>
            <Link
              href="/events/new?kind=live_event"
              className="rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:text-text"
            >
              + New live event
            </Link>
          </div>
        ) : null}
      </PageHeader>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-panel-2 text-left text-xs text-dim">
            <tr>
              <th className="px-3 py-2 font-medium">Event</th>
              <th className="px-3 py-2 font-medium">Kind</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Starts</th>
              <th className="px-3 py-2 text-right font-medium">Registered</th>
              <th className="px-3 py-2 text-right font-medium">Attended</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-panel">
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-dim">
                  No events yet. Create a webinar or live event to promote with a campaign.
                </td>
              </tr>
            ) : (
              list.map((e) => (
                <tr key={e.id} className="hover:bg-panel-2/60">
                  <td className="px-3 py-2">
                    <Link href={`/events/${e.id}`} className="font-medium text-text hover:text-accent">
                      {e.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-dim">{KIND_LABEL[e.kind] ?? e.kind}</td>
                  <td className="px-3 py-2 text-dim">{e.status}</td>
                  <td className="px-3 py-2 text-dim">{e.startsAt ?? "—"}</td>
                  <td className="px-3 py-2 text-right">{e.registered}</td>
                  <td className="px-3 py-2 text-right">{e.attended}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
